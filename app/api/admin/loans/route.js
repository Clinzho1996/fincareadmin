// app/api/admin/loans/route.js
export const dynamic = "force-dynamic";

import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function GET(request) {
	try {
		// Authenticate the request using getToken
		const token = await getToken({ req: request });

		if (!token || (token.role !== "super_admin" && token.role !== "admin")) {
			return NextResponse.json(
				{ error: "Unauthorized. Admin access required." },
				{ status: 403 }
			);
		}

		// Connect to database
		const { db } = await connectToDatabase();

		const { searchParams } = new URL(request.url);

		// Get pagination parameters
		const page = parseInt(searchParams.get("page")) || 1;
		const limit = parseInt(searchParams.get("limit")) || 10;
		const skip = (page - 1) * limit;

		// Get filter parameters
		const search = searchParams.get("search") || "";
		const status = searchParams.get("status") || "";
		const processingFeePaid = searchParams.get("processingFeePaid") || "";

		// Build filter query
		let filter = {};

		// Status filter
		if (status && status !== "all") {
			filter.status = status;
		}

		// Processing fee filter
		if (processingFeePaid !== "") {
			filter["loanDetails.processingFeePaid"] = processingFeePaid === "true";
		}

		// Search filter (by borrower name, email, phone, or loan ID)
		if (search) {
			filter.$or = [
				{ "borrowerDetails.fullName": { $regex: search, $options: "i" } },
				{ "borrowerDetails.email": { $regex: search, $options: "i" } },
				{ "borrowerDetails.phone": { $regex: search, $options: "i" } },
				{ _id: { $regex: search, $options: "i" } }, // Search by loan ID
			];
		}

		// Get total count for pagination
		const total = await db.collection("loans").countDocuments(filter);

		// Get loans with pagination and filtering
		const loans = await db
			.collection("loans")
			.find(filter)
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limit)
			.toArray();

		const enhancedLoans = await Promise.all(
			loans.map(async (loan) => {
				if (!loan.loanDetails) {
					return {
						...loan,
						loanDetails: await calculateLoanDetails(db, loan),
					};
				}
				return loan;
			})
		);

		return NextResponse.json({
			status: "success",
			loans: enhancedLoans,
			pagination: {
				page,
				limit,
				total,
				pages: Math.ceil(total / limit),
			},
		});
	} catch (error) {
		console.error("GET /api/admin/loans error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

export async function PATCH(request) {
	try {
		// Authenticate the request using getToken
		const token = await getToken({ req: request });

		if (!token || (token.role !== "super_admin" && token.role !== "admin")) {
			return NextResponse.json(
				{ error: "Unauthorized. Admin access required." },
				{ status: 403 }
			);
		}

		// Connect to database
		const { db } = await connectToDatabase();

		const { loanId, status, action, processingFeePaid } = await request.json();

		if (!loanId) {
			return NextResponse.json(
				{ error: "Loan ID is required" },
				{ status: 400 }
			);
		}

		// Find the loan
		const loan = await db.collection("loans").findOne({
			_id: new ObjectId(loanId),
		});

		if (!loan) {
			return NextResponse.json({ error: "Loan not found" }, { status: 404 });
		}

		// Handle different actions
		if (action === "update-processing-fee") {
			return handleProcessingFeeUpdate(db, loan, processingFeePaid);
		}

		if (action === "liquidate") {
			return handleAdminLiquidation(db, loan);
		}

		if (action === "resend-email") {
			return handleResendEmail(loan);
		}

		// Default action: update loan status
		if (!status) {
			return NextResponse.json(
				{ error: "Status is required for status updates" },
				{ status: 400 }
			);
		}

		return handleStatusUpdate(db, loan, status);
	} catch (error) {
		console.error("PATCH /api/admin/loans error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

const calculateLoanDetails = async (db, loan) => {
	const settings = await db
		.collection("settings")
		.findOne({ type: "loan_settings" });

	const LOAN_INTEREST_RATE = settings ? settings.interestRate / 100 : 0.1; // Use dynamic rate or 10% default
	const LOAN_PROCESSING_FEE_RATE = settings
		? settings.processingFeeRate / 100
		: 0.01; // Use dynamic rate or 1% default

	const principalAmount = Number(loan.loanAmount);
	const duration = Number(loan.duration);

	// Calculate loan details
	const processingFee = principalAmount * LOAN_PROCESSING_FEE_RATE;
	const interestAmount = principalAmount * LOAN_INTEREST_RATE * (duration / 12);
	const totalLoanAmount = principalAmount + interestAmount;
	const monthlyInstallment = totalLoanAmount / duration;

	return {
		principalAmount,
		processingFee,
		interestRate: LOAN_INTEREST_RATE,
		interestAmount,
		totalLoanAmount,
		monthlyInstallment,
		remainingBalance: totalLoanAmount,
		paidAmount: 0,
		processingFeePaid: false,
		...loan.loanDetails,
	};
};

// Helper function to handle loan status updates
async function handleStatusUpdate(db, loan, status) {
	// Update loan status
	await db
		.collection("loans")
		.updateOne({ _id: loan._id }, { $set: { status, updatedAt: new Date() } });

	// If status changed to approved, calculate loan details with current rates
	if (status === "approved" && loan.status !== "approved") {
		const loanDetails = await calculateLoanDetails(db, loan);

		await db.collection("loans").updateOne(
			{ _id: loan._id },
			{
				$set: {
					status,
					loanDetails,
					updatedAt: new Date(),
				},
			}
		);

		await db
			.collection("users")
			.updateOne(
				{ _id: new ObjectId(loan.userId) },
				{ $inc: { totalLoans: Number(loan.loanAmount) } }
			);

		await sendLoanApprovalEmail(loan);
	} else {
		// For other status updates
		await db
			.collection("loans")
			.updateOne(
				{ _id: loan._id },
				{ $set: { status, updatedAt: new Date() } }
			);
	}

	return NextResponse.json({
		message: "Loan status updated successfully",
	});
}

// Helper function to handle processing fee updates
async function handleProcessingFeeUpdate(db, loan, processingFeePaid) {
	if (typeof processingFeePaid !== "boolean") {
		return NextResponse.json(
			{ error: "processingFeePaid must be a boolean" },
			{ status: 400 }
		);
	}

	await db.collection("loans").updateOne(
		{ _id: loan._id },
		{
			$set: {
				"loanDetails.processingFeePaid": processingFeePaid,
				updatedAt: new Date(),
			},
		}
	);

	return NextResponse.json({
		message: "Processing fee status updated successfully",
		processingFeePaid,
	});
}

// Helper function to handle admin-initiated liquidation
async function handleAdminLiquidation(db, loan) {
	if (loan.status !== "approved") {
		return NextResponse.json(
			{ error: "Only approved loans can be liquidated" },
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
					description: "Admin-initiated mid-year liquidation (50% credit)",
				},
			},
		}
	);

	// Update user's total loans
	await db
		.collection("users")
		.updateOne(
			{ _id: new ObjectId(loan.userId) },
			{ $inc: { totalLoans: -Number(halfCredit) } }
		);

	return NextResponse.json({
		message: "Loan liquidated successfully",
		creditAmount: halfCredit.toFixed(2),
	});
}

// Helper function to handle email resending
async function handleResendEmail(loan) {
	if (loan.status !== "approved") {
		return NextResponse.json(
			{ error: "Can only resend emails for approved loans" },
			{ status: 400 }
		);
	}

	// Resend the approval email
	await sendLoanApprovalEmail(loan);

	return NextResponse.json({
		message: "Email resent successfully",
	});
}

// Helper function to send loan approval email (pseudo-code)

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
			from: `"Fincare CMS" <${process.env.EMAIL_USER}>`,
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
