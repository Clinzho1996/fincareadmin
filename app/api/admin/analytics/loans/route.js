// app/api/admin/analytics/loans/route.js (Simplified)
import { connectToDatabase } from "@/lib/mongodb";
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

const LOAN_INTEREST_RATE = 0.1;
const LOAN_PROCESSING_FEE_RATE = 0.01;
const DEFAULT_LOAN_DURATION = 12;

export async function GET(request) {
	try {
		const token = await getToken({ req: request });
		if (!token || (token.role !== "admin" && token.role !== "super_admin")) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
		}

		const { db } = await connectToDatabase();

		// Get all loans first and process in JavaScript
		const loans = await db.collection("loans").find({}).toArray();

		// Process analytics in JavaScript instead of MongoDB aggregation
		const analytics = processLoansAnalytics(loans);

		return NextResponse.json({
			status: "success",
			data: analytics,
		});
	} catch (error) {
		console.error("Loan analytics error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

function processLoansAnalytics(loans) {
	const now = new Date();
	const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

	const recentLoans = loans.filter(
		(loan) => new Date(loan.createdAt) >= thirtyDaysAgo
	);

	const summary = {
		total: recentLoans.length,
		totalPrincipal: 0,
		totalInterest: 0,
		totalProcessingFees: 0,
		pendingProcessingFees: 0,
		totalLoanAmount: 0,
		unpaidFeeCount: 0,
		avgLoanAmount: 0,
		avgDuration: 0,
		approvalRate: 0,
		pendingCount: 0,
	};

	const statusBreakdown = {};
	const monthlyTrend = {};

	recentLoans.forEach((loan) => {
		// Parse duration
		let duration = DEFAULT_LOAN_DURATION;
		if (typeof loan.duration === "number") {
			duration = loan.duration;
		} else if (typeof loan.duration === "string") {
			const match = loan.duration.match(/(\d+)/);
			duration = match ? parseInt(match[1]) : DEFAULT_LOAN_DURATION;
		}

		// Parse loan amount
		const loanAmount =
			typeof loan.loanAmount === "number" ? loan.loanAmount : 0;

		// Calculate financials
		const processingFee =
			loan.loanDetails?.processingFee || loanAmount * LOAN_PROCESSING_FEE_RATE;
		const interestAmount =
			loan.loanDetails?.interestAmount ||
			loanAmount * LOAN_INTEREST_RATE * (duration / 12);
		const totalLoanAmount =
			loan.loanDetails?.totalLoanAmount || loanAmount + interestAmount;
		const processingFeePaid = loan.loanDetails?.processingFeePaid || false;

		// Update summary
		summary.totalPrincipal += loanAmount;
		summary.totalInterest += interestAmount;
		summary.totalProcessingFees += processingFee;
		summary.totalLoanAmount += totalLoanAmount;

		if (!processingFeePaid) {
			summary.pendingProcessingFees += processingFee;
			summary.unpaidFeeCount += 1;
		}

		// Update status breakdown
		const status = loan.status || "unknown";
		if (!statusBreakdown[status]) {
			statusBreakdown[status] = { count: 0, totalAmount: 0 };
		}
		statusBreakdown[status].count += 1;
		statusBreakdown[status].totalAmount += loanAmount;

		// Update monthly trend
		const loanDate = new Date(loan.createdAt);
		const monthYear = `${loanDate.getFullYear()}-${loanDate.getMonth() + 1}`;
		if (!monthlyTrend[monthYear]) {
			monthlyTrend[monthYear] = {
				loanCount: 0,
				totalPrincipal: 0,
				totalApproved: 0,
				totalPending: 0,
			};
		}
		monthlyTrend[monthYear].loanCount += 1;
		monthlyTrend[monthYear].totalPrincipal += loanAmount;
		if (status === "approved") monthlyTrend[monthYear].totalApproved += 1;
		if (status === "pending") monthlyTrend[monthYear].totalPending += 1;
	});

	// Calculate averages
	summary.avgLoanAmount =
		recentLoans.length > 0 ? summary.totalPrincipal / recentLoans.length : 0;

	// Calculate approval rate
	const approved = statusBreakdown.approved?.count || 0;
	const rejected = statusBreakdown.rejected?.count || 0;
	summary.approvalRate =
		approved + rejected > 0 ? (approved / (approved + rejected)) * 100 : 0;
	summary.pendingCount = statusBreakdown.pending?.count || 0;

	return {
		period: "30d",
		loans: Object.entries(statusBreakdown).map(([status, data]) => ({
			_id: { status },
			count: data.count,
			totalPrincipal: data.totalAmount,
		})),
		statusBreakdown: Object.entries(statusBreakdown).map(([status, data]) => ({
			_id: status,
			count: data.count,
			totalAmount: data.totalAmount,
		})),
		monthlyTrend: Object.entries(monthlyTrend).map(([monthYear, data]) => {
			const [year, month] = monthYear.split("-");
			return {
				_id: { year: parseInt(year), month: parseInt(month) },
				...data,
			};
		}),
		summary,
		metrics: {
			interestRate: LOAN_INTEREST_RATE,
			processingFeeRate: LOAN_PROCESSING_FEE_RATE,
		},
	};
}
