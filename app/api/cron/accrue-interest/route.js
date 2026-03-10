// app/api/cron/accrue-interest/route.js
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

// This endpoint should be called by a cron job daily
export async function POST(request) {
	try {
		// Verify cron job secret to prevent unauthorized access
		const authHeader = request.headers.get("authorization");
		if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { db } = await connectToDatabase();
		const now = new Date();

		// Find all active investments that haven't matured yet
		const activeInvestments = await db
			.collection("investments")
			.find({
				status: "active",
				maturityDate: { $gt: now },
			})
			.toArray();

		const results = {
			processed: 0,
			updated: 0,
			errors: [],
		};

		// Process each investment
		for (const investment of activeInvestments) {
			try {
				// Check if interest was already calculated today
				const lastCalc = new Date(investment.lastInterestCalculation);
				const daysSinceLastCalc = Math.floor(
					(now - lastCalc) / (1000 * 60 * 60 * 24),
				);

				if (daysSinceLastCalc >= 1) {
					// Calculate interest for the days missed
					const daysToAccrue = Math.min(daysSinceLastCalc, 1); // Only accrue for 1 day at a time
					const interestToAdd = investment.dailyInterestAmount * daysToAccrue;

					// Update investment record
					await db.collection("investments").updateOne(
						{ _id: investment._id },
						{
							$inc: {
								currentValue: interestToAdd,
								totalInterestEarned: interestToAdd,
							},
							$set: {
								lastInterestCalculation: now,
								updatedAt: now,
							},
						},
					);

					// Also update user's total investment balance
					await db.collection("users").updateOne(
						{ _id: new ObjectId(investment.userId) },
						{
							$inc: {
								totalInvestment: interestToAdd,
							},
						},
					);

					results.updated++;
				}

				results.processed++;
			} catch (error) {
				console.error(`Error processing investment ${investment._id}:`, error);
				results.errors.push({
					investmentId: investment._id,
					error: error.message,
				});
			}
		}

		// Check for matured investments
		const maturedInvestments = await db.collection("investments").updateMany(
			{
				status: "active",
				maturityDate: { $lte: now },
			},
			{
				$set: {
					status: "matured",
					updatedAt: now,
				},
			},
		);

		return NextResponse.json({
			success: true,
			message: "Interest accrual completed",
			results: {
				...results,
				matured: maturedInvestments.modifiedCount,
			},
		});
	} catch (error) {
		console.error("POST /api/cron/accrue-interest error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
