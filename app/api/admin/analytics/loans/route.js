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
		const dateRanges = {
			"7d": 7,
			"30d": 30,
			"90d": 90,
			"1y": 365,
		};

		const days = dateRanges[period] || 30;
		const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

		// Loan analytics with enhanced metrics
		const loanAnalytics = await db
			.collection("loans")
			.aggregate([
				{
					$match: {
						createdAt: { $gte: startDate },
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
						totalPrincipal: { $sum: "$loanAmount" },
						// Calculate interest for each loan (handle both old and new structures)
						totalInterest: {
							$sum: {
								$cond: {
									if: { $gt: ["$loanDetails.interestAmount", 0] },
									then: "$loanDetails.interestAmount",
									else: {
										$multiply: [
											"$loanAmount",
											LOAN_INTEREST_RATE,
											{ $divide: ["$duration", 12] },
										],
									},
								},
							},
						},
						// Calculate processing fees for each loan
						totalProcessingFees: {
							$sum: {
								$cond: {
									if: { $gt: ["$loanDetails.processingFee", 0] },
									then: "$loanDetails.processingFee",
									else: {
										$multiply: ["$loanAmount", LOAN_PROCESSING_FEE_RATE],
									},
								},
							},
						},
						// Calculate pending processing fees
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
											if: { $gt: ["$loanDetails.processingFee", 0] },
											then: "$loanDetails.processingFee",
											else: {
												$multiply: ["$loanAmount", LOAN_PROCESSING_FEE_RATE],
											},
										},
									},
									else: 0,
								},
							},
						},
						// Count loans with unpaid processing fees
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
						// Calculate total loan amount (principal + interest)
						totalLoanAmount: {
							$sum: {
								$cond: {
									if: { $gt: ["$loanDetails.totalLoanAmount", 0] },
									then: "$loanDetails.totalLoanAmount",
									else: {
										$add: [
											"$loanAmount",
											{
												$multiply: [
													"$loanAmount",
													LOAN_INTEREST_RATE,
													{ $divide: ["$duration", 12] },
												],
											},
										],
									},
								},
							},
						},
						// Calculate average loan metrics
						avgLoanAmount: { $avg: "$loanAmount" },
						avgDuration: { $avg: "$duration" },
					},
				},
				{
					$sort: { "_id.year": 1, "_id.month": 1 },
				},
			])
			.toArray();

		// Additional analytics for status breakdown
		const statusBreakdown = await db
			.collection("loans")
			.aggregate([
				{
					$match: {
						createdAt: { $gte: startDate },
					},
				},
				{
					$group: {
						_id: "$status",
						count: { $sum: 1 },
						totalAmount: { $sum: "$loanAmount" },
					},
				},
			])
			.toArray();

		// Monthly trend analysis
		const monthlyTrend = await db
			.collection("loans")
			.aggregate([
				{
					$match: {
						createdAt: { $gte: startDate },
					},
				},
				{
					$group: {
						_id: {
							month: { $month: "$createdAt" },
							year: { $year: "$createdAt" },
						},
						loanCount: { $sum: 1 },
						totalPrincipal: { $sum: "$loanAmount" },
						totalApproved: {
							$sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] },
						},
						totalPending: {
							$sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
						},
					},
				},
				{
					$sort: { "_id.year": 1, "_id.month": 1 },
				},
			])
			.toArray();

		// Calculate summary statistics
		const summary = {
			total: loanAnalytics.reduce((sum, item) => sum + item.count, 0),
			totalPrincipal: loanAnalytics.reduce(
				(sum, item) => sum + item.totalPrincipal,
				0
			),
			totalInterest: loanAnalytics.reduce(
				(sum, item) => sum + item.totalInterest,
				0
			),
			totalProcessingFees: loanAnalytics.reduce(
				(sum, item) => sum + item.totalProcessingFees,
				0
			),
			pendingProcessingFees: loanAnalytics.reduce(
				(sum, item) => sum + item.pendingProcessingFees,
				0
			),
			totalLoanAmount: loanAnalytics.reduce(
				(sum, item) => sum + item.totalLoanAmount,
				0
			),
			unpaidFeeCount: loanAnalytics.reduce(
				(sum, item) => sum + item.unpaidFeeCount,
				0
			),
			avgLoanAmount:
				loanAnalytics.reduce((sum, item) => sum + item.avgLoanAmount, 0) /
				loanAnalytics.length,
			avgDuration:
				loanAnalytics.reduce((sum, item) => sum + item.avgDuration, 0) /
				loanAnalytics.length,
		};

		// Calculate approval rate
		const approvedCount =
			statusBreakdown.find((item) => item._id === "approved")?.count || 0;
		const pendingCount =
			statusBreakdown.find((item) => item._id === "pending")?.count || 0;
		const rejectedCount =
			statusBreakdown.find((item) => item._id === "rejected")?.count || 0;
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
