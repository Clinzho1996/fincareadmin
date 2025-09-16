// app/api/admin/loans/route.js
export const dynamic = "force-dynamic";

import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

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

		return NextResponse.json({
			status: "success",
			loans,
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

// Helper function to handle loan status updates
async function handleStatusUpdate(db, loan, status) {
	// Update loan status
	await db
		.collection("loans")
		.updateOne({ _id: loan._id }, { $set: { status, updatedAt: new Date() } });

	// If status changed to approved, update user's total loans and send email
	if (status === "approved" && loan.status !== "approved") {
		await db
			.collection("users")
			.updateOne(
				{ _id: new ObjectId(loan.userId) },
				{ $inc: { totalLoans: Number(loan.loanAmount) } }
			);

		// Send approval email with terms and conditions
		await sendLoanApprovalEmail(loan);
	}

	// If status changed from approved to something else, subtract from total loans
	if (loan.status === "approved" && status !== "approved") {
		await db
			.collection("users")
			.updateOne(
				{ _id: new ObjectId(loan.userId) },
				{ $inc: { totalLoans: -Number(loan.loanAmount) } }
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
	// In a real application, implement email sending logic
	console.log(`Sending loan approval email to ${loan.borrowerDetails.email}`);
	console.log(`Loan details:`);
	console.log(`- Amount: $${loan.loanAmount}`);
	console.log(`- Interest: $${loan.loanDetails.interestAmount}`);
	console.log(`- Processing fee: $${loan.loanDetails.processingFee}`);
	console.log(`- Total repayment: $${loan.loanDetails.totalLoanAmount}`);
	console.log("Terms and conditions would be included in the email");

	// Example using a hypothetical email service:
	// await emailService.send({
	//   to: loan.borrowerDetails.email,
	//   subject: "Loan Approval - Terms and Conditions",
	//   template: "loan-approval",
	//   data: {
	//     loanDetails: loan.loanDetails,
	//     borrowerDetails: loan.borrowerDetails
	//   }
	// });
}
