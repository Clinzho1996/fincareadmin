// app/api/user/bids/route.js
import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

// POST: Place a bid
export async function POST(request) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}
		const { auctionId, bidAmount } = await request.json();

		if (!auctionId || !bidAmount) {
			return NextResponse.json(
				{ error: "Auction ID and bid amount are required" },
				{ status: 400 }
			);
		}

		const { db } = await connectToDatabase();
		const userId = new ObjectId(authResult.userId);
		const auctionObjectId = new ObjectId(auctionId);

		// Get auction details
		const auction = await db.collection("user_auctions").findOne({
			_id: auctionObjectId,
			status: "active",
			endDate: { $gt: new Date() },
		});

		if (!auction) {
			return NextResponse.json(
				{ error: "Auction not found or expired" },
				{ status: 404 }
			);
		}

		// Check if user is not the owner
		if (auction.ownerId.equals(userId)) {
			return NextResponse.json(
				{ error: "Cannot bid on your own auction" },
				{ status: 400 }
			);
		}

		// Calculate minimum bid amount
		const minBidAmount =
			auction.currentBid * (1 + auction.minBidIncrement / 100);

		if (parseFloat(bidAmount) < minBidAmount) {
			return NextResponse.json(
				{
					error: `Bid must be at least ${minBidAmount.toFixed(2)} (${
						auction.minBidIncrement
					}% increase)`,
					minBidAmount,
				},
				{ status: 400 }
			);
		}

		// Create bid
		const newBid = {
			auctionId: auctionObjectId,
			bidderId: userId,
			amount: parseFloat(bidAmount),
			status: "pending", // pending, accepted, rejected
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const bidResult = await db.collection("bids").insertOne(newBid);

		// Update auction current bid
		await db.collection("user_auctions").updateOne(
			{ _id: auctionObjectId },
			{
				$set: {
					currentBid: parseFloat(bidAmount),
					updatedAt: new Date(),
				},
			}
		);

		return NextResponse.json(
			{
				message: "Bid placed successfully",
				bidId: bidResult.insertedId,
				bid: newBid,
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error("POST /api/user/bids error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
