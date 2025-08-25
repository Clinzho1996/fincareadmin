// app/api/budgets/route.js
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
		const budgets = await db
			.collection("budgets")
			.find({ userId: authResult.userId })
			.toArray();

		return NextResponse.json({ budgets });
	} catch (error) {
		console.error("GET /api/auth/budget error:", error);
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
			budgetTitle,
			activeIncome,
			passiveIncome,
			otherIncome,
			budgetingTechnique,
			needsPercentage,
			wantsPercentage,
			investmentsPercentage,
			needs,
			wants,
			investments,
		} = await request.json();

		// Validate required fields
		if (!budgetTitle || !activeIncome || !budgetingTechnique) {
			return NextResponse.json(
				{
					error:
						"Budget title, active income, and budgeting technique are required",
				},
				{ status: 400 }
			);
		}

		// Validate percentages add up to 100%
		if (needsPercentage + wantsPercentage + investmentsPercentage !== 100) {
			return NextResponse.json(
				{
					error:
						"Needs, wants, and investments percentages must add up to 100%",
				},
				{ status: 400 }
			);
		}

		// Calculate total income
		const totalIncome =
			activeIncome + (passiveIncome || 0) + (otherIncome || 0);

		const { db } = await connectToDatabase();

		const newBudget = {
			userId: authResult.userId,
			budgetTitle,
			income: {
				active: activeIncome,
				passive: passiveIncome || 0,
				other: otherIncome || 0,
				total: totalIncome,
			},
			budgetingTechnique,
			allocation: {
				needs: needsPercentage,
				wants: wantsPercentage,
				investments: investmentsPercentage,
			},
			categories: {
				needs: needs || {},
				wants: wants || {},
				investments: investments || {},
			},
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const result = await db.collection("budgets").insertOne(newBudget);

		return NextResponse.json(
			{
				message: "Budget created successfully",
				budgetId: result.insertedId,
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error("POST /api/auth/budget error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
