// app/api/loans/route.js
import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

// ==================== GET METHOD ====================
export async function GET(request) {
	try {
		console.log("=== LOANS API CALLED ===");

		const authResult = await authenticate(request);
		if (authResult.error) {
			console.log("Authentication failed:", authResult.error);
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status },
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
			userLoansWithObjectId.length,
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
			{ status: 500 },
		);
	}
}

// ==================== POST METHOD ====================
export async function POST(request) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status },
			);
		}

		const payload = await request.json();
		console.log("Received loan payload:", JSON.stringify(payload, null, 2));

		const {
			loanAmount,
			purpose,
			duration,
			debitFromSavings,
			guarantors,
			governmentId,
			governmentIdImage,
			activeInvestments,
		} = payload;

		// Parse duration as number of days
		const durationDays = Number(duration) || 30;

		// Transform activeInvestments to always be an array
		let investmentsArray = [];
		if (activeInvestments) {
			if (Array.isArray(activeInvestments)) {
				investmentsArray = activeInvestments;
			} else if (
				typeof activeInvestments === "object" &&
				activeInvestments !== null
			) {
				const hasValidData = Object.values(activeInvestments).some(
					(value) => value !== undefined && value !== null && value !== "",
				);
				if (hasValidData) {
					investmentsArray = [activeInvestments];
				}
			}
		}

		// Validate required fields
		if (!loanAmount || !purpose || !duration) {
			console.log("Missing required fields:", {
				loanAmount: !loanAmount,
				purpose: !purpose,
				duration: !duration,
			});
			return NextResponse.json(
				{
					error: "Required fields are missing: loanAmount, purpose, duration",
				},
				{ status: 400 },
			);
		}

		const { db } = await connectToDatabase();

		// Get user details from database
		const user = await db.collection("users").findOne({
			_id: authResult.userId,
		});

		if (!user) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		console.log("Found user:", {
			id: user._id,
			fullName: `${user.firstName} ${user.lastName}`,
			email: user.email,
			phone: user.phone,
		});

		// Process guarantors
		let guarantorDetails = [];
		let totalGuarantorCoverage = 0;

		if (guarantors && Array.isArray(guarantors) && guarantors.length > 0) {
			console.log("Processing guarantors:", guarantors);

			if (guarantors.length > 5) {
				return NextResponse.json(
					{ error: "Maximum of 5 guarantors allowed" },
					{ status: 400 },
				);
			}

			for (let i = 0; i < guarantors.length; i++) {
				const guarantor = guarantors[i];

				if (!guarantor.userId || guarantor.coverage === undefined) {
					console.log(`Guarantor ${i + 1} missing required fields:`, guarantor);
					return NextResponse.json(
						{
							error: `Guarantor ${
								i + 1
							} is missing required fields (userId and coverage)`,
						},
						{ status: 400 },
					);
				}

				if (guarantor.coverage < 0 || guarantor.coverage > 100) {
					return NextResponse.json(
						{
							error: `Guarantor ${i + 1} coverage must be between 0% and 100%`,
						},
						{ status: 400 },
					);
				}

				if (guarantor.coverage === 0) {
					console.log(
						`Adding guarantor ${i + 1} with 0% coverage (no validation needed)`,
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
						approved: true,
						invitedAt: new Date(),
						status: "approved",
					});
					continue;
				}

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
						{ status: 400 },
					);
				}

				if (!guarantorUser) {
					return NextResponse.json(
						{ error: `Guarantor ${i + 1} not found or not an active member` },
						{ status: 400 },
					);
				}

				if (guarantor.userId === authResult.userId.toString()) {
					return NextResponse.json(
						{ error: "You cannot be your own guarantor" },
						{ status: 400 },
					);
				}

				// First, try to get savings from the savings collection
				let totalGuarantorSavings = 0;

				// Method 1: Check savings collection
				const guarantorSavings = await db
					.collection("savings")
					.find({
						userId: guarantor.userId,
					})
					.toArray();

				if (guarantorSavings && guarantorSavings.length > 0) {
					totalGuarantorSavings = guarantorSavings.reduce(
						(sum, saving) =>
							sum + Number(saving.currentBalance || saving.amount || 0),
						0,
					);
					console.log(
						`Guarantor savings from collection: ${totalGuarantorSavings}`,
					);
				}

				// Method 2: If no savings found, check the user document directly
				if (totalGuarantorSavings === 0) {
					const guarantorUserRecord = await db.collection("users").findOne({
						_id: new ObjectId(guarantor.userId),
					});

					if (guarantorUserRecord) {
						// Check various possible field names for savings
						totalGuarantorSavings =
							guarantorUserRecord.savingsBalance ||
							guarantorUserRecord.totalSavings ||
							guarantorUserRecord.savings ||
							0;

						console.log(
							`Guarantor savings from user record: ${totalGuarantorSavings}`,
						);
					}
				}

				// Method 3: Check investments as alternative collateral
				let totalGuarantorInvestments = 0;
				if (totalGuarantorSavings < guarantorCoverageAmount * 0.5) {
					const guarantorInvestments = await db
						.collection("investments")
						.find({
							userId: guarantor.userId,
							status: "active",
						})
						.toArray();

					totalGuarantorInvestments = guarantorInvestments.reduce(
						(sum, inv) => sum + Number(inv.currentValue || inv.amount || 0),
						0,
					);

					console.log(`Guarantor investments: ${totalGuarantorInvestments}`);
				}

				// Use combined savings + investments for eligibility check
				const totalGuarantorAssets =
					totalGuarantorSavings + totalGuarantorInvestments;

				if (
					guarantor.coverage > 0 &&
					totalGuarantorAssets < guarantorCoverageAmount * 0.5
				) {
					return NextResponse.json(
						{
							error: `Guarantor ${i + 1} (${guarantorUser.firstName} ${
								guarantorUser.lastName
							}) does not meet the minimum savings/investment requirement of ${(guarantorCoverageAmount * 0.5).toFixed(2)} for the requested coverage. Current assets: ${totalGuarantorAssets.toFixed(2)}`,
						},
						{ status: 400 },
					);
				}

				const guarantorCoverageAmount =
					(Number(loanAmount) * guarantor.coverage) / 100;

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
						{ status: 400 },
					);
				}

				totalGuarantorCoverage += Number(guarantor.coverage);

				guarantorDetails.push({
					userId: new ObjectId(guarantor.userId),
					fullName: `${guarantorUser.firstName} ${guarantorUser.lastName}`,
					email: guarantorUser.email,
					phone: guarantorUser.phone,
					coverage: Number(guarantor.coverage),
					coverageAmount: guarantorCoverageAmount,
					savingsBalance: totalGuarantorSavings, // Store actual savings
					investmentsBalance: totalGuarantorInvestments, // Add investments
					totalAssets: totalGuarantorAssets, // Combined total
					profession: guarantorUser.profession || "Not specified",
					relationship: guarantor.relationship || "Colleague",
					approved: false,
					invitedAt: new Date(),
					status: "pending",
				});
			}

			if (totalGuarantorCoverage > 200) {
				return NextResponse.json(
					{ error: "Total guarantor coverage cannot exceed 200%" },
					{ status: 400 },
				);
			}
		}

		// Calculate loan details with days-based interest
		const loanDetails = calculateLoanDetailsWithDays({
			loanAmount,
			durationDays,
			loanDetails: { processingFeePaid: false },
		});

		const amountReceived = loanDetails.principalDisbursed;

		// Generate repayment schedule
		const repaymentSchedule = generateRepaymentSchedule({
			loanAmount: Number(loanAmount),
			durationDays,
			monthlyInstallment: loanDetails.monthlyInstallment,
			totalLoanAmount: loanDetails.totalLoanAmount,
		});

		// Create the loan
		const newLoan = {
			userId: authResult.userId,
			loanAmount: Number(loanAmount),
			amountReceived: amountReceived,
			purpose,
			duration: durationDays,
			durationUnit: "days",
			debitFromSavings: debitFromSavings || false,
			borrowerDetails: {
				fullName: `${user.firstName} ${user.lastName}`,
				phone: user.phone || "",
				email: user.email,
				gender: user.gender || "prefer-not-to-say",
			},
			guarantorDetails: guarantorDetails,
			governmentId: governmentId || governmentIdImage || "",
			activeInvestments: investmentsArray,
			status: "pending",
			loanDetails: loanDetails,
			repaymentSchedule: repaymentSchedule,
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

		const guarantorsNeedingApproval = guarantorDetails.filter(
			(g) => g.coverage > 0,
		);
		if (guarantorsNeedingApproval.length > 0) {
			sendGuarantorInvitations(guarantorsNeedingApproval, newLoan).catch(
				(error) => {
					console.error("Failed to send guarantor invitations:", error);
				},
			);
		}

		return NextResponse.json(
			{
				message: "Loan application submitted successfully",
				loanId: result.insertedId,
				loanAmount: Number(loanAmount),
				amountReceived: amountReceived.toFixed(2),
				interestDeducted: (Number(loanAmount) - amountReceived).toFixed(2),
				processingFee: loanDetails.processingFee.toFixed(2),
				interestAmount: loanDetails.interestAmount.toFixed(2),
				durationDays: durationDays,
				repaymentStartDate: repaymentSchedule[0]?.dueDate,
				repaymentEndDate:
					repaymentSchedule[repaymentSchedule.length - 1]?.dueDate,
				numberOfPayments: repaymentSchedule.length,
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
			{ status: 201 },
		);
	} catch (error) {
		console.error("POST /api/loans error:", error);
		return NextResponse.json(
			{ error: "Internal server error: " + error.message },
			{ status: 500 },
		);
	}
}

