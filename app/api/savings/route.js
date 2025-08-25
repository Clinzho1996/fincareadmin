// app/api/savings/route.js
import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { NextResponse } from "next/server";

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
		const savings = await db
			.collection("savings")
			.find({ userId: authResult.userId })
			.toArray();

		return NextResponse.json({ savings });
	} catch (error) {
		console.error("GET /api/savings error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

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
			targetAmount,
			reason,
			allocation,
			withdrawFromSavings,
			liquidateLoans,
		} = await request.json();

		if (!targetAmount || !reason) {
			return NextResponse.json(
				{ error: "Target amount and reason are required" },
				{ status: 400 }
			);
		}

		const { db } = await connectToDatabase();

		// Check if user has sufficient funds if allocation is specified
		if (allocation && allocation.amount > 0) {
			const user = await db
				.collection("users")
				.findOne({ _id: authResult.userId });

			if (
				allocation.source === "savings" &&
				user.savingsBalance < allocation.amount
			) {
				return NextResponse.json(
					{ error: "Insufficient savings balance" },
					{ status: 400 }
				);
			}

			if (allocation.source === "investment") {
				const investment = await db.collection("investments").findOne({
					userId: authResult.userId,
					_id: allocation.investmentId,
				});

				if (!investment || investment.currentValue < allocation.amount) {
					return NextResponse.json(
						{ error: "Insufficient investment balance" },
						{ status: 400 }
					);
				}
			}

			// Deduct from source if allocation is specified
			if (allocation.source === "savings") {
				await db
					.collection("users")
					.updateOne(
						{ _id: authResult.userId },
						{ $inc: { savingsBalance: -allocation.amount } }
					);
			}
		}

		const newSaving = {
			userId: authResult.userId,
			targetAmount,
			currentBalance: allocation?.amount || 0,
			reason,
			allocation: allocation || null,
			withdrawFromSavings: withdrawFromSavings || false,
			liquidateLoans: liquidateLoans || false,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const result = await db.collection("savings").insertOne(newSaving);

		// Update user's total savings if allocation was made
		if (allocation?.amount > 0) {
			await db
				.collection("users")
				.updateOne(
					{ _id: authResult.userId },
					{ $inc: { totalSavings: allocation.amount } }
				);
		}

		return NextResponse.json(
			{
				message: "Saving goal created successfully",
				savingId: result.insertedId,
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error("POST /api/savings error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
