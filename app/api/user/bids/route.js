// app/api/user/bids/route.js
import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

// POST: Place a bid on a user auction
export async function POST(request) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}

		const { auctionId, amount, bidType, percentage } = await request.json();

		if (!auctionId || !amount) {
			return NextResponse.json(
				{ error: "Auction ID and bid amount are required" },
				{ status: 400 }
			);
		}

		const { db } = await connectToDatabase();
		const userId = new ObjectId(authResult.userId);
		const auctionObjectId = new ObjectId(auctionId);

		// Get user auction details
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

		let finalAmount = amount;

		// Handle percentage-based bidding for user auctions
		if (bidType === "percentage") {
			if (!percentage || percentage <= 0 || percentage > 100) {
				return NextResponse.json(
					{
						error:
							"Valid percentage between 1 and 100 is required for percentage bids",
					},
					{ status: 400 }
				);
			}

			// For user auctions, use current bid or starting price as base
			const baseAmount = auction.currentBid || auction.startingPrice || 0;

			if (baseAmount <= 0) {
				return NextResponse.json(
					{
						error:
							"Auction does not have a valid base amount for percentage bidding",
					},
					{ status: 400 }
				);
			}

			finalAmount = (percentage / 100) * baseAmount;
		}

		// Calculate minimum bid amount for user auctions
		const minBidIncrement = auction.minBidIncrement || 5;
		const minBidAmount =
			(auction.currentBid || auction.startingPrice || 0) *
			(1 + minBidIncrement / 100);

		if (finalAmount < minBidAmount) {
			return NextResponse.json(
				{
					error: `Bid must be at least ₦${minBidAmount.toFixed(
						2
					)} (${minBidIncrement}% increase)`,
					minBidAmount,
				},
				{ status: 400 }
			);
		}

		// Check if bid meets reserve price (if set)
		if (auction.reservePrice && finalAmount < auction.reservePrice) {
			return NextResponse.json(
				{
					error: `Bid must meet or exceed reserve price of ₦${auction.reservePrice.toLocaleString()}`,
				},
				{ status: 400 }
			);
		}

		// Check if user has sufficient funds
		const user = await db.collection("users").findOne({ _id: userId });

		if (!user || (user.savingsBalance || 0) < finalAmount) {
			return NextResponse.json(
				{ error: "Insufficient funds to place bid" },
				{ status: 400 }
			);
		}

		// Reserve the bid amount
		await db
			.collection("users")
			.updateOne({ _id: userId }, { $inc: { savingsBalance: -finalAmount } });

		// If there was a previous highest bid, refund that user
		if ((auction.currentBid || 0) > 0) {
			const previousBid = await db.collection("bids").findOne({
				auctionId: auctionObjectId,
				amount: auction.currentBid,
				status: "leading",
			});

			if (previousBid && previousBid.userId) {
				await db
					.collection("users")
					.updateOne(
						{ _id: previousBid.userId },
						{ $inc: { savingsBalance: previousBid.amount } }
					);

				// Update previous bid status
				await db
					.collection("bids")
					.updateOne(
						{ _id: previousBid._id },
						{ $set: { status: "outbid", updatedAt: new Date() } }
					);
			}
		}

		// Create the new bid
		const newBid = {
			auctionId: auctionObjectId,
			userId: userId,
			amount: finalAmount,
			bidType: bidType,
			...(bidType === "percentage" && { percentage: percentage }),
			status: "leading",
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const result = await db.collection("bids").insertOne(newBid);

		// Update user auction with new current bid
		await db.collection("user_auctions").updateOne(
			{ _id: auctionObjectId },
			{
				$set: {
					currentBid: finalAmount,
					updatedAt: new Date(),
				},
			}
		);

		return NextResponse.json(
			{
				message: "Bid placed successfully",
				bidId: result.insertedId,
				amount: finalAmount,
				bidType: bidType,
				...(bidType === "percentage" && { percentage: percentage }),
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