// ==================== PATCH METHOD ====================
export async function PATCH(request) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status },
			);
		}

		const { loanId, status, action, amount } = await request.json();

		if (!loanId || !status) {
			return NextResponse.json(
				{ error: "Loan ID and status are required" },
				{ status: 400 },
			);
		}

		const { db } = await connectToDatabase();

		const loan = await db.collection("loans").findOne({
			_id: new ObjectId(loanId),
		});

		if (!loan) {
			return NextResponse.json({ error: "Loan not found" }, { status: 404 });
		}

		if (action === "liquidate") {
			return handleLiquidation(db, loan, authResult.userId);
		}

		if (action === "pay-processing-fee") {
			return handleProcessingFeePayment(db, loan, authResult.userId);
		}

		if (action === "disburse") {
			return handleDisbursement(db, loan, authResult.userId);
		}

		if (action === "make-payment") {
			return handleLoanPayment(db, loan, authResult.userId, amount);
		}

		return handleStatusUpdate(db, loan, status, authResult.userId);
	} catch (error) {
		console.error("PATCH /api/loans error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// ==================== HELPER FUNCTIONS ====================

function calculateLoanDetailsWithDays({
	loanAmount,
	durationDays,
	loanDetails,
}) {
	let interestRate;

	if (durationDays <= 7) {
		interestRate = 0.02; // 2% for 7 days
	} else if (durationDays <= 14) {
		interestRate = 0.035; // 3.5% for 14 days
	} else if (durationDays <= 30) {
		interestRate = 0.05; // 5% for 30 days
	} else if (durationDays <= 60) {
		interestRate = 0.08; // 8% for 60 days
	} else if (durationDays <= 90) {
		interestRate = 0.12; // 12% for 90 days
	} else if (durationDays <= 180) {
		interestRate = 0.18; // 18% for 180 days
	} else {
		interestRate = 0.24; // 24% for 365 days
	}

	const LOAN_PROCESSING_FEE_RATE = 0.01;
	const principalAmount = Number(loanAmount);

	const processingFee = principalAmount * LOAN_PROCESSING_FEE_RATE;
	const interestAmount = principalAmount * interestRate;
	const totalLoanAmount = principalAmount + interestAmount;

	let monthlyInstallment;
	let numberOfPayments;
	let upfrontInterestDeduction;

	if (durationDays <= 30) {
		monthlyInstallment = totalLoanAmount;
		numberOfPayments = 1;
		upfrontInterestDeduction = interestAmount * 0.3;
	} else if (durationDays <= 90) {
		numberOfPayments = Math.ceil(durationDays / 30);
		monthlyInstallment = totalLoanAmount / numberOfPayments;
		upfrontInterestDeduction = interestAmount * 0.4;
	} else {
		numberOfPayments = Math.ceil(durationDays / 30);
		monthlyInstallment = totalLoanAmount / numberOfPayments;
		upfrontInterestDeduction = interestAmount * 0.5;
	}

	const principalDisbursed = principalAmount - upfrontInterestDeduction;
	const remainingInterest = interestAmount - upfrontInterestDeduction;

	return {
		principalAmount: principalAmount,
		processingFee: processingFee,
		interestRate: interestRate,
		interestRatePercentage: interestRate * 100,
		interestAmount: interestAmount,
		upfrontInterestDeduction: upfrontInterestDeduction,
		remainingInterest: remainingInterest,
		principalDisbursed: principalDisbursed,
		totalLoanAmount: totalLoanAmount,
		monthlyInstallment: monthlyInstallment,
		numberOfPayments: numberOfPayments,
		remainingBalance: totalLoanAmount,
		paidAmount: 0,
		processingFeePaid: loanDetails.processingFeePaid || false,
		interestPaid: 0,
		upfrontInterestPaid: false,
		durationDays: durationDays,
	};
}

function generateRepaymentSchedule({
	loanAmount,
	durationDays,
	monthlyInstallment,
	totalLoanAmount,
}) {
	const schedule = [];
	const startDate = new Date();

	let numberOfPayments;
	if (durationDays <= 30) {
		numberOfPayments = 1;
	} else {
		numberOfPayments = Math.ceil(durationDays / 30);
	}

	for (let i = 0; i < numberOfPayments; i++) {
		const dueDate = new Date(startDate);
		dueDate.setDate(dueDate.getDate() + (i + 1) * 30);

		schedule.push({
			paymentNumber: i + 1,
			dueDate: dueDate,
			amount: monthlyInstallment,
			status: "pending",
			principalPortion: loanAmount / numberOfPayments,
			interestPortion: (totalLoanAmount - loanAmount) / numberOfPayments,
		});
	}

	return schedule;
}

function calculateCompleteLoanDetails(loan) {
	const LOAN_INTEREST_RATE = 0.1;
	const LOAN_PROCESSING_FEE_RATE = 0.01;

	const principalAmount = Number(loan.loanAmount);
	const duration = Number(loan.duration) || 12;

	const processingFee = principalAmount * LOAN_PROCESSING_FEE_RATE;
	const interestAmount = principalAmount * LOAN_INTEREST_RATE * (duration / 12);
	const totalLoanAmount = principalAmount + interestAmount;
	const monthlyInstallment = totalLoanAmount / duration;

	const paidAmount =
		loan.payments?.reduce((total, payment) => total + payment.amount, 0) || 0;
	const remainingBalance = Math.max(0, totalLoanAmount - paidAmount);

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

async function handleStatusUpdate(db, loan, status, userId) {
	await db
		.collection("loans")
		.updateOne({ _id: loan._id }, { $set: { status, updatedAt: new Date() } });

	if (status === "approved" && loan.status !== "approved") {
		const amountReceived =
			loan.amountReceived ||
			loan.loanAmount - loan.loanDetails.upfrontInterestDeduction;

		const user = await db.collection("users").findOne({
			_id: new ObjectId(userId),
		});

		if (user) {
			await db.collection("users").updateOne(
				{ _id: new ObjectId(userId) },
				{
					$inc: {
						savingsBalance: amountReceived,
						totalLoans: loan.loanAmount,
					},
				},
			);

			await db.collection("savings").insertOne({
				userId: userId,
				amount: amountReceived,
				type: "loan_disbursement",
				description: `Automatic loan disbursement for loan #${loan._id}`,
				currentBalance: user.savingsBalance + amountReceived,
				createdAt: new Date(),
				loanId: loan._id,
			});

			const firstPaymentDate = new Date();
			if (loan.duration <= 30) {
				firstPaymentDate.setDate(firstPaymentDate.getDate() + loan.duration);
			} else {
				firstPaymentDate.setDate(firstPaymentDate.getDate() + 30);
			}

			await db.collection("loans").updateOne(
				{ _id: loan._id },
				{
					$set: {
						disbursedAt: new Date(),
						"loanDetails.processingFeePaid": true,
						firstPaymentDue: firstPaymentDate,
					},
					$push: {
						payments: {
							amount: amountReceived,
							type: "disbursement",
							date: new Date(),
							description: "Automatic loan disbursement to savings",
						},
					},
				},
			);

			await sendDisbursementEmail(loan, amountReceived);
		}
	}

	if (loan.status === "approved" && status !== "approved") {
		await db
			.collection("users")
			.updateOne(
				{ _id: new ObjectId(userId) },
				{ $inc: { totalLoans: -Number(loan.loanAmount) } },
			);
	}

	return NextResponse.json({
		message: "Loan status updated successfully",
	});
}

async function handleLiquidation(db, loan, userId) {
	if (loan.status !== "approved") {
		return NextResponse.json(
			{ error: "Only approved loans can be liquidated" },
			{ status: 400 },
		);
	}

	const now = new Date();
	const approvalDate = new Date(loan.updatedAt);
	const daysPassed = Math.floor((now - approvalDate) / (1000 * 60 * 60 * 24));

	if (daysPassed < 180) {
		// 180 days = 6 months
		return NextResponse.json(
			{ error: "Loan can only be liquidated after 6 months" },
			{ status: 400 },
		);
	}

	const halfCredit = loan.loanDetails.remainingBalance / 2;

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
		},
	);

	await db
		.collection("users")
		.updateOne(
			{ _id: new ObjectId(userId) },
			{ $inc: { totalLoans: -Number(halfCredit) } },
		);

	return NextResponse.json({
		message: "Loan liquidated successfully",
		creditAmount: halfCredit.toFixed(2),
	});
}

async function handleProcessingFeePayment(db, loan, userId) {
	if (loan.status !== "approved") {
		return NextResponse.json(
			{ error: "Processing fee can only be paid for approved loans" },
			{ status: 400 },
		);
	}

	if (loan.loanDetails.processingFeePaid) {
		return NextResponse.json(
			{ error: "Processing fee already paid" },
			{ status: 400 },
		);
	}

	await db.collection("loans").updateOne(
		{ _id: loan._id, userId },
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
		},
	);

	return NextResponse.json({
		message: "Processing fee paid successfully",
		processingFee: loan.loanDetails.processingFee,
	});
}

