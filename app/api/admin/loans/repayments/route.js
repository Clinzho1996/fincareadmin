// app/api/admin/loans/repayments/route.js - UPDATED VERSION
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

// Helper function for admin authentication
async function adminOnly(request) {
	const token = await getToken({ req: request });

	if (!token || (token.role !== "super_admin" && token.role !== "admin")) {
		return { error: "Unauthorized. Admin access required.", status: 403 };
	}

	return { userId: token.sub, role: token.role };
}

// GET - Get all repayments for admin review
export async function GET(request) {
	try {
		console.log("=== ADMIN REPAYMENTS API CALLED ===");

		const authResult = await adminOnly(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}

		const { searchParams } = new URL(request.url);
		const status = searchParams.get("status") || "pending_review";
		const page = parseInt(searchParams.get("page")) || 1;
		const limit = parseInt(searchParams.get("limit")) || 10;
		const loanId = searchParams.get("loanId");

		console.log("Admin repayments query:", { status, page, limit, loanId });

		const { db } = await connectToDatabase();

		// Build match query
		const matchQuery = { status };
		if (loanId) {
			matchQuery.loanId = new ObjectId(loanId);
		}

		// Debug: Check all collections
		const collections = await db.listCollections().toArray();
		console.log(
			"Available collections:",
			collections.map((c) => c.name)
		);

		// Check both possible collection names
		const loanRepaymentsCount = await db
			.collection("loan_repayments")
			.countDocuments({});
		const repaymentsCount = await db
			.collection("repayments")
			.countDocuments({});

		console.log("loan_repayments count:", loanRepaymentsCount);
		console.log("repayments count:", repaymentsCount);

		// Use the correct collection (loan_repayments based on your POST endpoint)
		const repayments = await db
			.collection("loan_repayments")
			.aggregate([
				{ $match: matchQuery },
				{ $sort: { submittedAt: -1 } },
				{ $skip: (page - 1) * limit },
				{ $limit: limit },
				{
					$lookup: {
						from: "loans",
						localField: "loanId",
						foreignField: "_id",
						as: "loan",
					},
				},
				{
					$lookup: {
						from: "users",
						localField: "userId",
						foreignField: "_id",
						as: "user",
					},
				},
				{
					$project: {
						_id: 1,
						amount: 1,
						proofImage: 1,
						status: 1,
						submittedAt: 1,
						reviewedAt: 1,
						reviewNotes: 1,
						fileName: 1,
						"loan._id": 1,
						"loan.loanAmount": 1,
						"loan.purpose": 1,
						"loan.loanDetails": 1,
						"loan.borrowerDetails": 1,
						"user._id": 1,
						"user.firstName": 1,
						"user.lastName": 1,
						"user.email": 1,
					},
				},
			])
			.toArray();

		console.log(`Found ${repayments.length} repayments with status: ${status}`);

		const total = await db
			.collection("loan_repayments")
			.countDocuments(matchQuery);

		return NextResponse.json({
			status: "success",
			repayments,
			pagination: {
				page,
				limit,
				total,
				pages: Math.ceil(total / limit),
			},
			debug: {
				collection: "loan_repayments",
				totalInCollection: loanRepaymentsCount,
				query: matchQuery,
			},
		});
	} catch (error) {
		console.error("Admin GET repayments error:", error);
		return NextResponse.json(
			{ error: "Internal server error: " + error.message },
			{ status: 500 }
		);
	}
}

// PATCH - Update repayment status (approve/reject)
export async function PATCH(request) {
	try {
		const authResult = await adminOnly(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}

		const { repaymentId, status, reviewNotes } = await request.json();

		console.log("Admin PATCH repayment:", { repaymentId, status });

		if (!repaymentId || !status || !["approved", "rejected"].includes(status)) {
			return NextResponse.json(
				{ error: "Valid repayment ID and status are required" },
				{ status: 400 }
			);
		}

		const { db } = await connectToDatabase();

		// Find repayment
		const repayment = await db.collection("loan_repayments").findOne({
			_id: new ObjectId(repaymentId),
		});

		if (!repayment) {
			return NextResponse.json(
				{ error: "Repayment not found" },
				{ status: 404 }
			);
		}

		console.log("Found repayment to update:", repayment._id);

		// Update repayment status
		const updateData = {
			status,
			reviewedAt: new Date(),
			reviewedBy: new ObjectId(authResult.userId),
			updatedAt: new Date(),
		};

		if (reviewNotes) updateData.reviewNotes = reviewNotes;

		await db
			.collection("loan_repayments")
			.updateOne({ _id: new ObjectId(repaymentId) }, { $set: updateData });

		// If approved, update loan balance and create payment record
		if (status === "approved") {
			// Get the loan to calculate remaining balance
			const loan = await db.collection("loans").findOne({
				_id: repayment.loanId,
			});

			if (loan) {
				console.log("Updating loan after repayment approval:", loan._id);

				const currentBalance =
					loan.loanDetails?.remainingBalance ||
					loan.loanDetails?.totalLoanAmount;
				const newBalance = Math.max(0, currentBalance - repayment.amount);

				// Update loan balance and status
				const updateLoanData = {
					"loanDetails.remainingBalance": newBalance,
					"loanDetails.paidAmount":
						(loan.loanDetails?.paidAmount || 0) + repayment.amount,
					updatedAt: new Date(),
				};

				// If fully paid, mark as completed
				if (newBalance <= 0) {
					updateLoanData.status = "completed";
				} else {
					updateLoanData.status = "active";
				}

				await db.collection("loans").updateOne(
					{ _id: repayment.loanId },
					{
						$set: updateLoanData,
						$push: {
							payments: {
								amount: repayment.amount,
								type: "repayment",
								date: new Date(),
								description: "Monthly loan repayment",
								repaymentId: repayment._id,
							},
						},
					}
				);

				console.log("Loan updated successfully");
			}
		}

		return NextResponse.json({
			status: "success",
			message: `Repayment ${status} successfully`,
		});
	} catch (error) {
		console.error("Admin PATCH repayment error:", error);
		return NextResponse.json(
			{ error: "Internal server error: " + error.message },
			{ status: 500 }
		);
	}
}
