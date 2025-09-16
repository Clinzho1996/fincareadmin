// app/api/admin/savings/route.js
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

// app/api/admin/savings/route.js - GET method
export async function GET(request) {
	try {
		const token = await getToken({ req: request });

		if (!token || (token.role !== "admin" && token.role !== "super_admin")) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
		}

		const { searchParams } = new URL(request.url);
		const userId = searchParams.get("userId");
		const status = searchParams.get("status") || "all";
		const page = parseInt(searchParams.get("page")) || 1;
		const limit = parseInt(searchParams.get("limit")) || 10;

		console.log("Fetching savings for user:", userId, "status:", status); // Debug log

		const { db } = await connectToDatabase();
		const skip = (page - 1) * limit;

		// Build filter query
		let filter = {};
		if (userId) {
			filter.userId = {
				$in: [userId, new ObjectId(userId)],
			};
		}

		if (status !== "all") {
			filter.status = status;
		}

		console.log("MongoDB filter:", filter); // Debug log

		// Get savings with pagination
		const savings = await db
			.collection("savings")
			.find(filter)
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limit)
			.toArray();

		// Get total count for pagination
		const total = await db.collection("savings").countDocuments(filter);

		console.log("Found savings:", savings.length, "total:", total); // Debug log

		return NextResponse.json({
			status: "success",
			data: {
				savings,
				pagination: {
					page,
					limit,
					total,
					pages: Math.ceil(total / limit),
				},
			},
		});
	} catch (error) {
		console.error("GET /api/admin/savings error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

// app/api/admin/savings/route.js - Update the PATCH method
export async function PATCH(request) {
	try {
		const token = await getToken({ req: request });

		if (!token || (token.role !== "admin" && token.role !== "super_admin")) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
		}

		const { savingId, action, amount, notes } = await request.json();

		if (!savingId || !action) {
			return NextResponse.json(
				{ error: "Saving ID and action are required" },
				{ status: 400 }
			);
		}

		const { db } = await connectToDatabase();

		// Find the saving record
		const saving = await db.collection("savings").findOne({
			_id: new ObjectId(savingId),
		});

		if (!saving) {
			return NextResponse.json(
				{ error: "Saving record not found" },
				{ status: 404 }
			);
		}

		let updateData = {};
		let userUpdate = {};

		switch (action) {
			case "verify":
				if (saving.status === "verified") {
					return NextResponse.json(
						{ error: "Saving is already verified" },
						{ status: 400 }
					);
				}

				// Get the amount to add to user's balance
				const depositAmount = saving.amount || saving.currentBalance || 0;

				updateData = {
					status: "verified",
					verifiedAt: new Date(),
					verifiedBy: token.id,
					notes: notes || saving.notes,
				};

				// Add amount to user's savings balance
				userUpdate = {
					$inc: {
						savingsBalance: depositAmount,
						totalSavings: depositAmount,
					},
				};
				break;

			case "reject":
				updateData = {
					status: "rejected",
					rejectedAt: new Date(),
					rejectedBy: token.id,
					rejectionReason: notes || "No reason provided",
				};
				break;

			case "update_amount":
				if (!amount || amount <= 0) {
					return NextResponse.json(
						{ error: "Valid amount is required" },
						{ status: 400 }
					);
				}
				updateData = {
					amount: Number(amount),
					currentBalance: Number(amount),
					updatedAt: new Date(),
				};
				break;

			default:
				return NextResponse.json({ error: "Invalid action" }, { status: 400 });
		}

		// Update saving record
		await db
			.collection("savings")
			.updateOne({ _id: new ObjectId(savingId) }, { $set: updateData });

		// Update user balance if verifying
		if (action === "verify") {
			await db
				.collection("users")
				.updateOne({ _id: new ObjectId(saving.userId) }, userUpdate);
		}

		return NextResponse.json({
			status: "success",
			message: `Saving ${action}ed successfully`,
		});
	} catch (error) {
		console.error("PATCH /api/admin/savings error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

// app/api/admin/savings/route.js
export async function POST(request) {
	try {
		const token = await getToken({ req: request });

		if (!token || (token.role !== "admin" && token.role !== "super_admin")) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
		}

		const { userId, amount, reason, notes } = await request.json();

		console.log("Received savings data:", { userId, amount, reason, notes }); // Debug log

		if (!userId || !amount || amount <= 0) {
			return NextResponse.json(
				{ error: "User ID and valid amount are required" },
				{ status: 400 }
			);
		}

		const { db } = await connectToDatabase();

		// Verify user exists
		const user = await db.collection("users").findOne({
			_id: new ObjectId(userId),
		});

		if (!user) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		// Create saving record
		const newSaving = {
			userId: new ObjectId(userId),
			amount: Number(amount),
			currentBalance: Number(amount),
			reason: reason || "Manual savings deposit",
			type: "manual_deposit",
			status: "verified",
			verifiedAt: new Date(),
			verifiedBy: token.id,
			notes: notes || "Admin manual deposit",
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		console.log("Creating new savings record:", newSaving); // Debug log

		const result = await db.collection("savings").insertOne(newSaving);

		// Update user's savings balance
		await db.collection("users").updateOne(
			{ _id: new ObjectId(userId) },
			{
				$inc: {
					savingsBalance: Number(amount),
					totalSavings: Number(amount),
				},
			}
		);

		console.log("Savings created successfully, ID:", result.insertedId); // Debug log

		return NextResponse.json(
			{
				status: "success",
				message: "Manual savings deposit created successfully",
				savingId: result.insertedId,
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error("POST /api/admin/savings error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
