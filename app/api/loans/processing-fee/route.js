// app/api/loans/processing-fee/route.js
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
			userId: new ObjectId(authResult.userId), // Ensure user owns the loan
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

		// Calculate processing fee amount
		const processingFeeAmount =
			loan.loanDetails?.processingFee || loan.loanAmount * 0.01;

		// Update loan to mark processing fee as paid and activate the loan
		const updateResult = await db.collection("loans").updateOne(
			{ _id: loan._id },
			{
				$set: {
					"loanDetails.processingFeePaid": true,
					status: "active",
					updatedAt: new Date(),
				},
			}
		);

		console.log("Update Result:", updateResult);

		if (updateResult.modifiedCount === 0) {
			return NextResponse.json(
				{ error: "Loan was found but not updated." },
				{ status: 400 }
			);
		}

		// Create a transaction record for the processing fee payment
		await db.collection("transactions").insertOne({
			userId: new ObjectId(authResult.userId),
			loanId: loan._id,
			type: "processing_fee",
			amount: processingFeeAmount,
			description: "Loan processing fee payment",
			status: "completed",
			createdAt: new Date(),
		});

		console.log(
			`Processing fee paid for loan ${loanId} by user ${authResult.userId}`
		);

		return NextResponse.json({
			status: "success",
			message: "Processing fee payment recorded successfully",
			processingFeePaid: true,
			loanStatus: "active",
		});
	} catch (error) {
		console.error("POST /api/loans/processing-fee error:", error);
		return NextResponse.json(
			{ error: "Internal server error: " + error.message },
			{ status: 500 }
		);
	}
}
