// app/api/admin/auctions/[id]/bids/route.js
import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}

		const { id } = params;

		if (!ObjectId.isValid(id)) {
			return NextResponse.json(
				{ error: "Invalid auction ID" },
				{ status: 400 }
			);
		}

		const { db } = await connectToDatabase();

		// Check if auction exists
		const auction = await db.collection("auctions").findOne({
			_id: new ObjectId(id),
		});

		if (!auction) {
			return NextResponse.json({ error: "Auction not found" }, { status: 404 });
		}

		// Get all bids for this auction with user information
		const bids = await db
			.collection("bids")
			.aggregate([
				{ $match: { auctionId: new ObjectId(id) } },
				{ $sort: { amount: -1, createdAt: -1 } },
				{
					$lookup: {
						from: "users",
						localField: "userId",
						foreignField: "_id",
						as: "user",
					},
				},
				{
					$project: {
						amount: 1,
						status: 1,
						createdAt: 1,
						bidType: 1,
						percentage: 1,
						"user.firstName": 1,
						"user.lastName": 1,
						"user.email": 1,
						"user.membershipLevel": 1,
					},
				},
			])
			.toArray();

		// Calculate bidding statistics
		const biddingStats = calculateBiddingStatistics(bids, auction);

		// Calculate average prices based on different criteria
		const averagePrices = calculateAveragePrices(bids);

		// Calculate percentage-based bidding analysis
		const percentageAnalysis = analyzePercentageBidding(bids);

		return NextResponse.json({
			auction: {
				_id: auction._id,
				auctionName: auction.auctionName,
				reservePrice: auction.reservePrice,
				currentBid: auction.currentBid,
				status: auction.status,
				endDate: auction.endDate,
				totalInvestmentValue: auction.totalInvestmentValue,
			},
			bids,
			statistics: {
				...biddingStats,
				...averagePrices,
				percentageAnalysis,
			},
		});
	} catch (error) {
		console.error("GET /api/admin/auctions/[id]/bids error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

// Helper function to calculate bidding statistics
function calculateBiddingStatistics(bids, auction) {
	if (bids.length === 0) {
		return {
			totalBids: 0,
			uniqueBidders: 0,
			bidAmountRange: { min: 0, max: 0 },
			reservePriceMet: false,
			reservePricePercentage: 0,
		};
	}

	const bidAmounts = bids.map((bid) => bid.amount);
	const uniqueBidders = new Set(bids.map((bid) => bid.userId)).size;

	// Calculate percentage of reserve price
	const highestBid = Math.max(...bidAmounts);
	const reservePriceMet = highestBid >= auction.reservePrice;
	const reservePricePercentage =
		auction.reservePrice > 0 ? (highestBid / auction.reservePrice) * 100 : 0;

	return {
		totalBids: bids.length,
		uniqueBidders,
		bidAmountRange: {
			min: Math.min(...bidAmounts),
			max: highestBid,
			range: Math.max(...bidAmounts) - Math.min(...bidAmounts),
		},
		reservePriceMet,
		reservePricePercentage: Math.round(reservePricePercentage),
		timeUntilEnd: auction.endDate
			? new Date(auction.endDate) - new Date()
			: null,
	};
}

// Helper function to calculate average prices
function calculateAveragePrices(bids) {
	if (bids.length === 0) {
		return {
			averageBid: 0,
			medianBid: 0,
			averageByMembership: {},
			averageByBidType: {},
		};
	}

	const bidAmounts = bids.map((bid) => bid.amount).sort((a, b) => a - b);

	// Calculate average bid
	const averageBid =
		bidAmounts.reduce((sum, amount) => sum + amount, 0) / bids.length;

	// Calculate median bid
	const mid = Math.floor(bidAmounts.length / 2);
	const medianBid =
		bidAmounts.length % 2 !== 0
			? bidAmounts[mid]
			: (bidAmounts[mid - 1] + bidAmounts[mid]) / 2;

	// Calculate average by membership level
	const membershipStats = {};
	bids.forEach((bid) => {
		const membershipLevel = bid.user?.[0]?.membershipLevel || "unknown";
		if (!membershipStats[membershipLevel]) {
			membershipStats[membershipLevel] = { total: 0, count: 0 };
		}
		membershipStats[membershipLevel].total += bid.amount;
		membershipStats[membershipLevel].count += 1;
	});

	const averageByMembership = {};
	Object.keys(membershipStats).forEach((level) => {
		averageByMembership[level] =
			membershipStats[level].total / membershipStats[level].count;
	});

	// Calculate average by bid type
	const bidTypeStats = {};
	bids.forEach((bid) => {
		const bidType = bid.bidType || "absolute";
		if (!bidTypeStats[bidType]) {
			bidTypeStats[bidType] = { total: 0, count: 0 };
		}
		bidTypeStats[bidType].total += bid.amount;
		bidTypeStats[bidType].count += 1;
	});

	const averageByBidType = {};
	Object.keys(bidTypeStats).forEach((type) => {
		averageByBidType[type] =
			bidTypeStats[type].total / bidTypeStats[type].count;
	});

	return {
		averageBid: Math.round(averageBid),
		medianBid: Math.round(medianBid),
		averageByMembership: Object.fromEntries(
			Object.entries(averageByMembership).map(([k, v]) => [k, Math.round(v)])
		),
		averageByBidType: Object.fromEntries(
			Object.entries(averageByBidType).map(([k, v]) => [k, Math.round(v)])
		),
	};
}

// Helper function to analyze percentage-based bidding
function analyzePercentageBidding(bids) {
	const percentageBids = bids.filter(
		(bid) => bid.bidType === "percentage" && bid.percentage
	);
	const absoluteBids = bids.filter(
		(bid) => bid.bidType === "absolute" || !bid.bidType
	);

	if (percentageBids.length === 0) {
		return {
			totalPercentageBids: 0,
			percentageBidStats: null,
			conversionComparison: null,
		};
	}

	// Calculate statistics for percentage bids
	const percentages = percentageBids.map((bid) => bid.percentage);
	const percentageValues = percentageBids.map((bid) => bid.amount);

	const percentageStats = {
		averagePercentage:
			percentages.reduce((sum, p) => sum + p, 0) / percentageBids.length,
		minPercentage: Math.min(...percentages),
		maxPercentage: Math.max(...percentages),
		averageValue:
			percentageValues.reduce((sum, v) => sum + v, 0) / percentageBids.length,
	};

	// Compare with absolute bids
	let absoluteAverage = 0;
	if (absoluteBids.length > 0) {
		const absoluteAmounts = absoluteBids.map((bid) => bid.amount);
		absoluteAverage =
			absoluteAmounts.reduce((sum, a) => sum + a, 0) / absoluteBids.length;
	}

	const conversionComparison = {
		percentageBidAverage: percentageStats.averageValue,
		absoluteBidAverage: absoluteAverage,
		difference: percentageStats.averageValue - absoluteAverage,
		percentageDifference:
			absoluteAverage > 0
				? ((percentageStats.averageValue - absoluteAverage) / absoluteAverage) *
				  100
				: 0,
	};

	// Analyze percentage distribution
	const percentageDistribution = {
		"0-10%": percentages.filter((p) => p <= 10).length,
		"11-20%": percentages.filter((p) => p > 10 && p <= 20).length,
		"21-30%": percentages.filter((p) => p > 20 && p <= 30).length,
		"31-40%": percentages.filter((p) => p > 30 && p <= 40).length,
		"41-50%": percentages.filter((p) => p > 40 && p <= 50).length,
		"51%+": percentages.filter((p) => p > 50).length,
	};

	return {
		totalPercentageBids: percentageBids.length,
		percentageBidStats: {
			averagePercentage:
				Math.round(percentageStats.averagePercentage * 10) / 10,
			minPercentage: Math.round(percentageStats.minPercentage * 10) / 10,
			maxPercentage: Math.round(percentageStats.maxPercentage * 10) / 10,
			averageValue: Math.round(percentageStats.averageValue),
		},
		conversionComparison: {
			...conversionComparison,
			percentageDifference:
				Math.round(conversionComparison.percentageDifference * 10) / 10,
		},
		percentageDistribution,
		mostCommonPercentage: findMode(percentages),
	};
}

// Helper function to find mode (most frequent value)
function findMode(array) {
	if (array.length === 0) return null;

	const frequency = {};
	let maxCount = 0;
	let mode = null;

	array.forEach((value) => {
		const rounded = Math.round(value);
		frequency[rounded] = (frequency[rounded] || 0) + 1;

		if (frequency[rounded] > maxCount) {
			maxCount = frequency[rounded];
			mode = rounded;
		}
	});

	return mode;
}
