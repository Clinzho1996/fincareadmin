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

	// Mark processing fee as paid & record payment under the user
	await db.collection("loans").updateOne(
		{ _id: loan._id, userId }, // <-- use userId in the query
		{
			$set: {
				"loanDetails.processingFeePaid": true,
				updatedAt: new Date(),
			},
			$push: {
				payments: {
					amount: loan.loanDetails.processingFee,
					type: "processing-fee",
					date: new Date(),
					description: "Loan processing fee payment",
				},
			},
		}
	);

	// Optionally, update user’s account record if you track balances
	// await db.collection("users").updateOne(
	// 	{ _id: new ObjectId(userId) },
	// 	{ $inc: { totalFeesPaid: loan.loanDetails.processingFee } }
	// );

	return NextResponse.json({
		message: "Processing fee paid successfully",
		processingFee: loan.loanDetails.processingFee,
	});
}

// Helper function to send loan approval email (pseudo-code)
import nodemailer from "nodemailer";

async function sendLoanApprovalEmail(loan) {
	console.log(
		`Preparing to send loan approval email to ${loan.borrowerDetails.email}`
	);

	try {
		// Create transporter
		const transporter = nodemailer.createTransport({
			service: "gmail",
			auth: {
				user: process.env.EMAIL_USER, // Your Gmail address
				pass: process.env.EMAIL_PASSWORD, // Your Gmail App Password
			},
		});

		// Verify transporter connection
		await transporter.verify();

		// Build email content
		const info = await transporter.sendMail({
			from: `"Fincare CMS" <${process.env.EMAIL_FROM}>`,
			to: loan.borrowerDetails.email,
			subject: "Your Loan Application Has Been Approved",
			html: `
				<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
					<h2 style="color: #333;">Congratulations, ${loan.borrowerDetails.fullName}!</h2>
					<p>Your loan application has been <strong>approved</strong>.</p>
					<p>Here are your loan details:</p>
					<div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
						<p><strong>Amount:</strong> $${loan.loanAmount}</p>
						<p><strong>Interest:</strong> $${loan.loanDetails.interestAmount}</p>
						<p><strong>Processing fee:</strong> $${loan.loanDetails.processingFee}</p>
						<p><strong>Total repayment:</strong> $${loan.loanDetails.totalLoanAmount}</p>
						<p><strong>Monthly Installment:</strong> $${loan.loanDetails.monthlyInstallment.toFixed(
							2
						)}</p>
					</div>
					<p style="color: #ff0000;">
						Please review the attached terms and conditions carefully before proceeding with repayment.
					</p>
					<hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
					<p style="color: #888; font-size: 12px;">
						If you did not request this loan, please contact support immediately at support@fincare.com.
					</p>
				</div>
			`,
		});

		console.log("Loan approval email sent: %s", info.messageId);
		return true;
	} catch (error) {
		console.error("Error sending loan approval email:", error);
		return false;
	}
}
