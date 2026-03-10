// app/api/customers/route.js - UPDATED VERSION
export const dynamic = "force-dynamic";

import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

export async function GET(request) {
	try {
		// Authenticate the request - only require user authentication, not admin
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status },
			);
		}

		const { db } = await connectToDatabase();
		const { searchParams } = new URL(request.url);

		// Get pagination parameters
		const page = parseInt(searchParams.get("page")) || 1;
		const limit = parseInt(searchParams.get("limit")) || 20;
		const skip = (page - 1) * limit;

		// Get filter parameters
		const search = searchParams.get("search") || "";
		const excludeCurrentUser = searchParams.get("excludeCurrent") === "true";

		console.log("Mobile customers API called by user:", authResult.userId);

		// Build filter query - only get active members who can be guarantors
		let filter = {
			membershipStatus: "approved", // Only approved members
			isEmailVerified: true, // Only verified users
		};

		// Exclude current user if requested
		if (excludeCurrentUser) {
			filter._id = { $ne: new ObjectId(authResult.userId) };
		}

		// Search filter (by name, email, or phone)
		if (search) {
			filter.$or = [
				{ firstName: { $regex: search, $options: "i" } },
				{ lastName: { $regex: search, $options: "i" } },
				{ email: { $regex: search, $options: "i" } },
				{ phone: { $regex: search, $options: "i" } },
			];
		}

		// Get total count for pagination
		const total = await db.collection("users").countDocuments(filter);

		// Get users with pagination and filtering
		const users = await db
			.collection("users")
			.find(filter, {
				projection: {
					password: 0,
					otp: 0,
					bvn: 0,
					tempPassword: 0,
					createdBy: 0,
					adminCreated: 0,
					passwordResetRequired: 0,
				},
			})
			.sort({ firstName: 1, lastName: 1 })
			.skip(skip)
			.limit(limit)
			.toArray();

		console.log(`Found ${users.length} users`);

		// Use the stored values from the user document instead of calculating
		const usersWithBasicStats = users.map((user) => {
			// Get the stored values directly from the user document
			const totalSavings = user.savingsBalance || 0;
			const totalInvestment = user.totalInvestment || 0;
			const hasActiveLoans = (user.totalLoans || 0) > 0;

			console.log(`User ${user.firstName} ${user.lastName}:`, {
				savingsBalance: totalSavings,
				totalInvestment: totalInvestment,
				totalLoans: user.totalLoans,
			});

			return {
				_id: user._id,
				firstName: user.firstName,
				lastName: user.lastName,
				email: user.email,
				phone: user.phone,
				profession: user.profession || "Not specified",
				membershipLevel: user.membershipLevel,
				membershipStatus: user.membershipStatus,
				createdAt: user.createdAt,
				// Use stored values directly
				stats: {
					totalSavings,
					totalInvestment,
					hasActiveLoans,
					savingsCount: user.savingsCount || 0,
					investmentsCount: user.investmentsCount || 0,
				},
				// Also include at top level for easier access
				savingsBalance: totalSavings,
				totalInvestment: totalInvestment,
				totalLoans: user.totalLoans || 0,
				// Eligibility indicator
				isEligibleGuarantor: totalSavings > 0 && !hasActiveLoans,
				eligibilityScore: calculateEligibilityScore(
					totalSavings,
					totalInvestment,
					hasActiveLoans,
				),
			};
		});

		console.log(`Returning ${usersWithBasicStats.length} users for mobile app`);

		return NextResponse.json({
			status: "success",
			users: usersWithBasicStats,
			pagination: {
				page,
				limit,
				total,
				pages: Math.ceil(total / limit),
			},
			filters: {
				search,
				excludeCurrentUser,
			},
		});
	} catch (error) {
		console.error("GET /api/customers error:", error);
		return NextResponse.json(
			{ error: "Internal server error: " + error.message },
			{ status: 500 },
		);
	}
}

// Helper function to calculate guarantor eligibility score
function calculateEligibilityScore(savings, investments, hasActiveLoans) {
	let score = 0;

	if (savings >= 1000000) score += 3;
	else if (savings >= 500000) score += 2;
	else if (savings >= 100000) score += 1;

	if (investments >= 500000) score += 2;
	else if (investments >= 100000) score += 1;

	if (hasActiveLoans) score -= 1;

	return Math.max(0, score);
}

// Optional: Get single user by ID for detailed view
export async function POST(request) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status },
			);
		}

		const { db } = await connectToDatabase();
		const { userId } = await request.json();

		if (!userId) {
			return NextResponse.json(
				{ error: "User ID is required" },
				{ status: 400 },
			);
		}

		console.log("Getting user details for:", userId);

		const user = await db.collection("users").findOne(
			{ _id: new ObjectId(userId) },
			{
				projection: {
					password: 0,
					otp: 0,
					bvn: 0,
					tempPassword: 0,
					createdBy: 0,
					adminCreated: 0,
					passwordResetRequired: 0,
				},
			},
		);

		if (!user) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		// Use stored values from user document
		const totalSavings = user.savingsBalance || 0;
		const totalInvestment = user.totalInvestment || 0;
		const totalLoans = user.totalLoans || 0;

		const userWithDetails = {
			...user,
			detailedStats: {
				totalSavings,
				totalInvestment,
				totalActiveLoans: totalLoans,
			},
			guarantorEligibility: {
				isEligible: totalSavings > 0,
				eligibilityScore: calculateEligibilityScore(
					totalSavings,
					totalInvestment,
					totalLoans > 0,
				),
				recommendedMaxCoverage: calculateRecommendedMaxCoverage(
					totalSavings,
					totalInvestment,
				),
				riskLevel: calculateRiskLevel(
					totalSavings,
					totalInvestment,
					totalLoans > 0 ? 1 : 0,
				),
			},
		};

		return NextResponse.json({
			status: "success",
			user: userWithDetails,
		});
	} catch (error) {
		console.error("POST /api/customers error:", error);
		return NextResponse.json(
			{ error: "Internal server error: " + error.message },
			{ status: 500 },
		);
	}
}

// Helper function to calculate recommended maximum coverage
function calculateRecommendedMaxCoverage(savings, investments) {
	const totalAssets = savings + investments;

	if (totalAssets >= 2000000) return 100;
	else if (totalAssets >= 1000000) return 80;
	else if (totalAssets >= 500000) return 60;
	else if (totalAssets >= 200000) return 40;
	else if (totalAssets >= 100000) return 20;
	else return 10;
}

// Helper function to calculate risk level
function calculateRiskLevel(savings, investments, activeLoansCount) {
	const totalAssets = savings + investments;
	const loanBurden = activeLoansCount > 0 ? 1 : 0;

	if (totalAssets >= 1500000 && loanBurden === 0) return "Low";
	else if (totalAssets >= 750000 && loanBurden <= 1) return "Medium";
	else if (totalAssets >= 300000 && loanBurden <= 2) return "Moderate";
	else return "High";
}
