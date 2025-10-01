// app/api/admin/customers/[id]/route.js
export const dynamic = "force-dynamic";

import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

// GET customer by ID with complete stats
export async function GET(request, { params }) {
	try {
		// First authenticate with your custom middleware
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}

		// Then check if user is admin using NextAuth token
		const token = await getToken({ req: request });
		if (!token || (token.role !== "super_admin" && token.role !== "admin")) {
			return NextResponse.json(
				{ error: "Unauthorized. Admin access required." },
				{ status: 403 }
			);
		}

		const { db } = await connectToDatabase();
		const { id } = params;

		console.log(`=== GETTING CUSTOMER DETAILS FOR: ${id} ===`);

		const user = await db
			.collection("users")
			.findOne(
				{ _id: new ObjectId(id) },
				{ projection: { password: 0, otp: 0 } }
			);

		if (!user) {
			return NextResponse.json(
				{ error: "Customer not found" },
				{ status: 404 }
			);
		}

		// Get user stats (similar to the main customers endpoint)
		const userIdObjectId = user._id;
		const userIdString = user._id.toString();

		console.log("User ID formats:", {
			objectId: userIdObjectId,
			string: userIdString,
		});

		// Query savings
		const savings = await db
			.collection("savings")
			.find({
				userId: {
					$in: [userIdObjectId, userIdString],
				},
			})
			.toArray();
		console.log(`Found ${savings.length} savings accounts`);

		// Query investments
		const investments = await db
			.collection("investments")
			.find({
				userId: {
					$in: [userIdObjectId, userIdString],
				},
			})
			.toArray();
		console.log(`Found ${investments.length} investments`);

		// Query loans - FIXED: Check all loans
		const loans = await db
			.collection("loans")
			.find({
				userId: {
					$in: [userIdObjectId, userIdString],
				},
			})
			.toArray();
		console.log(`Found ${loans.length} total loans`);

		// Debug loan details
		loans.forEach((loan, index) => {
			console.log(`Loan ${index}:`, {
				id: loan._id,
				status: loan.status,
				amount: loan.loanAmount,
				userId: loan.userId,
				userIdType: typeof loan.userId,
				userIdConstructor: loan.userId?.constructor?.name,
			});
		});

		// Query auctions
		const auctions = await db
			.collection("auctions")
			.find({
				userId: {
					$in: [userIdObjectId, userIdString],
				},
			})
			.toArray();
		console.log(`Found ${auctions.length} auctions`);

		// Calculate totals
		const totalSavings = savings.reduce(
			(sum, s) => sum + Number(s.currentBalance || 0),
			0
		);
		const totalInvestment = investments.reduce(
			(sum, i) => sum + Number(i.amount || 0),
			0
		);

		// FIXED: Count loans that are considered "active" for business purposes
		// These statuses should count toward the total loan amount
		const activeLoanStatuses = [
			"approved",
			"active",
			"payment_pending",
			"completed",
		];
		const activeLoans = loans.filter((loan) =>
			activeLoanStatuses.includes(loan.status)
		);

		// FIXED: Use active loans for total amount calculation
		const totalLoans = activeLoans.reduce(
			(sum, l) => sum + Number(l.loanAmount || 0),
			0
		);

		const totalAuctions = auctions.length;

		// Get detailed loan information for the customer
		const detailedLoans = await Promise.all(
			loans.map(async (loan) => {
				// Get repayment history for this loan
				const repayments = await db
					.collection("loan_repayments")
					.find({ loanId: loan._id })
					.sort({ submittedAt: -1 })
					.toArray();

				return {
					_id: loan._id,
					loanAmount: loan.loanAmount,
					purpose: loan.purpose,
					duration: loan.duration,
					status: loan.status,
					createdAt: loan.createdAt,
					updatedAt: loan.updatedAt,
					loanDetails: loan.loanDetails || {},
					repayments: repayments,
					repaymentsCount: repayments.length,
					totalRepaid: repayments.reduce(
						(sum, r) => sum + Number(r.amount || 0),
						0
					),
				};
			})
		);

		// Get recent transactions
		const recentTransactions = await db
			.collection("transactions")
			.find({ userId: { $in: [userIdObjectId, userIdString] } })
			.sort({ createdAt: -1 })
			.limit(10)
			.toArray();

		console.log(`Customer ${user._id} stats:`, {
			totalSavings,
			totalInvestment,
			totalLoans,
			totalAuctions,
			loansCount: loans.length,
			activeLoansCount: activeLoans.length,
			loanStatuses: loans.map((l) => l.status),
		});

		return NextResponse.json({
			status: "success",
			data: {
				...user,
				stats: {
					totalSavings,
					totalInvestment,
					totalLoans,
					totalAuctions,
					savingsCount: savings.length,
					investmentsCount: investments.length,
					loansCount: loans.length,
					activeLoansCount: activeLoans.length,
					auctionsCount: auctions.length,
				},
				detailedLoans,
				recentTransactions,
				savingsAccounts: savings,
				investments: investments,
				auctions: auctions,
			},
		});
	} catch (error) {
		console.error("GET /api/admin/customers/[id] error:", error);
		return NextResponse.json(
			{ error: "Internal server error: " + error.message },
			{ status: 500 }
		);
	}
}

