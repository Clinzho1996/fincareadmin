// app/api/investments/route.js
import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
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

		// Include all fields for user investments
		const investments = await db
			.collection("investments")
			.find({ userId: authResult.userId })
			.toArray();

		return NextResponse.json({ investments });
	} catch (error) {
		console.error("GET /api/investments error:", error);
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

		const { name, amount, units, category, image } = await request.json();

		if (!name || !amount || !category) {
			return NextResponse.json(
				{ error: "Name, amount, and category are required" },
				{ status: 400 }
			);
		}

		const { db } = await connectToDatabase();

		// Get user
		const user = await db
			.collection("users")
			.findOne({ _id: new ObjectId(authResult.userId) });
		if (!user || user.savingsBalance < amount) {
			return NextResponse.json(
				{ error: "Insufficient savings balance" },
				{ status: 400 }
			);
		}

		// Create new investment
		const newInvestment = {
			userId: authResult.userId,
			name,
			amount,
			units: units || amount,
			category,
			currentValue: amount,
			status: "active",
			image: image || null,
			startDate: new Date(),
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const result = await db.collection("investments").insertOne(newInvestment);

		// Deduct from user's savings and update totalInvestment
		await db.collection("users").updateOne(
			{ _id: new ObjectId(authResult.userId) },
			{
				$inc: {
					savingsBalance: -amount,
					totalInvestment: amount,
				},
			}
		);

		return NextResponse.json(
			{
				message: "Investment created successfully",
				investmentId: result.insertedId,
				investment: newInvestment,
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error("POST /api/investments error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
