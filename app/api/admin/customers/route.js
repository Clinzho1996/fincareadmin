export const dynamic = "force-dynamic";

import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

export async function GET(request) {
	try {
		// Authenticate the request
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}

		// Connect to database first
		const { db } = await connectToDatabase();

		const token = await getToken({ req: request });

		if (!token || (token.role !== "super_admin" && token.role !== "admin")) {
			return NextResponse.json(
				{ error: "Unauthorized. Super admin access required." },
				{ status: 403 }
			);
		}

		const { searchParams } = new URL(request.url);

		// Get pagination parameters
		const page = parseInt(searchParams.get("page")) || 1;
		const limit = parseInt(searchParams.get("limit")) || 10;
		const skip = (page - 1) * limit;

		// Get filter parameters
		const search = searchParams.get("search") || "";
		const status = searchParams.get("status") || "";
		const membershipLevel = searchParams.get("membershipLevel") || "";

		// Build filter query
		let filter = {};

		// Search filter (by name, email, or phone)
		if (search) {
			filter.$or = [
				{ firstName: { $regex: search, $options: "i" } },
				{ lastName: { $regex: search, $options: "i" } },
				{ email: { $regex: search, $options: "i" } },
				{ phone: { $regex: search, $options: "i" } },
			];
		}

		// Membership status filter
		if (status && status !== "all") {
			filter.membershipStatus = status;
		}

		// Membership level filter
		if (membershipLevel && membershipLevel !== "all") {
			filter.membershipLevel = membershipLevel;
		}

		// Get total count for pagination
		const total = await db.collection("users").countDocuments(filter);

		// Get users with pagination and filtering
		const users = await db
			.collection("users")
			.find(filter, { projection: { password: 0, otp: 0 } })
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limit)
			.toArray();

		// Calculate additional stats for each user
		const usersWithStats = await Promise.all(
			users.map(async (user) => {
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
					.find({ userId: userIdString })
					.toArray();
				const auctions = await db
					.collection("auctions")
					.find({ userId: userIdString })
					.toArray();

				// Calculate totals
				const totalSavings = savings.reduce(
					(sum, s) => sum + Number(s.currentBalance || 0),
					0
				);
				const totalInvestment = investments.reduce(
					(sum, i) => sum + Number(i.amount || 0),
					0
				);

				// Only count approved loans
				const approvedLoans = loans.filter(
					(loan) => loan.status === "approved"
				);
				const totalLoans = approvedLoans.reduce(
					(sum, l) => sum + Number(l.loanAmount || 0),
					0
				);

				const totalAuctions = auctions.length;

				// Determine membership status
				let isMember = "none";
				if (
					user.membershipLevel === "basic" ||
					user.membershipLevel === "premium"
				) {
					isMember =
						user.membershipStatus === "approved" ? "member" : "pending";
				}

				return {
					...user,
					totalSavings,
					totalInvestment,
					totalLoans,
					totalAuctions,
					isMember,
					savingsCount: savings.length,
					investmentsCount: investments.length,
					loansCount: loans.length,
					auctionsCount: auctions.length,
				};
			})
		);

		return NextResponse.json({
			status: "success",
			customers: usersWithStats,
			pagination: {
				page,
				limit,
				total,
				pages: Math.ceil(total / limit),
			},
		});
	} catch (error) {
		console.error("GET /api/admin/customers error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
