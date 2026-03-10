// app/api/investments/route.js
import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

// app/api/investments/route.js (updated GET method)
export async function GET(request) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status },
			);
		}

		const { db } = await connectToDatabase();

		// Get investments with all fields including interest calculations
		const investments = await db
			.collection("investments")
			.find({ userId: authResult.userId })
			.project({}) // project everything
			.toArray();

		// Calculate current values with interest for any investments that might not have been updated by cron yet
		const now = new Date();
		const updatedInvestments = investments.map((investment) => {
			if (
				investment.status === "active" &&
				investment.lastInterestCalculation
			) {
				const lastCalc = new Date(investment.lastInterestCalculation);
				const daysSinceLastCalc = Math.floor(
					(now - lastCalc) / (1000 * 60 * 60 * 24),
				);

				if (daysSinceLastCalc > 0 && investment.dailyInterestAmount) {
					// Calculate interest for missed days
					const missedInterest =
						investment.dailyInterestAmount * daysSinceLastCalc;
					investment.currentValue =
						(investment.currentValue || investment.amount) + missedInterest;
					investment.totalInterestEarned =
						(investment.totalInterestEarned || 0) + missedInterest;
				}
			}
			return investment;
		});

		return NextResponse.json({ investments: updatedInvestments });
	} catch (error) {
		console.error("GET /api/investments error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

export async function POST(request) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status },
			);
		}

		const { amount, investmentId } = await request.json();

		if (!amount || !investmentId) {
			return NextResponse.json(
				{ error: "Amount and investment ID are required" },
				{ status: 400 },
			);
		}

		const { db } = await connectToDatabase();

		// ✅ Convert string investmentId to ObjectId
		const investmentPlan = await db
			.collection("admin_investments")
			.findOne({ _id: new ObjectId(investmentId) });

		if (!investmentPlan) {
			return NextResponse.json(
				{ error: "Investment plan not found" },
				{ status: 404 },
			);
		}

		// Check if user has sufficient savings
		const user = await db
			.collection("users")
			.findOne({ _id: new ObjectId(authResult.userId) });

		if (!user || user.savingsBalance < amount) {
			return NextResponse.json(
				{ error: "Insufficient savings balance" },
				{ status: 400 },
			);
		}

		// Calculate daily interest rate and amount
		const interestRate = investmentPlan.interestRate || 0; // Annual interest rate as percentage
		const dailyInterestRate = interestRate / 100 / 365; // Convert to daily decimal rate
		const dailyInterestAmount = amount * dailyInterestRate;

		// Calculate maturity date if not provided in plan
		const durationInDays = investmentPlan.durationInDays || 30; // Default to 30 days if not specified
		const maturityDate = new Date();
		maturityDate.setDate(maturityDate.getDate() + durationInDays);

		const newInvestment = {
			userId: authResult.userId, // keep as string for consistency
			amount,
			investmentId: investmentPlan._id.toString(),
			investmentName: investmentPlan.name,
			interestRate: investmentPlan.interestRate,
			investmentType: investmentPlan.type,
			currentValue: amount, // Start with initial amount
			dailyInterestRate: dailyInterestRate,
			dailyInterestAmount: dailyInterestAmount,
			totalInterestEarned: 0,
			lastInterestCalculation: new Date(), // Track last time interest was calculated
			startDate: new Date(),
			maturityDate: maturityDate,
			status: "active",
			image: investmentPlan.image || null, // ✅ include image
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const result = await db.collection("investments").insertOne(newInvestment);

		// Deduct from savings and update investment total
		await db.collection("users").updateOne(
			{ _id: new ObjectId(authResult.userId) },
			{
				$inc: {
					savingsBalance: -amount,
					totalInvestment: amount,
				},
			},
		);

		return NextResponse.json(
			{
				message: "Investment created successfully",
				investmentId: result.insertedId,
				investment: newInvestment,
			},
			{ status: 201 },
		);
	} catch (error) {
		console.error("POST /api/investments error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
