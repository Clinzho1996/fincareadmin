// app/api/investments/route.js
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
		const investments = await db
			.collection("investments")
			.find({ userId: authResult.userId })
			.toArray();

		return NextResponse.json({ investments });
	} catch (error) {
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

		const { amount, units, investmentId } = await request.json();

		if (!amount || !investmentId) {
			return NextResponse.json(
				{ error: "Amount and investment ID are required" },
				{ status: 400 }
			);
		}

		const { db } = await connectToDatabase();

		// Get investment details from admin-created investments
		const investmentPlan = await db
			.collection("admin_investments")
			.findOne({ _id: investmentId });

		if (!investmentPlan) {
			return NextResponse.json(
				{ error: "Investment plan not found" },
				{ status: 404 }
			);
		}

		// Check if user has sufficient savings
		const user = await db
			.collection("users")
			.findOne({ _id: authResult.userId });

		if (user.savingsBalance < amount) {
			return NextResponse.json(
				{ error: "Insufficient savings balance" },
				{ status: 400 }
			);
		}

		// Calculate units if not provided
		const calculatedUnits = units || amount / investmentPlan.unitPrice;

		const newInvestment = {
			userId: authResult.userId,
			amount,
			units: calculatedUnits,
			investmentId,
			investmentName: investmentPlan.name,
			interestRate: investmentPlan.interestRate,
			investmentType: investmentPlan.type,
			currentValue: amount,
			startDate: new Date(),
			maturityDate: investmentPlan.maturityDate,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const result = await db.collection("investments").insertOne(newInvestment);

		// Deduct from savings and update investment total
		await db.collection("users").updateOne(
			{ _id: authResult.userId },
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
			},
			{ status: 201 }
		);
	} catch (error) {
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
