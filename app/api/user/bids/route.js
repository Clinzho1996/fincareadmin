// app/api/user/bids/route.js - Updated version
import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

export async function POST(request) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}
		const { auctionId, bidAmount, auctionType = "user" } = await request.json();

		if (!auctionId || !bidAmount) {
			return NextResponse.json(
				{ error: "Auction ID and bid amount are required" },
				{ status: 400 }
			);
		}

		const { db } = await connectToDatabase();
		const userId = new ObjectId(authResult.userId);
		const auctionObjectId = new ObjectId(auctionId);

		// Determine which collection to use based on auction type
		const auctionCollection =
			auctionType === "admin" ? "auctions" : "user_auctions";

		// Get auction details
		const auction = await db.collection(auctionCollection).findOne({
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

		// Check if user is not the owner (for user auctions)
		if (
			auctionType === "user" &&
			auction.ownerId &&
			auction.ownerId.equals(userId)
		) {
			return NextResponse.json(
				{ error: "Cannot bid on your own auction" },
				{ status: 400 }
			);
		}

		// Calculate minimum bid amount
		const currentBid = auction.currentBid || auction.startingPrice;
		const minBidIncrement = auction.minBidIncrement || 5;
		const minBidAmount = currentBid * (1 + minBidIncrement / 100);

		if (parseFloat(bidAmount) < minBidAmount) {
			return NextResponse.json(
				{
					error: `Bid must be at least ${minBidAmount.toFixed(
						2
					)} (${minBidIncrement}% increase)`,
					minBidAmount,
				},
				{ status: 400 }
			);
		}

		// Create bid with auction type information
		const newBid = {
			auctionId: auctionObjectId,
			auctionType: auctionType, // Store the auction type
			bidderId: userId,
			amount: parseFloat(bidAmount),
			status: "pending",
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const bidResult = await db.collection("bids").insertOne(newBid);

		// Update auction current bid
		await db.collection(auctionCollection).updateOne(
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