async function handleDisbursement(db, loan, userId) {
	if (loan.status !== "approved") {
		return NextResponse.json(
			{ error: "Only approved loans can be disbursed" },
			{ status: 400 },
		);
	}

	if (loan.disbursedAt) {
		return NextResponse.json(
			{ error: "Loan has already been disbursed" },
			{ status: 400 },
		);
	}

	const user = await db.collection("users").findOne({
		_id: new ObjectId(userId),
	});

	if (!user) {
		return NextResponse.json({ error: "User not found" }, { status: 404 });
	}

	const amountReceived =
		loan.amountReceived || loan.loanDetails.principalDisbursed;

	await db.collection("users").updateOne(
		{ _id: new ObjectId(userId) },
		{
			$inc: {
				savingsBalance: amountReceived,
				totalLoans: loan.loanAmount,
			},
		},
	);

	await db.collection("savings").insertOne({
		userId: userId,
		amount: amountReceived,
		type: "loan_disbursement",
		description: `Loan disbursement for ${loan.duration} days`,
		currentBalance: user.savingsBalance + amountReceived,
		createdAt: new Date(),
		loanId: loan._id,
	});

	const firstPaymentDate = new Date();
	if (loan.duration <= 30) {
		firstPaymentDate.setDate(firstPaymentDate.getDate() + loan.duration);
	} else {
		firstPaymentDate.setDate(firstPaymentDate.getDate() + 30);
	}

	await db.collection("loans").updateOne(
		{ _id: loan._id },
		{
			$set: {
				disbursedAt: new Date(),
				"loanDetails.processingFeePaid": true,
				updatedAt: new Date(),
				status: "active",
				firstPaymentDue: firstPaymentDate,
			},
			$push: {
				payments: {
					amount: amountReceived,
					type: "disbursement",
					date: new Date(),
					description: "Loan disbursement to savings",
				},
			},
		},
	);

	await sendDisbursementEmail(loan, amountReceived);

	return NextResponse.json({
		message: "Loan disbursed successfully",
		amountReceived: amountReceived,
		newSavingsBalance: user.savingsBalance + amountReceived,
		firstPaymentDue: firstPaymentDate,
	});
}

