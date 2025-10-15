// app/api/user/auctions/[id]/bids/route.js
import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

// GET - Get all bids for a specific user auction
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

		// Check if user auction exists
		const auction = await db.collection("user_auctions").findOne({
			_id: new ObjectId(id),
		});

		if (!auction) {
			return NextResponse.json({ error: "Auction not found" }, { status: 404 });
		}

		// Get all bids for this user auction with user information
		const bids = await db
			.collection("bids")
			.aggregate([
				{ $match: { auctionId: new ObjectId(id) } },
				{ $sort: { amount: -1, createdAt: -1 } }, // Sort by highest bid first
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
						bidType: 1,
						percentage: 1,
						status: 1,
						createdAt: 1,
						updatedAt: 1,
						"user.firstName": 1,
						"user.lastName": 1,
						"user.email": 1,
						"user._id": 1,
					},
				},
			])
			.toArray();

		// Calculate bidding statistics
		const totalBids = bids.length;
		const uniqueBidders = [
			...new Set(bids.map((bid) => bid.userId?.toString())),
		].length;

		// Get current user's highest bid
		const currentUserId = authResult.userId;
		const userBids = bids.filter(
			(bid) => bid.user && bid.user[0]?._id?.toString() === currentUserId
		);
		const userHighestBid =
			userBids.length > 0 ? Math.max(...userBids.map((bid) => bid.amount)) : 0;

		const statistics = {
			totalBids,
			uniqueBidders,
			userHighestBid,
			userBidCount: userBids.length,
		};

		return NextResponse.json({
			auction: {
				_id: auction._id,
				title: auction.title,
				description: auction.description,
				reservePrice: auction.reservePrice,
				startingPrice: auction.startingPrice,
				currentBid: auction.currentBid,
				status: auction.status,
				endDate: auction.endDate,
				startDate: auction.startDate,
				minBidIncrement: auction.minBidIncrement,
				category: auction.category,
				itemCondition: auction.itemCondition,
				certificateDetails: auction.certificateDetails,
				createdAt: auction.createdAt,
				updatedAt: auction.updatedAt,
			},
			bids,
			statistics,
		});
	} catch (error) {
		console.error("GET /api/user/auctions/[id]/bids error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
