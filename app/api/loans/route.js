// app/api/loans/route.js
import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

// app/api/loans/route.js - Updated GET method
// app/api/loans/route.js - Updated GET method with enhanced debugging
export async function GET(request) {
	try {
		console.log("=== LOANS API CALLED ===");

		const authResult = await authenticate(request);
		if (authResult.error) {
			console.log("Authentication failed:", authResult.error);
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}

		console.log("User authenticated successfully:");
		console.log("User ID (ObjectId):", authResult.userId);
		console.log("User ID (string):", authResult.userIdString);
		console.log("User ID type:", typeof authResult.userId);
		console.log("User ID constructor:", authResult.userId?.constructor?.name);

		const { db } = await connectToDatabase();

		// Debug: Check ALL loans to see user ID formats
		const allLoans = await db.collection("loans").find({}).toArray();
		console.log("=== ALL LOANS IN DATABASE ===");
		allLoans.forEach((loan, index) => {
			console.log(`Loan ${index}:`, {
				id: loan._id,
				userId: loan.userId,
				userIdType: typeof loan.userId,
				userIdConstructor: loan.userId?.constructor?.name,
				status: loan.status,
				loanAmount: loan.loanAmount,
			});
		});

		// Try different query approaches
		console.log("=== QUERYING USER LOANS ===");

		// Query 1: With ObjectId
		const userLoansWithObjectId = await db
			.collection("loans")
			.find({ userId: authResult.userId })
			.toArray();
		console.log(
			"Loans found with ObjectId query:",
			userLoansWithObjectId.length
		);

		// Query 2: With string
		const userLoansWithString = await db
			.collection("loans")
			.find({ userId: authResult.userIdString })
			.toArray();
		console.log("Loans found with string query:", userLoansWithString.length);

		// Query 3: Try both
		let userLoans;
		if (userLoansWithObjectId.length > 0) {
			userLoans = userLoansWithObjectId;
			console.log("Using ObjectId query results");
		} else if (userLoansWithString.length > 0) {
			userLoans = userLoansWithString;
			console.log("Using string query results");
		} else {
			userLoans = [];
			console.log("No loans found with either query");
		}

		console.log("Final user loans count:", userLoans.length);

		// Enhance loans with calculated details if missing or null
		const enhancedLoans = userLoans.map((loan) => {
			// Check if loan details are missing or have null values
			if (
				!loan.loanDetails ||
				loan.loanDetails.interestAmount === null ||
				loan.loanDetails.totalLoanAmount === null ||
				loan.loanDetails.monthlyInstallment === null ||
				loan.loanDetails.remainingBalance === null
			) {
				console.log(`Enhancing loan ${loan._id} with calculated details`);
				return {
					...loan,
					loanDetails: calculateCompleteLoanDetails(loan),
				};
			}
			return loan;
		});

		console.log("Returning enhanced loans:", enhancedLoans.length);

		return NextResponse.json({
			loans: enhancedLoans,
			debug: {
				totalLoansInDB: allLoans.length,
				userLoansFound: userLoans.length,
				userIdObjectId: authResult.userId?.toString(),
				userIdString: authResult.userIdString,
				queryResults: {
					objectIdQuery: userLoansWithObjectId.length,
					stringQuery: userLoansWithString.length,
				},
			},
		});
	} catch (error) {
		console.error("GET /api/loans error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

// Enhanced calculation function that handles null values
function calculateCompleteLoanDetails(loan) {
	// Use default rates as fallback
	const LOAN_INTEREST_RATE = 0.1; // 10% annual interest
	const LOAN_PROCESSING_FEE_RATE = 0.01; // 1% processing fee

	const principalAmount = Number(loan.loanAmount);
	const duration = Number(loan.duration) || 12; // Default to 12 months if null

	// Calculate loan details
	const processingFee = principalAmount * LOAN_PROCESSING_FEE_RATE;
	const interestAmount = principalAmount * LOAN_INTEREST_RATE * (duration / 12);
	const totalLoanAmount = principalAmount + interestAmount;
	const monthlyInstallment = totalLoanAmount / duration;

	// Calculate paid amount from payments
	const paidAmount =
		loan.payments?.reduce((total, payment) => total + payment.amount, 0) || 0;
	const remainingBalance = Math.max(0, totalLoanAmount - paidAmount);

	// Preserve existing values if they exist and are not null
	const existingDetails = loan.loanDetails || {};

	return {
		principalAmount: existingDetails.principalAmount || principalAmount,
		processingFee: existingDetails.processingFee || processingFee,
		interestRate: existingDetails.interestRate || LOAN_INTEREST_RATE,
		interestAmount:
			existingDetails.interestAmount !== null
				? existingDetails.interestAmount
				: interestAmount,
		totalLoanAmount:
			existingDetails.totalLoanAmount !== null
				? existingDetails.totalLoanAmount
				: totalLoanAmount,
		monthlyInstallment:
			existingDetails.monthlyInstallment !== null
				? existingDetails.monthlyInstallment
				: monthlyInstallment,
		remainingBalance:
			existingDetails.remainingBalance !== null
				? existingDetails.remainingBalance
				: remainingBalance,
		paidAmount: existingDetails.paidAmount || paidAmount,
		processingFeePaid: existingDetails.processingFeePaid || false,
	};
}

// app/api/loans/route.js - Updated POST method with optional fields
export async function POST(request) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}

		const payload = await request.json();
		console.log("Received loan payload:", JSON.stringify(payload, null, 2));

		// Extract and transform fields with better validation
		const {
			loanAmount,
			purpose,
			duration, // This might be "12 months" string
			debitFromSavings,
			fullName,
			phone,
			email,
			gender,
			guarantors,
			governmentId,
			governmentIdImage,
			activeInvestments,
		} = payload;

		// Transform duration from "12 months" to number 12
		const durationMonths =
			typeof duration === "string"
				? parseInt(duration.replace(/[^0-9]/g, "")) || 12
				: Number(duration) || 12;

		// Transform activeInvestments to always be an array
		let investmentsArray = [];
		if (activeInvestments) {
			if (Array.isArray(activeInvestments)) {
				investmentsArray = activeInvestments;
			} else if (
				typeof activeInvestments === "object" &&
				activeInvestments !== null
			) {
				// If it's a single object, wrap it in array
				// Only include if it has valid data (not all undefined)
				const hasValidData = Object.values(activeInvestments).some(
					(value) => value !== undefined && value !== null && value !== ""
				);
				if (hasValidData) {
					investmentsArray = [activeInvestments];
				}
			}
		}

		// Validate required fields
		if (!loanAmount || !purpose || !fullName || !phone || !email || !gender) {
			console.log("Missing required fields:", {
				loanAmount: !loanAmount,
				purpose: !purpose,
				fullName: !fullName,
				phone: !phone,
				email: !email,
				gender: !gender,
			});
			return NextResponse.json(
				{
					error:
						"Required fields are missing: loanAmount, purpose, fullName, phone, email, gender",
				},
				{ status: 400 }
			);
		}

		const { db } = await connectToDatabase();

		// Initialize guarantor details as empty array
		let guarantorDetails = [];
		let totalGuarantorCoverage = 0;

		// Process guarantors only if provided and not empty
		if (guarantors && Array.isArray(guarantors) && guarantors.length > 0) {
			console.log("Processing guarantors:", guarantors);

			// Validate maximum number of guarantors
			if (guarantors.length > 5) {
				return NextResponse.json(
					{ error: "Maximum of 5 guarantors allowed" },
					{ status: 400 }
				);
			}

			// Process each guarantor
			for (let i = 0; i < guarantors.length; i++) {
				const guarantor = guarantors[i];

				// Check if guarantor has required fields
				if (!guarantor.userId || guarantor.coverage === undefined) {
					console.log(`Guarantor ${i + 1} missing required fields:`, guarantor);
					return NextResponse.json(
						{
							error: `Guarantor ${
								i + 1
							} is missing required fields (userId and coverage)`,
						},
						{ status: 400 }
					);
				}

				// Allow coverage of 0 (no coverage) but validate range
				if (guarantor.coverage < 0 || guarantor.coverage > 100) {
					return NextResponse.json(
						{
							error: `Guarantor ${i + 1} coverage must be between 0% and 100%`,
						},
						{ status: 400 }
					);
				}

				// Skip processing if coverage is 0 and we don't need to validate the user
				if (guarantor.coverage === 0) {
					console.log(
						`Adding guarantor ${i + 1} with 0% coverage (no validation needed)`
					);

					guarantorDetails.push({
						userId: new ObjectId(guarantor.userId),
						fullName: guarantor.fullName || "Unknown",
						email: guarantor.email || "",
						phone: guarantor.phone || "",
						coverage: 0,
						coverageAmount: 0,
						savingsBalance: guarantor.savingsBalance || 0,
						profession: guarantor.profession || "Not specified",
						relationship: guarantor.relationship || "Colleague",
						approved: true, // Auto-approve if coverage is 0
						invitedAt: new Date(),
						status: "approved", // Auto-approved if no coverage
					});
					continue;
				}

				// For coverage > 0, validate the guarantor user exists
				let guarantorUser;
				try {
					guarantorUser = await db.collection("users").findOne({
						_id: new ObjectId(guarantor.userId),
						membershipStatus: { $in: ["approved", "active"] },
					});
				} catch (error) {
					console.error("Error finding guarantor user:", error);
					return NextResponse.json(
						{ error: `Invalid guarantor ${i + 1} user ID` },
						{ status: 400 }
					);
				}

				if (!guarantorUser) {
					return NextResponse.json(
						{ error: `Guarantor ${i + 1} not found or not an active member` },
						{ status: 400 }
					);
				}

				// Check if user is trying to be their own guarantor
				if (guarantor.userId === authResult.userId.toString()) {
					return NextResponse.json(
						{ error: "You cannot be your own guarantor" },
						{ status: 400 }
					);
				}

				// Check if guarantor has sufficient savings/investments (only if coverage > 0)
				const guarantorSavings = await db
					.collection("savings")
					.find({
						userId: guarantor.userId,
					})
					.toArray();

				const totalGuarantorSavings = guarantorSavings.reduce(
					(sum, saving) => sum + Number(saving.currentBalance || 0),
					0
				);

				const guarantorCoverageAmount =
					(Number(loanAmount) * guarantor.coverage) / 100;

				// Basic eligibility check - only if coverage is significant
				if (
					guarantor.coverage > 0 &&
					totalGuarantorSavings < guarantorCoverageAmount * 0.5
				) {
					return NextResponse.json(
						{
							error: `Guarantor ${i + 1} (${guarantorUser.firstName} ${
								guarantorUser.lastName
							}) does not meet the minimum savings requirement for the requested coverage`,
						},
						{ status: 400 }
					);
				}

				// Add to total coverage
				totalGuarantorCoverage += Number(guarantor.coverage);

				// Create guarantor detail object
				guarantorDetails.push({
					userId: new ObjectId(guarantor.userId),
					fullName: `${guarantorUser.firstName} ${guarantorUser.lastName}`,
					email: guarantorUser.email,
					phone: guarantorUser.phone,
					coverage: Number(guarantor.coverage),
					coverageAmount: guarantorCoverageAmount,
					savingsBalance: totalGuarantorSavings,
					profession: guarantorUser.profession || "Not specified",
					relationship: guarantor.relationship || "Colleague",
					approved: false,
					invitedAt: new Date(),
					status: "pending",
				});
			}

			// Validate total coverage (only if there are guarantors with coverage > 0)
			if (totalGuarantorCoverage > 200) {
				return NextResponse.json(
					{ error: "Total guarantor coverage cannot exceed 200%" },
					{ status: 400 }
				);
			}
		}

		// Calculate loan details
		const loanDetails = calculateLoanDetailsForUser({
			loanAmount,
			duration: durationMonths,
			loanDetails: { processingFeePaid: false },
		});

		const newLoan = {
			userId: authResult.userId,
			loanAmount: Number(loanAmount),
			purpose,
			duration: durationMonths,
			debitFromSavings: debitFromSavings || false,
			borrowerDetails: {
				fullName,
				phone,
				email,
				gender,
			},
			guarantorDetails: guarantorDetails,
			governmentId: governmentId || governmentIdImage || "", // Handle both field names
			activeInvestments: investmentsArray, // Use transformed array
			status: "pending",
			loanDetails: loanDetails,
			createdAt: new Date(),
			updatedAt: new Date(),
			payments: [],
			guarantorStatus:
				guarantorDetails.length > 0
					? guarantorDetails.some((g) => g.coverage > 0 && !g.approved)
						? "pending_approval"
						: "approved"
					: "not_required",
			totalGuarantorCoverage: totalGuarantorCoverage,
		};

		console.log("Creating new loan:", JSON.stringify(newLoan, null, 2));

		const result = await db.collection("loans").insertOne(newLoan);

		// Send notification emails only to guarantors with coverage > 0
		const guarantorsNeedingApproval = guarantorDetails.filter(
			(g) => g.coverage > 0
		);
		if (guarantorsNeedingApproval.length > 0) {
			sendGuarantorInvitations(guarantorsNeedingApproval, newLoan).catch(
				(error) => {
					console.error("Failed to send guarantor invitations:", error);
				}
			);
		}

		return NextResponse.json(
			{
				message: "Loan application submitted successfully",
				loanId: result.insertedId,
				processingFee: loanDetails.processingFee.toFixed(2),
				guarantorsRequired: guarantorDetails.length > 0,
				totalGuarantorCoverage: totalGuarantorCoverage,
				guarantorInvitationsSent: guarantorsNeedingApproval.length,
				nextSteps:
					guarantorsNeedingApproval.length > 0
						? "Your guarantors have been notified and need to approve the request."
						: guarantorDetails.length > 0
						? "Guarantors added with 0% coverage (no approval required)."
						: "No guarantors required for this application.",
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error("POST /api/loans error:", error);
		return NextResponse.json(
			{ error: "Internal server error: " + error.message },
			{ status: 500 }
		);
	}
}

// Helper function to calculate loan details (add this if missing)
function calculateLoanDetailsForUser({ loanAmount, duration, loanDetails }) {
	const LOAN_INTEREST_RATE = 0.1; // 10% annual interest
	const LOAN_PROCESSING_FEE_RATE = 0.01; // 1% processing fee

	const principalAmount = Number(loanAmount);
	const loanDuration = Number(duration) || 12;

	// Calculate loan details
	const processingFee = principalAmount * LOAN_PROCESSING_FEE_RATE;
	const interestAmount =
		principalAmount * LOAN_INTEREST_RATE * (loanDuration / 12);
	const totalLoanAmount = principalAmount + interestAmount;
	const monthlyInstallment = totalLoanAmount / loanDuration;

	return {
		principalAmount: principalAmount,
		processingFee: processingFee,
		interestRate: LOAN_INTEREST_RATE,
		interestAmount: interestAmount,
		totalLoanAmount: totalLoanAmount,
		monthlyInstallment: monthlyInstallment,
		remainingBalance: totalLoanAmount,
		paidAmount: 0,
		processingFeePaid: loanDetails.processingFeePaid || false,
	};
}

// Helper function to send guarantor invitation emails
async function sendGuarantorInvitations(guarantors, loan) {
	try {
		// This would integrate with your email service
		// For now, we'll just log the invitations
		console.log("Sending guarantor invitations:", {
			loanId: loan._id,
			loanAmount: loan.loanAmount,
			borrower: loan.borrowerDetails.fullName,
			guarantors: guarantors.map((g) => ({
				name: g.fullName,
				email: g.email,
				coverage: g.coverage,
			})),
		});

		// In a real implementation, you would:
		// 1. Send emails to each guarantor with an approval link
		// 2. Create notifications in the database
		// 3. Possibly send SMS notifications

		return true;
	} catch (error) {
		console.error("Error sending guarantor invitations:", error);
		return false;
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
