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

		// Calculate category totals
		const needsTotal = needs
			? Object.values(needs).reduce((sum, amount) => sum + amount, 0)
			: 0;
		const wantsTotal = wants
			? Object.values(wants).reduce((sum, amount) => sum + amount, 0)
			: 0;
		const investmentsTotal = investments
			? Object.values(investments).reduce((sum, amount) => sum + amount, 0)
			: 0;

		// Validate that category totals match the percentage allocations
		const expectedNeeds = totalIncome * (needsPercentage / 100);
		const expectedWants = totalIncome * (wantsPercentage / 100);
		const expectedInvestments = totalIncome * (investmentsPercentage / 100);

		if (
			Math.abs(needsTotal - expectedNeeds) > 1 ||
			Math.abs(wantsTotal - expectedWants) > 1 ||
			Math.abs(investmentsTotal - expectedInvestments) > 1
		) {
			return NextResponse.json(
				{
					error: "Category allocations do not match the specified percentages",
				},
				{ status: 400 }
			);
		}

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
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
