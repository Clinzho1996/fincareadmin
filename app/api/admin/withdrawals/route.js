// app/api/admin/withdrawals/route.js - UPDATED VERSION
import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

// GET - Get withdrawals with filtering (admin)
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

		// Check if user is admin
		const user = await db
			.collection("users")
			.findOne({ _id: new ObjectId(authResult.userId) });

		if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
			return NextResponse.json(
				{ error: "Admin access required" },
				{ status: 403 }
			);
		}

		const { searchParams } = new URL(request.url);
		const status = searchParams.get("status");
		const userId = searchParams.get("userId");
		const page = parseInt(searchParams.get("page")) || 1;
		const limit = parseInt(searchParams.get("limit")) || 10;

		console.log("🔍 ADMIN WITHDRAWALS API - Query params:", {
			status,
			userId,
			page,
			limit,
		});

		// Build query
		const query = {};
		if (status && status !== "all") {
			query.status = status;
		}
		if (userId) {
			// FIX: Handle both string and ObjectId formats
			try {
				query.userId = new ObjectId(userId);
			} catch (error) {
				// If ObjectId conversion fails, try as string
				query.userId = userId;
				console.log("🔍 UserId treated as string:", error);
			}
		}

		console.log("🔍 Final query:", query);

		const withdrawals = await db
			.collection("withdrawals")
			.aggregate([
				{ $match: query },
				{ $sort: { createdAt: -1 } },
				{ $skip: (page - 1) * limit },
				{ $limit: limit },
				{
					$lookup: {
						from: "users",
						localField: "userId",
						foreignField: "_id",
						as: "user",
					},
				},
				{
					$unwind: {
						path: "$user",
						preserveNullAndEmptyArrays: true,
					},
				},
				{
					$project: {
						amount: 1,
						status: 1,
						accountName: 1,
						bankName: 1,
						accountNumber: 1,
						routingNumber: 1,
						notes: 1,
						createdAt: 1,
						updatedAt: 1,
						userId: 1,
						"user.firstName": 1,
						"user.lastName": 1,
						"user.email": 1,
						"user.phone": 1,
					},
				},
			])
			.toArray();

		const total = await db.collection("withdrawals").countDocuments(query);

		console.log("🔍 Found withdrawals:", withdrawals.length);

		return NextResponse.json({
			withdrawals,
			pagination: {
				page,
				limit,
				total,
				pages: Math.ceil(total / limit),
			},
		});
	} catch (error) {
		console.error("GET /api/admin/withdrawals error:", error);
		return NextResponse.json(
			{ error: "Internal server error: " + error.message },
			{ status: 500 }
		);
	}
}

// In your app/api/admin/withdrawals/route.js - PATCH method
export async function PATCH(request) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}

		const { db } = await connectToDatabase();

		// Check if user is admin
		const user = await db
			.collection("users")
			.findOne({ _id: new ObjectId(authResult.userId) });

		if (!user || user.role !== "super_admin") {
			return NextResponse.json(
				{ error: "Admin access required" },
				{ status: 403 }
			);
		}

		const { withdrawalId, action, notes } = await request.json();

		if (!withdrawalId || !action) {
			return NextResponse.json(
				{ error: "Withdrawal ID and action are required" },
				{ status: 400 }
			);
		}

		if (!["approve", "reject"].includes(action)) {
			return NextResponse.json(
				{ error: "Action must be 'approve' or 'reject'" },
				{ status: 400 }
			);
		}

		// Find the withdrawal
		const withdrawal = await db
			.collection("withdrawals")
			.findOne({ _id: new ObjectId(withdrawalId) });

		if (!withdrawal) {
			return NextResponse.json(
				{ error: "Withdrawal not found" },
				{ status: 404 }
			);
		}

		if (withdrawal.status !== "pending") {
			return NextResponse.json(
				{ error: "Withdrawal is not pending" },
				{ status: 400 }
			);
		}

		const updateData = {
			status: action === "approve" ? "approved" : "rejected",
			updatedAt: new Date(),
			processedBy: {
				adminId: authResult.userId,
				adminEmail: user.email,
				timestamp: new Date(),
			},
		};

		if (notes) {
			updateData.adminNotes = notes;
		}

		if (action === "reject") {
			updateData.rejectionReason = notes || "Rejected by admin";
		}

		// Start a session for transaction
		const session = db.client.startSession();

		try {
			await session.withTransaction(async () => {
				if (action === "approve") {
					// ✅ DEDUCT AMOUNT ONLY WHEN APPROVED
					// Check if user still has sufficient balance
					const currentUser = await db
						.collection("users")
						.findOne({ _id: withdrawal.userId }, { session });

					if (!currentUser) {
						throw new Error("User not found");
					}

					if (currentUser.savingsBalance < withdrawal.amount) {
						throw new Error("User no longer has sufficient balance");
					}

					// Deduct the amount from user's savings balance
					await db
						.collection("users")
						.updateOne(
							{ _id: withdrawal.userId },
							{ $inc: { savingsBalance: -withdrawal.amount } },
							{ session }
						);

					// Create a transaction record
					const transaction = {
						userId: withdrawal.userId,
						type: "withdrawal",
						amount: withdrawal.amount,
						status: "completed",
						description: `Withdrawal to ${withdrawal.bankName} - ${withdrawal.accountNumber}`,
						reference: `WD${Date.now()}`,
						createdAt: new Date(),
						updatedAt: new Date(),
					};

					await db
						.collection("transactions")
						.insertOne(transaction, { session });
				} else if (action === "reject") {
					// For rejected withdrawals, no balance change needed since we never deducted
					// Just create a rejection record
					const transaction = {
						userId: withdrawal.userId,
						type: "withdrawal_rejected",
						amount: withdrawal.amount,
						status: "cancelled",
						description: `Withdrawal rejected - ${withdrawal.bankName}`,
						reference: `WDR${Date.now()}`,
						createdAt: new Date(),
						updatedAt: new Date(),
					};

					await db
						.collection("transactions")
						.insertOne(transaction, { session });
				}

				// Update withdrawal status
				await db
					.collection("withdrawals")
					.updateOne(
						{ _id: new ObjectId(withdrawalId) },
						{ $set: updateData },
						{ session }
					);
			});
		} finally {
			await session.endSession();
		}

		return NextResponse.json({
			status: "success",
			message: `Withdrawal ${
				action === "approve" ? "approved" : "rejected"
			} successfully`,
		});
	} catch (error) {
		console.error("PATCH /api/admin/withdrawals error:", error);
		return NextResponse.json(
			{ error: "Internal server error: " + error.message },
			{ status: 500 }
		);
	}
}
