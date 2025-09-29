// app/api/loans/repayment/route.js
export const dynamic = "force-dynamic";

import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

export async function POST(request) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}

		const { db } = await connectToDatabase();

		// Parse JSON body instead of FormData
		const { loanId, amount, proofImage, fileName } = await request.json();

		console.log("Received repayment data:", {
			loanId,
			amount,
			hasProof: !!proofImage,
			proofLength: proofImage ? proofImage.length : 0,
			authUserId: authResult.userId,
			authUserIdString: authResult.userIdString,
			authUserIdType: typeof authResult.userId,
		});

		if (!loanId || !amount) {
			return NextResponse.json(
				{ error: "Loan ID and amount are required" },
				{ status: 400 }
			);
		}

		// Debug: Check the loan without user filter first
		console.log("Searching for loan with ID:", loanId);
		const loan = await db.collection("loans").findOne({
			_id: new ObjectId(loanId),
		});

		console.log("Loan found:", loan ? "YES" : "NO");

		if (!loan) {
			return NextResponse.json({ error: "Loan not found" }, { status: 404 });
		}

		// Debug: Check user ID matching
		console.log("Loan userId:", loan.userId);
		console.log("Loan userId type:", typeof loan.userId);
		console.log("Loan userId string:", loan.userId?.toString());
		console.log("Auth userId:", authResult.userId);
		console.log("Auth userId string:", authResult.userIdString);

		// Compare user IDs properly
		const loanUserIdString = loan.userId?.toString();
		const authUserIdString =
			authResult.userIdString || authResult.userId?.toString();

		console.log("User ID match check:", {
			loanUserId: loanUserIdString,
			authUserId: authUserIdString,
			match: loanUserIdString === authUserIdString,
		});

		if (loanUserIdString !== authUserIdString) {
			console.log("User ID mismatch - user doesn't own this loan");
			return NextResponse.json({ error: "Loan not found" }, { status: 404 });
		}

		if (loan.status !== "active" && loan.status !== "approved") {
			return NextResponse.json(
				{ error: "Only active or approved loans can receive payments" },
				{ status: 400 }
			);
		}

		// Handle base64 image - store it directly or upload to cloud storage
		let proofUrl = null;
		if (proofImage) {
			// For now, we'll store the base64 string directly
			// In production, you might want to upload to cloud storage
			proofUrl = `data:image/jpeg;base64,${proofImage}`;
			console.log("Proof image received, length:", proofImage.length);
		}

		// Create repayment record
		const repaymentData = {
			loanId: new ObjectId(loanId),
			userId: new ObjectId(authResult.userId),
			amount: parseFloat(amount),
			proofImage: proofUrl,
			fileName: fileName || "payment-proof.jpg",
			status: "pending_review",
			submittedAt: new Date(),
			createdAt: new Date(),
		};

		const repaymentResult = await db
			.collection("loan_repayments")
			.insertOne(repaymentData);

		// Update loan status to indicate payment is pending review
		await db.collection("loans").updateOne(
			{ _id: new ObjectId(loanId) },
			{
				$set: {
					status: "payment_pending",
					updatedAt: new Date(),
				},
			}
		);

		console.log("Repayment record created:", repaymentResult.insertedId);

		return NextResponse.json({
			status: "success",
			message: "Payment proof submitted successfully. Awaiting admin approval.",
			repaymentId: repaymentResult.insertedId,
		});
	} catch (error) {
		console.error("POST /api/loans/repayment error:", error);
		console.error("Error stack:", error.stack);
		return NextResponse.json(
			{ error: "Internal server error: " + error.message },
			{ status: 500 }
		);
	}
}

// GET - Get user's loan repayments
export async function GET(request) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}

		const { searchParams } = new URL(request.url);
		const loanId = searchParams.get("loanId");
		const status = searchParams.get("status");

		const { db } = await connectToDatabase();

		// Build query
		const query = { userId: authResult.userId };
		if (loanId) query.loanId = new ObjectId(loanId);
		if (status) query.status = status;

		const repayments = await db
			.collection("loan_repayments")
			.find(query)
			.sort({ submittedAt: -1 })
			.toArray();

		return NextResponse.json({ repayments });
	} catch (error) {
		console.error("GET repayments error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
