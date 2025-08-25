// app/api/withdrawals/route.js
import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

// GET - Get all withdrawals for user
export async function GET(request) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}

		const { searchParams } = new URL(request.url);
		const status = searchParams.get("status");
		const page = parseInt(searchParams.get("page")) || 1;
		const limit = parseInt(searchParams.get("limit")) || 10;

		const { db } = await connectToDatabase();

		// Build query
		const query = { userId: authResult.userId };
		if (status && status !== "all") {
			query.status = status;
		}

		const withdrawals = await db
			.collection("withdrawals")
			.find(query)
			.sort({ createdAt: -1 })
			.skip((page - 1) * limit)
			.limit(limit)
			.toArray();

		const total = await db.collection("withdrawals").countDocuments(query);

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
		console.error("GET /api/auth/withdrawals error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

// POST - Create withdrawal request
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
			amount,
			accountName,
			bankName,
			accountNumber,
			routingNumber,
			notes,
		} = await request.json();

		if (!amount || !accountName || !bankName || !accountNumber) {
			return NextResponse.json(
				{
					error:
						"Amount, account name, bank name, and account number are required",
				},
				{ status: 400 }
			);
		}

		if (amount <= 0) {
			return NextResponse.json(
				{ error: "Amount must be greater than zero" },
				{ status: 400 }
			);
		}

		const { db } = await connectToDatabase();

		// Check if user has sufficient savings balance
		const user = await db
			.collection("users")
			.findOne({ _id: new ObjectId(authResult.userId) });

		if (user.savingsBalance < amount) {
			return NextResponse.json(
				{ error: "Insufficient savings balance" },
				{ status: 400 }
			);
		}

		// Check for pending withdrawals that would exceed balance
		const pendingWithdrawals = await db
			.collection("withdrawals")
			.find({
				userId: authResult.userId,
				status: "pending",
			})
			.toArray();

		const totalPending = pendingWithdrawals.reduce(
			(sum, withdrawal) => sum + withdrawal.amount,
			0
		);

		if (user.savingsBalance < totalPending + amount) {
			return NextResponse.json(
				{ error: "Insufficient balance considering pending withdrawals" },
				{ status: 400 }
			);
		}

		// Create withdrawal request
		const newWithdrawal = {
			userId: authResult.userId,
			amount,
			accountName,
			bankName,
			accountNumber,
			routingNumber: routingNumber || "",
			notes: notes || "",
			status: "pending",
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const result = await db.collection("withdrawals").insertOne(newWithdrawal);

		// Reserve the amount (deduct from available balance but not total savings)
		await db
			.collection("users")
			.updateOne(
				{ _id: authResult.userId },
				{ $inc: { savingsBalance: -amount } }
			);

		return NextResponse.json(
			{
				message: "Withdrawal request submitted successfully",
				withdrawalId: result.insertedId,
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error("POST /api/auth/withdrawals error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
