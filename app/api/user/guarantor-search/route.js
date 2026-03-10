// app/api/user/guarantor-search/route.js
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
				{ status: authResult.status },
			);
		}

		const { searchParams } = new URL(request.url);
		const query = searchParams.get("q") || "";

		const { db } = await connectToDatabase();

		// Build search criteria
		const searchCriteria = {
			$and: [
				{
					$or: [
						{ firstName: { $regex: query, $options: "i" } },
						{ lastName: { $regex: query, $options: "i" } },
						{ email: { $regex: query, $options: "i" } },
						{ phone: { $regex: query, $options: "i" } },
					],
				},
				{ _id: { $ne: new ObjectId(authResult.userId) } }, // Exclude self
				{ membershipStatus: "approved" }, // Only approved members
			],
		};

		// Find matching users
		const users = await db
			.collection("users")
			.find(searchCriteria)
			.limit(10)
			.toArray();

		console.log(`Found ${users.length} potential guarantors`);

		// Enhance users with their actual financial data
		const enhancedUsers = await Promise.all(
			users.map(async (user) => {
				// Get actual savings from savings collection
				const userSavings = await db
					.collection("savings")
					.find({ userId: user._id.toString() })
					.toArray();

				const totalSavings = userSavings.reduce(
					(sum, saving) =>
						sum + Number(saving.currentBalance || saving.amount || 0),
					0,
				);

				// Get active investments
				const userInvestments = await db
					.collection("investments")
					.find({
						userId: user._id.toString(),
						status: "active",
					})
					.toArray();

				const totalInvestments = userInvestments.reduce(
					(sum, inv) => sum + Number(inv.currentValue || inv.amount || 0),
					0,
				);

				// Check for active loans
				const activeLoans = await db.collection("loans").countDocuments({
					userId: user._id.toString(),
					status: { $in: ["active", "approved"] },
				});

				// Calculate eligibility score (simple version)
				const eligibilityScore = Math.min(
					Math.floor((totalSavings + totalInvestments) / 10000),
					100,
				);

				return {
					_id: user._id,
					firstName: user.firstName,
					lastName: user.lastName,
					email: user.email,
					phone: user.phone,
					profession: user.profession || "Not specified",
					membershipLevel: user.membershipLevel,
					membershipStatus: user.membershipStatus,
					// Include actual financial data
					savingsBalance: totalSavings,
					totalInvestment: totalInvestments,
					totalAssets: totalSavings + totalInvestments,
					hasActiveLoans: activeLoans > 0,
					eligibilityScore,
					isEligibleGuarantor:
						totalSavings + totalInvestments > 0 && activeLoans === 0,
					// Include stats for backward compatibility
					stats: {
						totalSavings,
						totalInvestment: totalInvestments,
						savingsCount: userSavings.length,
						investmentsCount: userInvestments.length,
						hasActiveLoans: activeLoans > 0,
					},
				};
			}),
		);

		// Sort by eligibility (those with assets first)
		enhancedUsers.sort((a, b) => b.totalAssets - a.totalAssets);

		return NextResponse.json({
			users: enhancedUsers,
		});
	} catch (error) {
		console.error("Guarantor search error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