async function handleLoanPayment(db, loan, userId, paymentAmount) {
	if (loan.status !== "active") {
		return NextResponse.json(
			{ error: "Only active loans can accept payments" },
			{ status: 400 },
		);
	}

	const user = await db.collection("users").findOne({
		_id: new ObjectId(userId),
	});

	if (!user || user.savingsBalance < paymentAmount) {
		return NextResponse.json(
			{ error: "Insufficient savings balance" },
			{ status: 400 },
		);
	}

	await db
		.collection("users")
		.updateOne(
			{ _id: new ObjectId(userId) },
			{ $inc: { savingsBalance: -paymentAmount } },
		);

	const newRemainingBalance = loan.loanDetails.remainingBalance - paymentAmount;
	const newPaidAmount = (loan.loanDetails.paidAmount || 0) + paymentAmount;

	await db.collection("loans").updateOne(
		{ _id: loan._id },
		{
			$set: {
				"loanDetails.remainingBalance": newRemainingBalance,
				"loanDetails.paidAmount": newPaidAmount,
				updatedAt: new Date(),
			},
			$push: {
				payments: {
					amount: paymentAmount,
					type: "repayment",
					date: new Date(),
					description: "Loan repayment",
				},
			},
		},
	);

	const updatedSchedule = loan.repaymentSchedule.map((payment) => {
		if (payment.status === "pending") {
			return {
				...payment,
				status: "paid",
				paidDate: new Date(),
				paidAmount: payment.amount,
			};
		}
		return payment;
	});

	await db
		.collection("loans")
		.updateOne(
			{ _id: loan._id },
			{ $set: { repaymentSchedule: updatedSchedule } },
		);

	if (newRemainingBalance <= 0) {
		await db
			.collection("loans")
			.updateOne(
				{ _id: loan._id },
				{ $set: { status: "completed", completedAt: new Date() } },
			);

		await db
			.collection("users")
			.updateOne(
				{ _id: new ObjectId(userId) },
				{ $inc: { totalLoans: -loan.loanAmount } },
			);
	}

	return NextResponse.json({
		message: "Payment processed successfully",
		paymentAmount: paymentAmount,
		remainingBalance: newRemainingBalance,
		loanStatus: newRemainingBalance <= 0 ? "completed" : "active",
	});
}

