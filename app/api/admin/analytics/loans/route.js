// app/api/admin/analytics/loans/route.js
import { connectToDatabase } from "@/lib/mongodb";
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

// Loan configuration constants
const LOAN_INTEREST_RATE = 0.1; // 10% annual interest
const LOAN_PROCESSING_FEE_RATE = 0.01; // 1% processing fee

export async function GET(request) {
	try {
		const token = await getToken({ req: request });

		if (!token || (token.role !== "admin" && token.role !== "super_admin")) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
		}

		const { searchParams } = new URL(request.url);
		const period = searchParams.get("period") || "30d"; // 7d, 30d, 90d, 1y

		const { db } = await connectToDatabase();

		// Calculate date range based on period
		const dateRanges = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 };
		const days = dateRanges[period] || 30;
		const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

		// Loan analytics with enhanced metrics
		const loanAnalytics = await db
			.collection("loans")
			.aggregate([
				{
					$match: { createdAt: { $gte: startDate } },
				},
				// 🟢 Fix: Clean up duration (extract number from "5 months")
				{
					$addFields: {
						durationNumStr: {
							$regexFind: {
								input: "$duration",
								regex: /^[0-9]+/,
							},
						},
					},
				},
				{
					$addFields: {
						durationNum: {
							$convert: {
								input: { $ifNull: ["$durationNumStr.match", "0"] },
								to: "int",
								onError: 0,
								onNull: 0,
							},
						},
					},
				},
				{
					$group: {
						_id: {
							status: "$status",
							month: { $month: "$createdAt" },
							year: { $year: "$createdAt" },
						},
						count: { $sum: 1 },
						totalPrincipal: {
							$sum: { $toDouble: { $ifNull: ["$loanAmount", 0] } },
						},
						totalInterest: {
							$sum: {
								$cond: {
									if: {
										$gt: [{ $ifNull: ["$loanDetails.interestAmount", 0] }, 0],
									},
									then: { $toDouble: "$loanDetails.interestAmount" },
									else: {
										$multiply: [
											{ $toDouble: { $ifNull: ["$loanAmount", 0] } },
											LOAN_INTEREST_RATE,
											{ $divide: ["$durationNum", 12] }, // 🟢 use cleaned number
										],
									},
								},
							},
						},
						totalProcessingFees: {
							$sum: {
								$cond: {
									if: {
										$gt: [{ $ifNull: ["$loanDetails.processingFee", 0] }, 0],
									},
									then: { $toDouble: "$loanDetails.processingFee" },
									else: {
										$multiply: [
											{ $toDouble: { $ifNull: ["$loanAmount", 0] } },
											LOAN_PROCESSING_FEE_RATE,
										],
									},
								},
							},
						},
						pendingProcessingFees: {
							$sum: {
								$cond: {
									if: {
										$or: [
											{ $eq: ["$loanDetails.processingFeePaid", false] },
											{ $not: "$loanDetails.processingFeePaid" },
										],
									},
									then: {
										$cond: {
											if: {
												$gt: [
													{ $ifNull: ["$loanDetails.processingFee", 0] },
													0,
												],
											},
											then: { $toDouble: "$loanDetails.processingFee" },
											else: {
												$multiply: [
													{ $toDouble: { $ifNull: ["$loanAmount", 0] } },
													LOAN_PROCESSING_FEE_RATE,
												],
											},
										},
									},
									else: 0,
								},
							},
						},
						unpaidFeeCount: {
							$sum: {
								$cond: {
									if: {
										$or: [
											{ $eq: ["$loanDetails.processingFeePaid", false] },
											{ $not: "$loanDetails.processingFeePaid" },
										],
									},
									then: 1,
									else: 0,
								},
							},
						},
						totalLoanAmount: {
							$sum: {
								$cond: {
									if: {
										$gt: [{ $ifNull: ["$loanDetails.totalLoanAmount", 0] }, 0],
									},
									then: { $toDouble: "$loanDetails.totalLoanAmount" },
									else: {
										$add: [
											{ $toDouble: { $ifNull: ["$loanAmount", 0] } },
											{
												$multiply: [
													{ $toDouble: { $ifNull: ["$loanAmount", 0] } },
													LOAN_INTEREST_RATE,
													{ $divide: ["$durationNum", 12] }, // 🟢 fixed
												],
											},
										],
									},
								},
							},
						},
						avgLoanAmount: {
							$avg: { $toDouble: { $ifNull: ["$loanAmount", 0] } },
						},
						avgDuration: { $avg: "$durationNum" }, // 🟢 fixed
					},
				},
				{ $sort: { "_id.year": 1, "_id.month": 1 } },
			])
			.toArray();

		// Status breakdown
		const statusBreakdown = await db
			.collection("loans")
			.aggregate([
				{ $match: { createdAt: { $gte: startDate } } },
				{
					$group: {
						_id: "$status",
						count: { $sum: 1 },
						totalAmount: {
							$sum: { $toDouble: { $ifNull: ["$loanAmount", 0] } },
						},
					},
				},
			])
			.toArray();

		// Monthly trend
		const monthlyTrend = await db
			.collection("loans")
			.aggregate([
				{ $match: { createdAt: { $gte: startDate } } },
				{
					$group: {
						_id: {
							month: { $month: "$createdAt" },
							year: { $year: "$createdAt" },
						},
						loanCount: { $sum: 1 },
						totalPrincipal: {
							$sum: { $toDouble: { $ifNull: ["$loanAmount", 0] } },
						},
						totalApproved: {
							$sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] },
						},
						totalPending: {
							$sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
						},
					},
				},
				{ $sort: { "_id.year": 1, "_id.month": 1 } },
			])
			.toArray();

		// Summary
		const summary = {
			total: loanAnalytics.reduce((sum, i) => sum + i.count, 0),
			totalPrincipal: loanAnalytics.reduce(
				(sum, i) => sum + i.totalPrincipal,
				0
			),
			totalInterest: loanAnalytics.reduce((sum, i) => sum + i.totalInterest, 0),
			totalProcessingFees: loanAnalytics.reduce(
				(sum, i) => sum + i.totalProcessingFees,
				0
			),
			pendingProcessingFees: loanAnalytics.reduce(
				(sum, i) => sum + i.pendingProcessingFees,
				0
			),
			totalLoanAmount: loanAnalytics.reduce(
				(sum, i) => sum + i.totalLoanAmount,
				0
			),
			unpaidFeeCount: loanAnalytics.reduce(
				(sum, i) => sum + i.unpaidFeeCount,
				0
			),
			avgLoanAmount:
				loanAnalytics.reduce((sum, i) => sum + i.avgLoanAmount, 0) /
				(loanAnalytics.length || 1),
			avgDuration:
				loanAnalytics.reduce((sum, i) => sum + i.avgDuration, 0) /
				(loanAnalytics.length || 1),
		};

		// Approval rate
		const approvedCount =
			statusBreakdown.find((i) => i._id === "approved")?.count || 0;
		const pendingCount =
			statusBreakdown.find((i) => i._id === "pending")?.count || 0;
		const rejectedCount =
			statusBreakdown.find((i) => i._id === "rejected")?.count || 0;
		const totalProcessed = approvedCount + rejectedCount;

		summary.approvalRate =
			totalProcessed > 0 ? (approvedCount / totalProcessed) * 100 : 0;
		summary.pendingCount = pendingCount;

		return NextResponse.json({
			status: "success",
			data: {
				period,
				loans: loanAnalytics,
				statusBreakdown,
				monthlyTrend,
				summary,
				metrics: {
					interestRate: LOAN_INTEREST_RATE,
					processingFeeRate: LOAN_PROCESSING_FEE_RATE,
				},
			},
		});
	} catch (error) {
		console.error("Loan analytics error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
