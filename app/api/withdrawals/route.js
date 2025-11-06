// app/api/withdrawals/route.js - FIXED VERSION
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

		// Build query - FIX: Use ObjectId consistently
		const query = { userId: new ObjectId(authResult.userId) };
		if (status && status !== "all") {
			query.status = status;
		}

		console.log("📱 GET Withdrawals - Query:", query);

		const withdrawals = await db
			.collection("withdrawals")
			.find(query)
			.sort({ createdAt: -1 })
			.skip((page - 1) * limit)
			.limit(limit)
			.toArray();

		const total = await db.collection("withdrawals").countDocuments(query);

		console.log("📱 GET Withdrawals - Found:", withdrawals.length);

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

		// FIX: Use ObjectId consistently
		const userId = new ObjectId(authResult.userId);

		// Check if user has sufficient savings balance
		const user = await db.collection("users").findOne({ _id: userId });

		if (!user) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

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
				userId: userId, // FIX: Use ObjectId
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

		// Create withdrawal request - FIX: Store userId as ObjectId
		const newWithdrawal = {
			userId: userId, // Store as ObjectId
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

		console.log("📱 POST Withdrawal - Creating:", newWithdrawal);

		const result = await db.collection("withdrawals").insertOne(newWithdrawal);

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