// UPDATE customer
export async function PUT(request, { params }) {
	try {
		// First authenticate with your custom middleware
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}

		// Then check if user is admin using NextAuth token
		const token = await getToken({ req: request });
		if (!token || (token.role !== "super_admin" && token.role !== "admin")) {
			return NextResponse.json(
				{ error: "Unauthorized. Admin access required." },
				{ status: 403 }
			);
		}

		const { db } = await connectToDatabase();
		const { id } = params;
		const body = await request.json();

		// Extract allowed fields to update
		const {
			firstName,
			lastName,
			email,
			phone,
			address,
			gender,
			accountNumber,
			bank,
		} = body;

		const updateData = {};
		if (firstName) updateData.firstName = firstName;
		if (lastName) updateData.lastName = lastName;
		if (email) updateData.email = email;
		if (phone) updateData.phone = phone;
		if (address) updateData.address = address;
		if (gender) updateData.gender = gender;
		if (accountNumber) updateData.accountNumber = accountNumber;
		if (bank) updateData.bank = bank;

		updateData.updatedAt = new Date();

		const result = await db
			.collection("users")
			.updateOne({ _id: new ObjectId(id) }, { $set: updateData });

		if (result.matchedCount === 0) {
			return NextResponse.json(
				{ error: "Customer not found" },
				{ status: 404 }
			);
		}

		return NextResponse.json({
			status: "success",
			message: "Customer updated successfully",
		});
	} catch (error) {
		console.error("PUT /api/admin/customers/[id] error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

// DELETE customer
export async function DELETE(request, { params }) {
	try {
		// First authenticate with your custom middleware
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}

		// Then check if user is admin using NextAuth token
		const token = await getToken({ req: request });
		if (!token || (token.role !== "super_admin" && token.role !== "admin")) {
			return NextResponse.json(
				{ error: "Unauthorized. Admin access required." },
				{ status: 403 }
			);
		}

		const { db } = await connectToDatabase();
		const { id } = params;

		const result = await db
			.collection("users")
			.deleteOne({ _id: new ObjectId(id) });

		if (result.deletedCount === 0) {
			return NextResponse.json(
				{ error: "Customer not found" },
				{ status: 404 }
			);
		}

		return NextResponse.json({
			status: "success",
			message: "Customer deleted successfully",
		});
	} catch (error) {
		console.error("DELETE /api/admin/customers/[id] error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

// PATCH customer (for suspend/reactivate)
export async function PATCH(request, { params }) {
	try {
		// First authenticate with your custom middleware
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}

		// Then check if user is admin using NextAuth token
		const token = await getToken({ req: request });
		if (!token || (token.role !== "super_admin" && token.role !== "admin")) {
			return NextResponse.json(
				{ error: "Unauthorized. Admin access required." },
				{ status: 403 }
			);
		}

		const { db } = await connectToDatabase();
		const { id } = params;
		const body = await request.json();
		const { action } = body;

		let updateData = {};
		if (action === "suspend") {
			updateData.membershipStatus = "suspended";
		} else if (action === "reactivate") {
			updateData.membershipStatus = "approved";
		} else {
			return NextResponse.json({ error: "Invalid action" }, { status: 400 });
		}

		updateData.updatedAt = new Date();

		const result = await db
			.collection("users")
			.updateOne({ _id: new ObjectId(id) }, { $set: updateData });

		if (result.matchedCount === 0) {
			return NextResponse.json(
				{ error: "Customer not found" },
				{ status: 404 }
			);
		}

		return NextResponse.json({
			status: "success",
			message: `Customer ${action}ed successfully`,
		});
	} catch (error) {
		console.error("PATCH /api/admin/customers/[id] error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
