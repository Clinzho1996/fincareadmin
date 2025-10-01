// app/api/customers/route.js
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
				{ status: authResult.status }
			);
		}

		const { db } = await connectToDatabase();
		const { searchParams } = new URL(request.url);

		// Get pagination parameters
		const page = parseInt(searchParams.get("page")) || 1;
		const limit = parseInt(searchParams.get("limit")) || 20; // Increased limit for mobile
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
			.sort({ firstName: 1, lastName: 1 }) // Sort alphabetically for easier browsing
			.skip(skip)
			.limit(limit)
			.toArray();

		// Calculate basic stats for each user (simplified for mobile)
		const usersWithBasicStats = await Promise.all(
			users.map(async (user) => {
				const userIdString = user._id.toString();

				// Get savings balance (simplified query)
				const savings = await db
					.collection("savings")
					.find({ userId: userIdString })
					.toArray();

				const totalSavings = savings.reduce(
					(sum, s) => sum + Number(s.currentBalance || 0),
					0
				);

				// Get investments (simplified query)
				const investments = await db
					.collection("investments")
					.find({ userId: userIdString })
					.toArray();

				const totalInvestment = investments.reduce(
					(sum, i) => sum + Number(i.amount || 0),
					0
				);

				// Check if user has active loans (simplified)
				const activeLoans = await db.collection("loans").countDocuments({
					userId: userIdString,
					status: { $in: ["approved", "active", "completed"] },
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
					// Basic stats for guarantor eligibility
					stats: {
						totalSavings,
						totalInvestment,
						hasActiveLoans: activeLoans > 0,
						savingsCount: savings.length,
						investmentsCount: investments.length,
					},
					// Eligibility indicator
					isEligibleGuarantor: totalSavings > 0, // Basic eligibility check
					eligibilityScore: calculateEligibilityScore(
						totalSavings,
						totalInvestment,
						activeLoans
					),
				};
			})
		);

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
			{ status: 500 }
		);
	}
}

// Helper function to calculate guarantor eligibility score
function calculateEligibilityScore(savings, investments, hasActiveLoans) {
	let score = 0;

	// Savings contribute to score
	if (savings >= 1000000) score += 3; // High savings
	else if (savings >= 500000) score += 2; // Medium savings
	else if (savings >= 100000) score += 1; // Low savings

	// Investments contribute to score
	if (investments >= 500000) score += 2;
	else if (investments >= 100000) score += 1;

	// Active loans reduce score slightly
	if (hasActiveLoans) score -= 1;

	return Math.max(0, score); // Ensure score doesn't go below 0
}

// Optional: Get single user by ID for detailed view
export async function POST(request) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}

		const { db } = await connectToDatabase();
		const { userId } = await request.json();

		if (!userId) {
			return NextResponse.json(
				{ error: "User ID is required" },
				{ status: 400 }
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
			}
		);

		if (!user) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		// Get detailed stats for this user
		const userIdString = user._id.toString();

		const savings = await db
			.collection("savings")
			.find({ userId: userIdString })
			.toArray();

		const investments = await db
			.collection("investments")
			.find({ userId: userIdString })
			.toArray();

		const loans = await db
			.collection("loans")
			.find({
				userId: userIdString,
				status: { $in: ["approved", "active", "completed"] },
			})
			.toArray();

		const totalSavings = savings.reduce(
			(sum, s) => sum + Number(s.currentBalance || 0),
			0
		);

		const totalInvestment = investments.reduce(
			(sum, i) => sum + Number(i.amount || 0),
			0
		);

		const totalActiveLoans = loans.reduce(
			(sum, l) => sum + Number(l.loanAmount || 0),
			0
		);

		const userWithDetails = {
			...user,
			detailedStats: {
				totalSavings,
				totalInvestment,
				totalActiveLoans,
				savingsAccounts: savings.length,
				investmentPlans: investments.length,
				activeLoans: loans.length,
				savingsBreakdown: savings.map((s) => ({
					type: s.type,
					balance: s.currentBalance,
					createdAt: s.createdAt,
				})),
				investmentBreakdown: investments.map((i) => ({
					plan: i.planName,
					amount: i.amount,
					duration: i.duration,
					createdAt: i.createdAt,
				})),
			},
			guarantorEligibility: {
				isEligible: totalSavings > 0,
				eligibilityScore: calculateEligibilityScore(
					totalSavings,
					totalInvestment,
					loans.length > 0
				),
				recommendedMaxCoverage: calculateRecommendedMaxCoverage(
					totalSavings,
					totalInvestment
				),
				riskLevel: calculateRiskLevel(
					totalSavings,
					totalInvestment,
					loans.length
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
			{ status: 500 }
		);
	}
}

// Helper function to calculate recommended maximum coverage
function calculateRecommendedMaxCoverage(savings, investments) {
	const totalAssets = savings + investments;

	if (totalAssets >= 2000000) return 100; // Can cover up to 100%
	else if (totalAssets >= 1000000) return 80; // Can cover up to 80%
	else if (totalAssets >= 500000) return 60; // Can cover up to 60%
	else if (totalAssets >= 200000) return 40; // Can cover up to 40%
	else if (totalAssets >= 100000) return 20; // Can cover up to 20%
	else return 10; // Minimum coverage
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
