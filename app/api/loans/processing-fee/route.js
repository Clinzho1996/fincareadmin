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
				{ status: authResult.status },
			);
		}

		const { db } = await connectToDatabase();
		const { loanId, amount, proofImage, fileName } = await request.json();

		if (!loanId) {
			return NextResponse.json(
				{ error: "Loan ID is required" },
				{ status: 400 },
			);
		}

		// If proof image is provided, this is a proof upload
		if (proofImage) {
			return handleProofUpload(
				db,
				loanId,
				authResult.userId,
				amount,
				proofImage,
				fileName,
			);
		} else {
			// Legacy direct payment (for backward compatibility)
			return handleDirectPayment(db, loanId, authResult.userId);
		}
	} catch (error) {
		console.error("POST /api/loans/processing-fee error:", error);
		return NextResponse.json(
			{ error: "Internal server error: " + error.message },
			{ status: 500 },
		);
	}
}

// Handle proof upload for processing fee
async function handleProofUpload(
	db,
	loanId,
	userId,
	amount,
	proofImage,
	fileName,
) {
	try {
		// Find the loan
		const loan = await db.collection("loans").findOne({
			_id: new ObjectId(loanId),
			userId: userId, // Ensure user owns the loan
		});

		if (!loan) {
			return NextResponse.json({ error: "Loan not found" }, { status: 404 });
		}

		// Check if loan is approved
		if (loan.status !== "approved") {
			return NextResponse.json(
				{ error: "Only approved loans can pay processing fee" },
				{ status: 400 },
			);
		}

		// Check if processing fee is already paid
		if (loan.loanDetails?.processingFeePaid) {
			return NextResponse.json(
				{ error: "Processing fee has already been paid" },
				{ status: 400 },
			);
		}

		// Calculate processing fee amount if not provided
		const processingFeeAmount = amount
			? parseFloat(amount)
			: loan.loanDetails?.processingFee || loan.loanAmount * 0.01;

		// Create a repayment record in the loan_repayments collection
		const repaymentResult = await db.collection("loan_repayments").insertOne({
			loanId: new ObjectId(loanId),
			userId: userId,
			amount: processingFeeAmount,
			type: "processing_fee",
			proofImage: proofImage,
			fileName: fileName || "processing-fee-proof.jpg",
			status: "pending_review",
			submittedAt: new Date(),
			updatedAt: new Date(),
		});

		// Update loan status to payment_pending to indicate awaiting admin approval
		await db.collection("loans").updateOne(
			{ _id: new ObjectId(loanId) },
			{
				$set: {
					status: "payment_pending",
					"loanDetails.processingFeePaymentPending": true,
					"loanDetails.processingFeeRepaymentId": repaymentResult.insertedId,
					updatedAt: new Date(),
				},
			},
		);

		console.log(
			`Processing fee proof uploaded for loan ${loanId} by user ${userId}, repayment ID: ${repaymentResult.insertedId}`,
		);

		return NextResponse.json({
			status: "success",
			message:
				"Processing fee proof uploaded successfully. Awaiting admin approval.",
			repaymentId: repaymentResult.insertedId,
			status: "pending_review",
		});
	} catch (error) {
		console.error("Error in handleProofUpload:", error);
		return NextResponse.json(
			{ error: "Failed to process proof upload: " + error.message },
			{ status: 500 },
		);
	}
}

// Handle direct payment (legacy)
async function handleDirectPayment(db, loanId, userId) {
	try {
		// Find the loan
		const loan = await db.collection("loans").findOne({
			_id: new ObjectId(loanId),
			userId: userId,
		});

		if (!loan) {
			return NextResponse.json({ error: "Loan not found" }, { status: 404 });
		}

		// Check if loan is approved
		if (loan.status !== "approved") {
			return NextResponse.json(
				{ error: "Only approved loans can pay processing fee" },
				{ status: 400 },
			);
		}

		// Check if processing fee is already paid
		if (loan.loanDetails?.processingFeePaid) {
			return NextResponse.json(
				{ error: "Processing fee has already been paid" },
				{ status: 400 },
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
			},
		);

		console.log("Update Result:", updateResult);

		if (updateResult.modifiedCount === 0) {
			return NextResponse.json(
				{ error: "Loan was found but not updated." },
				{ status: 400 },
			);
		}

		// Create a transaction record for the processing fee payment
		await db.collection("transactions").insertOne({
			userId: new ObjectId(userId),
			loanId: new ObjectId(loanId),
			type: "processing_fee",
			amount: processingFeeAmount,
			description: "Loan processing fee payment",
			status: "completed",
			createdAt: new Date(),
		});

		console.log(`Processing fee paid for loan ${loanId} by user ${userId}`);

		return NextResponse.json({
			status: "success",
			message: "Processing fee payment recorded successfully",
			processingFeePaid: true,
			loanStatus: "active",
		});
	} catch (error) {
		console.error("Error in handleDirectPayment:", error);
		return NextResponse.json(
			{ error: "Internal server error: " + error.message },
			{ status: 500 },
		);
	}
}

// GET endpoint to fetch processing fee status
export async function GET(request) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status },
			);
		}

		const { searchParams } = new URL(request.url);
		const loanId = searchParams.get("loanId");

		if (!loanId) {
			return NextResponse.json(
				{ error: "Loan ID is required" },
				{ status: 400 },
			);
		}

		const { db } = await connectToDatabase();

		// Find the loan
		const loan = await db.collection("loans").findOne({
			_id: new ObjectId(loanId),
			userId: authResult.userId,
		});

		if (!loan) {
			return NextResponse.json({ error: "Loan not found" }, { status: 404 });
		}

		// Check for pending processing fee repayments
		const pendingRepayment = await db.collection("loan_repayments").findOne({
			loanId: new ObjectId(loanId),
			type: "processing_fee",
			status: "pending_review",
		});

		return NextResponse.json({
			status: "success",
			data: {
				processingFeePaid: loan.loanDetails?.processingFeePaid || false,
				processingFeeAmount:
					loan.loanDetails?.processingFee || loan.loanAmount * 0.01,
				paymentPending: !!pendingRepayment,
				pendingRepaymentId: pendingRepayment?._id,
				loanStatus: loan.status,
			},
		});
	} catch (error) {
		console.error("GET /api/loans/processing-fee error:", error);
		return NextResponse.json(
			{ error: "Internal server error: " + error.message },
			{ status: 500 },
		);
	}
}
