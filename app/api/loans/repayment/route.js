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

		// Get FormData from request
		const formData = await request.formData();

		const loanId = formData.get("loanId");
		const amount = formData.get("amount");
		const proofFile = formData.get("proof");

		console.log("Received repayment data:", {
			loanId,
			amount,
			hasProof: !!proofFile,
		});

		if (!loanId || !amount) {
			return NextResponse.json(
				{ error: "Loan ID and amount are required" },
				{ status: 400 }
			);
		}

		// Find the loan
		const loan = await db.collection("loans").findOne({
			_id: new ObjectId(loanId),
			userId: new ObjectId(authResult.userId),
		});

		if (!loan) {
			return NextResponse.json({ error: "Loan not found" }, { status: 404 });
		}

		if (loan.status !== "active" && loan.status !== "approved") {
			return NextResponse.json(
				{ error: "Only active or approved loans can receive payments" },
				{ status: 400 }
			);
		}

		// Handle file upload - in a real app, you'd upload to cloud storage
		// For now, we'll just store the fact that a proof was uploaded
		let proofUrl = null;
		if (proofFile) {
			// In a real implementation, you'd upload to S3, Cloudinary, etc.
			// For demo purposes, we'll just store a placeholder
			proofUrl = `uploaded/proof-${Date.now()}.jpg`;
			console.log("Proof file received:", proofFile.name, proofFile.type);
		}

		// Create repayment record
		const repaymentData = {
			loanId: new ObjectId(loanId),
			userId: new ObjectId(authResult.userId),
			amount: parseFloat(amount),
			proofImage: proofUrl,
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
