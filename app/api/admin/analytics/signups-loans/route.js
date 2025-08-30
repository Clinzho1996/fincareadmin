// app/api/admin/analytics/signups-loans/route.js
import { connectToDatabase } from "@/lib/mongodb";
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

export async function GET(request) {
	try {
		// Verify admin permissions
		const token = await getToken({ req: request });

		if (!token || (token.role !== "super_admin" && token.role !== "admin")) {
			return NextResponse.json(
				{ error: "Unauthorized. Admin access required." },
				{ status: 403 }
			);
		}

		const { searchParams } = new URL(request.url);
		const year =
			searchParams.get("year") || new Date().getFullYear().toString();

		const { db } = await connectToDatabase();

		// Convert year to number and validate
		const yearNum = parseInt(year);
		if (isNaN(yearNum)) {
			return NextResponse.json(
				{ error: "Invalid year parameter" },
				{ status: 400 }
			);
		}

		// Calculate date range for the selected year
		const startDate = new Date(yearNum, 0, 1); // January 1st of the year
		const endDate = new Date(yearNum, 11, 31, 23, 59, 59); // December 31st of the year

		// Get user registrations by month
		const userRegistrations = await db
			.collection("users")
			.aggregate([
				{
					$match: {
						createdAt: {
							$gte: startDate,
							$lte: endDate,
						},
						isEmailVerified: true,
					},
				},
				{
					$group: {
						_id: {
							month: { $month: "$createdAt" },
						},
						count: { $sum: 1 },
					},
				},
				{
					$sort: { "_id.month": 1 },
				},
			])
			.toArray();

		// Get loan applications by month
		const loanApplications = await db
			.collection("loans")
			.aggregate([
				{
					$match: {
						createdAt: {
							$gte: startDate,
							$lte: endDate,
						},
					},
				},
				{
					$group: {
						_id: {
							month: { $month: "$createdAt" },
						},
						count: { $sum: 1 },
					},
				},
				{
					$sort: { "_id.month": 1 },
				},
			])
			.toArray();

		// Format the data for all months
		const monthsData = {};
		const monthNames = [
			"January",
			"February",
			"March",
			"April",
			"May",
			"June",
			"July",
			"August",
			"September",
			"October",
			"November",
			"December",
		];

		// Initialize all months with zero values
		monthNames.forEach((month) => {
			monthsData[month] = {
				totalUsers: 0,
				totalLoans: 0,
			};
		});

		// Fill in actual user registration data
		userRegistrations.forEach((item) => {
			const monthName = monthNames[item._id.month - 1];
			if (monthName) {
				monthsData[monthName].totalUsers = item.count;
			}
		});

		// Fill in actual loan application data
		loanApplications.forEach((item) => {
			const monthName = monthNames[item._id.month - 1];
			if (monthName) {
				monthsData[monthName].totalLoans = item.count;
			}
		});

		return NextResponse.json({
			status: "success",
			data: monthsData,
		});
	} catch (error) {
		console.error("Analytics API error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
