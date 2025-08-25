// app/api/shared/health/route.js
import { connectToDatabase } from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function GET() {
	try {
		// Test database connection
		const { db } = await connectToDatabase();
		await db.command({ ping: 1 });

		// Get basic stats
		const usersCount = await db.collection("users").countDocuments();
		const activeUsersCount = await db
			.collection("users")
			.countDocuments({ isEmailVerified: true });
		const withdrawalsCount = await db
			.collection("withdrawals")
			.countDocuments();
		const pendingWithdrawals = await db
			.collection("withdrawals")
			.countDocuments({ status: "pending" });

		return NextResponse.json({
			status: "healthy",
			timestamp: new Date().toISOString(),
			database: "connected",
			stats: {
				users: usersCount,
				activeUsers: activeUsersCount,
				withdrawals: withdrawalsCount,
				pendingWithdrawals: pendingWithdrawals,
			},
		});
	} catch (error) {
		console.error("Unhealthy Request", error);
		return NextResponse.json(
			{
				status: "unhealthy",
				timestamp: new Date().toISOString(),
				database: "disconnected",
				error: error.message,
			},
			{ status: 503 }
		);
	}
}

// POST - For more detailed health check (optional)
export async function POST(request) {
	try {
		const { detailed } = await request.json();

		const { db } = await connectToDatabase();
		await db.command({ ping: 1 });

		const healthData = {
			status: "healthy",
			timestamp: new Date().toISOString(),
			database: "connected",
		};

		if (detailed) {
			// Get more detailed statistics
			const collections = await db.listCollections().toArray();
			healthData.collections = collections.map((col) => col.name);

			// Get counts for main collections
			healthData.counts = {
				users: await db.collection("users").countDocuments(),
				savings: await db.collection("savings").countDocuments(),
				investments: await db.collection("investments").countDocuments(),
				loans: await db.collection("loans").countDocuments(),
				auctions: await db.collection("auctions").countDocuments(),
				budgets: await db.collection("budgets").countDocuments(),
				withdrawals: await db.collection("withdrawals").countDocuments(),
			};

			// Get status counts for withdrawals
			healthData.withdrawalStatuses = {
				pending: await db
					.collection("withdrawals")
					.countDocuments({ status: "pending" }),
				processing: await db
					.collection("withdrawals")
					.countDocuments({ status: "processing" }),
				approved: await db
					.collection("withdrawals")
					.countDocuments({ status: "approved" }),
				completed: await db
					.collection("withdrawals")
					.countDocuments({ status: "completed" }),
				rejected: await db
					.collection("withdrawals")
					.countDocuments({ status: "rejected" }),
			};
		}

		return NextResponse.json(healthData);
	} catch (error) {
		console.error("Unhealthy Request", error);
		return NextResponse.json(
			{
				status: "unhealthy",
				timestamp: new Date().toISOString(),
				database: "disconnected",
				error: error.message,
			},
			{ status: 503 }
		);
	}
}
