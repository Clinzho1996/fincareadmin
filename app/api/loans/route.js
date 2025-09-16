// app/api/loans/route.js
import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

// Loan configuration constants
const LOAN_INTEREST_RATE = 0.1; // 10% annual interest
const LOAN_PROCESSING_FEE_RATE = 0.01; // 1% processing fee

export async function GET(request) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}

		const { db } = await connectToDatabase();
		const loans = await db
			.collection("loans")
			.find({ userId: authResult.userId })
			.toArray();

		return NextResponse.json({ loans });
	} catch (error) {
		console.error("GET /api/loans error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

export async function POST(request) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}

		const {
			loanAmount,
			purpose,
			duration,
			debitFromSavings,
			fullName,
			phone,
			email,
			gender,
			guarantorCoverage,
			guarantorProfession,
			governmentId,
			activeInvestments,
		} = await request.json();

		if (
			!loanAmount ||
			!purpose ||
			!duration ||
			!fullName ||
			!phone ||
			!email ||
			!gender
		) {
			return NextResponse.json(
				{ error: "Required fields are missing" },
				{ status: 400 }
			);
		}

		const { db } = await connectToDatabase();

		// Calculate loan details
		const principalAmount = Number(loanAmount);
		const processingFee = principalAmount * LOAN_PROCESSING_FEE_RATE;
		const interestAmount =
			principalAmount * LOAN_INTEREST_RATE * (Number(duration) / 12);
		const totalLoanAmount = principalAmount + interestAmount;
		const monthlyInstallment = totalLoanAmount / Number(duration);

		const newLoan = {
			userId: authResult.userId,
			loanAmount: principalAmount,
			purpose,
			duration: Number(duration),
			debitFromSavings: debitFromSavings || false,
			borrowerDetails: {
				fullName,
				phone,
				email,
				gender,
			},
			guarantorDetails: {
				coverage: Number(guarantorCoverage) || 0,
				profession: guarantorProfession || "",
			},
			governmentId: governmentId || "",
			activeInvestments: activeInvestments || [],
			status: "pending",
			loanDetails: {
				principalAmount,
				processingFee,
				interestRate: LOAN_INTEREST_RATE,
				interestAmount,
				totalLoanAmount,
				monthlyInstallment,
				remainingBalance: totalLoanAmount,
				paidAmount: 0,
				processingFeePaid: false,
			},
			createdAt: new Date(),
			updatedAt: new Date(),
			payments: [],
		};

		const result = await db.collection("loans").insertOne(newLoan);

		return NextResponse.json(
			{
				message: "Loan application submitted successfully",
				loanId: result.insertedId,
				processingFee: processingFee.toFixed(2),
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error("POST /api/loans error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

// PATCH endpoint to update loan status
export async function PATCH(request) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}

		const { loanId, status, action } = await request.json();

		if (!loanId || !status) {
			return NextResponse.json(
				{ error: "Loan ID and status are required" },
				{ status: 400 }
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

		// Handle different actions
		if (action === "liquidate") {
			return handleLiquidation(db, loan, authResult.userId);
		}

		if (action === "pay-processing-fee") {
			return handleProcessingFeePayment(db, loan, authResult.userId);
		}

		// Default action: update loan status
		return handleStatusUpdate(db, loan, status, authResult.userId);
	} catch (error) {
		console.error("PATCH /api/loans error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

// Helper function to handle loan status updates
async function handleStatusUpdate(db, loan, status, userId) {
	// Update loan status
	await db
		.collection("loans")
		.updateOne({ _id: loan._id }, { $set: { status, updatedAt: new Date() } });

	// If status changed to approved, update user's total loans and send email
	if (status === "approved" && loan.status !== "approved") {
		await db
			.collection("users")
			.updateOne(
				{ _id: new ObjectId(userId) },
				{ $inc: { totalLoans: Number(loan.loanAmount) } }
			);

		// Send email verification for terms and conditions
		await sendLoanApprovalEmail(loan);
	}

	// If status changed from approved to something else, subtract from total loans
	if (loan.status === "approved" && status !== "approved") {
		await db
			.collection("users")
			.updateOne(
				{ _id: new ObjectId(userId) },
				{ $inc: { totalLoans: -Number(loan.loanAmount) } }
			);
	}

	return NextResponse.json({
		message: "Loan status updated successfully",
	});
}

// Helper function to handle mid-year liquidation
async function handleLiquidation(db, loan, userId) {
	if (loan.status !== "approved") {
		return NextResponse.json(
			{ error: "Only approved loans can be liquidated" },
			{ status: 400 }
		);
	}

	// Calculate time passed since loan approval
	const now = new Date();
	const approvalDate = new Date(loan.updatedAt);
	const monthsPassed =
		(now.getFullYear() - approvalDate.getFullYear()) * 12 +
		(now.getMonth() - approvalDate.getMonth());

	// Check if it's mid-year (6 months or more)
	if (monthsPassed < 6) {
		return NextResponse.json(
			{ error: "Loan can only be liquidated after 6 months" },
			{ status: 400 }
		);
	}

	// Calculate half credit for mid-year liquidation
	const halfCredit = loan.loanDetails.remainingBalance / 2;

	// Update loan with liquidation details
	await db.collection("loans").updateOne(
		{ _id: loan._id },
		{
			$set: {
				status: "liquidated",
				"loanDetails.remainingBalance": 0,
				"loanDetails.paidAmount": loan.loanDetails.paidAmount + halfCredit,
				updatedAt: new Date(),
			},
			$push: {
				payments: {
					amount: halfCredit,
					type: "liquidation",
					date: new Date(),
					description: "Mid-year liquidation (50% credit)",
				},
			},
		}
	);

	// Update user's total loans
	await db
		.collection("users")
		.updateOne(
			{ _id: new ObjectId(userId) },
			{ $inc: { totalLoans: -Number(halfCredit) } }
		);

	return NextResponse.json({
		message: "Loan liquidated successfully",
		creditAmount: halfCredit.toFixed(2),
	});
}

// Helper function to handle processing fee payment
async function handleProcessingFeePayment(db, loan, userId) {
	if (loan.status !== "approved") {
		return NextResponse.json(
			{ error: "Processing fee can only be paid for approved loans" },
			{ status: 400 }
		);
	}

	if (loan.loanDetails.processingFeePaid) {
		return NextResponse.json(
			{ error: "Processing fee already paid" },
			{ status: 400 }
		);
	}

	// In a real application, you would process the payment here
	// For this example, we'll just mark it as paid

	await db.collection("loans").updateOne(
		{ _id: loan._id },
		{
			$set: {
				"loanDetails.processingFeePaid": true,
				updatedAt: new Date(),
			},
		}
	);

	return NextResponse.json({
		message: "Processing fee paid successfully",
		processingFee: loan.loanDetails.processingFee,
	});
}

// Helper function to send loan approval email (pseudo-code)
async function sendLoanApprovalEmail(loan) {
	// In a real application, you would implement email sending logic here
	// This would send terms and conditions for the borrower to accept or reject

	console.log(`Sending loan approval email to ${loan.borrowerDetails.email}`);
	console.log(`Loan amount: $${loan.loanAmount}`);
	console.log(`Processing fee: $${loan.loanDetails.processingFee}`);
	console.log("Terms and conditions would be included in the email");

	// You would typically use a service like Nodemailer, SendGrid, etc.
	// await emailService.sendLoanApprovalEmail(loan);
}