async function sendGuarantorInvitations(guarantors, loan) {
	try {
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
		return true;
	} catch (error) {
		console.error("Error sending guarantor invitations:", error);
		return false;
	}
}

async function sendDisbursementEmail(loan, amountReceived) {
	console.log(`Sending disbursement email to ${loan.borrowerDetails.email}`);

	try {
		const transporter = nodemailer.createTransport({
			service: "gmail",
			auth: {
				user: process.env.EMAIL_USER,
				pass: process.env.EMAIL_PASSWORD,
			},
		});

		await transporter.sendMail({
			from: `"Fincare CMS" <${process.env.EMAIL_FROM}>`,
			to: loan.borrowerDetails.email,
			subject: "Your Loan Has Been Disbursed",
			html: `
				<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
					<h2 style="color: #333;">Hello ${loan.borrowerDetails.fullName}!</h2>
					<p>Your loan has been <strong>disbursed</strong> to your savings account.</p>
					
					<div style="background-color: #e8f5e9; padding: 15px; border-radius: 5px; margin: 15px 0;">
						<h3 style="color: #2e7d32; margin-top: 0;">Disbursement Details</h3>
						<p><strong>Loan Amount:</strong> ₦${loan.loanAmount.toLocaleString()}</p>
						<p><strong>Interest Deducted Upfront:</strong> ₦${loan.loanDetails.upfrontInterestDeduction.toLocaleString()}</p>
						<p><strong>Amount Credited to Savings:</strong> ₦${amountReceived.toLocaleString()}</p>
						<p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
					</div>
					
					<div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;">
						<h3 style="margin-top: 0;">Repayment Summary</h3>
						<p><strong>Total to Repay:</strong> ₦${loan.loanDetails.totalLoanAmount.toLocaleString()}</p>
						<p><strong>Monthly Installment:</strong> ₦${loan.loanDetails.monthlyInstallment.toLocaleString()}</p>
						<p><strong>Duration:</strong> ${loan.duration} days</p>
						<p><strong>First Payment Due:</strong> ${new Date(loan.firstPaymentDue).toLocaleDateString()}</p>
					</div>
					
					<p style="margin-top: 20px;">
						Please ensure you make your monthly payments on time to avoid penalties.
					</p>
					
					<hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
					<p style="color: #888; font-size: 12px;">
						If you have any questions, please contact support at support@fincare.com.
					</p>
				</div>
			`,
		});

		console.log("Disbursement email sent successfully");
		return true;
	} catch (error) {
		console.error("Error sending disbursement email:", error);
		return false;
	}
}
