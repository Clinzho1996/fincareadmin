// app/api/loans/processing-fee/route.js
export const dynamic = "force-dynamic";

import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

export async function POST(request) {
	try {
		// Authenticate the request
		const token = await getToken({ req: request });

		if (!token) {
			return NextResponse.json(
				{ error: "Unauthorized. Authentication required." },
				{ status: 401 }
			);
		}

		const { db } = await connectToDatabase();
		const { loanId } = await request.json();

		if (!loanId) {
			return NextResponse.json(
				{ error: "Loan ID is required" },
				{ status: 400 }
			);
		}

		// Find the loan
		const loan = await db.collection("loans").findOne({
			_id: new ObjectId(loanId),
			userId: new ObjectId(token.sub), // Ensure user owns the loan
		});

		if (!loan) {
			return NextResponse.json({ error: "Loan not found" }, { status: 404 });
		}

		// Check if loan is approved
		if (loan.status !== "approved") {
			return NextResponse.json(
				{ error: "Only approved loans can pay processing fee" },
				{ status: 400 }
			);
		}

		// Check if processing fee is already paid
		if (loan.loanDetails?.processingFeePaid) {
			return NextResponse.json(
				{ error: "Processing fee has already been paid" },
				{ status: 400 }
			);
		}

		// Update loan to mark processing fee as paid and activate the loan
		await db.collection("loans").updateOne(
			{ _id: loan._id },
			{
				$set: {
					"loanDetails.processingFeePaid": true,
					status: "active", // Change status from "approved" to "active"
					updatedAt: new Date(),
				},
			}
		);

		// Create a transaction record for the processing fee payment
		await db.collection("transactions").insertOne({
			userId: new ObjectId(token.sub),
			loanId: loan._id,
			type: "processing_fee",
			amount: loan.loanDetails?.processingFee || loan.loanAmount * 0.01, // 1% processing fee
			description: "Loan processing fee payment",
			status: "completed",
			createdAt: new Date(),
		});

		return NextResponse.json({
			message: "Processing fee payment recorded successfully",
			processingFeePaid: true,
		});
	} catch (error) {
		console.error("POST /api/loans/processing-fee error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
