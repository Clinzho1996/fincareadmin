// app/api/investments/[id]/route.js
import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}

		const { id } = params;

		if (!ObjectId.isValid(id)) {
			return NextResponse.json(
				{ error: "Invalid investment ID" },
				{ status: 400 }
			);
		}

		const { db } = await connectToDatabase();
		const investment = await db.collection("investments").findOne({
			_id: new ObjectId(id),
			userId: authResult.userId,
		});

		if (!investment) {
			return NextResponse.json(
				{ error: "Investment not found" },
				{ status: 404 }
			);
		}

		return NextResponse.json({ investment });
	} catch (error) {
		console.error("GET /api/auth/investment error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

export async function PUT(request, { params }) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}

		const { id } = params;

		if (!ObjectId.isValid(id)) {
			return NextResponse.json(
				{ error: "Invalid investment ID" },
				{ status: 400 }
			);
		}

		const { amount, units } = await request.json();

		if (!amount && !units) {
			return NextResponse.json(
				{ error: "Amount or units are required" },
				{ status: 400 }
			);
		}

		const { db } = await connectToDatabase();

		// Check if investment exists and belongs to user
		const existingInvestment = await db.collection("investments").findOne({
			_id: new ObjectId(id),
			userId: authResult.userId,
		});

		if (!existingInvestment) {
			return NextResponse.json(
				{ error: "Investment not found" },
				{ status: 404 }
			);
		}

		const updatedData = {
			updatedAt: new Date(),
		};

		if (amount) {
			// Calculate the difference and update user's savings and investment totals
			const amountDifference = amount - existingInvestment.amount;

			if (amountDifference > 0) {
				// Adding to investment - check if user has enough savings
				const user = await db
					.collection("users")
					.findOne({ _id: authResult.userId });

				if (user.savingsBalance < amountDifference) {
					return NextResponse.json(
						{ error: "Insufficient savings balance" },
						{ status: 400 }
					);
				}

				// Deduct from savings
				await db
					.collection("users")
					.updateOne(
						{ _id: authResult.userId },
						{ $inc: { savingsBalance: -amountDifference } }
					);
			} else {
				// Withdrawing from investment - add to savings
				await db
					.collection("users")
					.updateOne(
						{ _id: authResult.userId },
						{ $inc: { savingsBalance: Math.abs(amountDifference) } }
					);
			}

			// Update investment amount and user's total investment
			updatedData.amount = amount;
			updatedData.currentValue = amount; // In a real app, this would be calculated based on market value

			await db
				.collection("users")
				.updateOne(
					{ _id: authResult.userId },
					{ $inc: { totalInvestment: amountDifference } }
				);
		}

		if (units) {
			updatedData.units = units;
		}

		await db
			.collection("investments")
			.updateOne({ _id: new ObjectId(id) }, { $set: updatedData });

		return NextResponse.json({
			message: "Investment updated successfully",
		});
	} catch (error) {
		console.error("PUT /api/auth/investment error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

export async function DELETE(request, { params }) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}

		const { id } = params;

		if (!ObjectId.isValid(id)) {
			return NextResponse.json(
				{ error: "Invalid investment ID" },
				{ status: 400 }
			);
		}

		const { db } = await connectToDatabase();

		// Check if investment exists and belongs to user
		const investment = await db.collection("investments").findOne({
			_id: new ObjectId(id),
			userId: authResult.userId,
		});

		if (!investment) {
			return NextResponse.json(
				{ error: "Investment not found" },
				{ status: 404 }
			);
		}

		// Return investment amount to savings
		await db.collection("users").updateOne(
			{ _id: authResult.userId },
			{
				$inc: {
					savingsBalance: investment.amount,
					totalInvestment: -investment.amount,
				},
			}
		);

		// Delete the investment
		await db.collection("investments").deleteOne({ _id: new ObjectId(id) });

		return NextResponse.json({
			message: "Investment deleted successfully",
		});
	} catch (error) {
		console.error("DELETE /api/auth/investment error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
