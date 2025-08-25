// app/api/admin/withdrawals/[id]/route.js
import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

// GET - Get specific withdrawal (admin)
export async function GET(request, { params }) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}

		// Check if user is admin
		const { db } = await connectToDatabase();
		const user = await db
			.collection("users")
			.findOne({ _id: authResult.userId });

		if (!user || user.role !== "admin") {
			return NextResponse.json(
				{ error: "Admin access required" },
				{ status: 403 }
			);
		}

		const { id } = params;

		if (!ObjectId.isValid(id)) {
			return NextResponse.json(
				{ error: "Invalid withdrawal ID" },
				{ status: 400 }
			);
		}

		const withdrawal = await db
			.collection("withdrawals")
			.aggregate([
				{ $match: { _id: new ObjectId(id) } },
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
						amount: 1,
						status: 1,
						accountName: 1,
						bankName: 1,
						accountNumber: 1,
						routingNumber: 1,
						notes: 1,
						createdAt: 1,
						updatedAt: 1,
						"user.firstName": 1,
						"user.lastName": 1,
						"user.email": 1,
						"user.phone": 1,
						"user.savingsBalance": 1,
					},
				},
			])
			.next();

		if (!withdrawal) {
			return NextResponse.json(
				{ error: "Withdrawal not found" },
				{ status: 404 }
			);
		}

		return NextResponse.json({ withdrawal });
	} catch (error) {
		console.error("GET /api/auth/withdrawals error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

// PUT - Update withdrawal status (admin)
export async function PUT(request, { params }) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}

		// Check if user is admin
		const { db } = await connectToDatabase();
		const user = await db
			.collection("users")
			.findOne({ _id: authResult.userId });

		if (!user || user.role !== "admin") {
			return NextResponse.json(
				{ error: "Admin access required" },
				{ status: 403 }
			);
		}

		const { id } = params;

		if (!ObjectId.isValid(id)) {
			return NextResponse.json(
				{ error: "Invalid withdrawal ID" },
				{ status: 400 }
			);
		}

		const { status, adminNotes } = await request.json();

		if (
			!status ||
			!["approved", "rejected", "processing", "completed"].includes(status)
		) {
			return NextResponse.json(
				{ error: "Valid status is required" },
				{ status: 400 }
			);
		}

		// Check if withdrawal exists
		const withdrawal = await db.collection("withdrawals").findOne({
			_id: new ObjectId(id),
		});

		if (!withdrawal) {
			return NextResponse.json(
				{ error: "Withdrawal not found" },
				{ status: 404 }
			);
		}

		const updateData = {
			status,
			updatedAt: new Date(),
			processedAt: new Date(),
			processedBy: authResult.userId,
		};

		if (adminNotes) updateData.adminNotes = adminNotes;

		await db
			.collection("withdrawals")
			.updateOne({ _id: new ObjectId(id) }, { $set: updateData });

		// If rejected, return the reserved amount to user's savings
		if (status === "rejected") {
			await db
				.collection("users")
				.updateOne(
					{ _id: withdrawal.userId },
					{ $inc: { savingsBalance: withdrawal.amount } }
				);
		}

		// If completed, create a transaction record
		if (status === "completed") {
			await db.collection("transactions").insertOne({
				userId: withdrawal.userId,
				type: "withdrawal",
				amount: withdrawal.amount,
				description: `Withdrawal to ${withdrawal.bankName} account`,
				status: "completed",
				createdAt: new Date(),
			});
		}

		return NextResponse.json({
			message: `Withdrawal ${status} successfully`,
		});
	} catch (error) {
		console.error("PUT /api/auth/withdrawals error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
