// app/api/user/auctions/route.js - COMPLETE VERSION
import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

// Helper function to accept a bid
async function acceptBid(db, auctionId, bidId, userId) {
	try {
		const auctionObjectId = new ObjectId(auctionId);
		const bidObjectId = new ObjectId(bidId);

		// Get the bid details
		const bid = await db.collection("bids").findOne({
			_id: bidObjectId,
			auctionId: auctionObjectId,
		});

		if (!bid) {
			return NextResponse.json({ error: "Bid not found" }, { status: 404 });
		}

		// Update the bid status to accepted
		await db.collection("bids").updateOne(
			{ _id: bidObjectId },
			{
				$set: {
					status: "accepted",
					updatedAt: new Date(),
				},
			}
		);

		// Update all other bids for this auction to rejected
		await db.collection("bids").updateMany(
			{
				auctionId: auctionObjectId,
				_id: { $ne: bidObjectId },
			},
			{
				$set: {
					status: "rejected",
					updatedAt: new Date(),
				},
			}
		);

		// Close the auction
		await db.collection("user_auctions").updateOne(
			{ _id: auctionObjectId },
			{
				$set: {
					status: "completed",
					winningBidId: bidObjectId,
					winningBidAmount: bid.amount,
					winnerId: bid.userId,
					updatedAt: new Date(),
				},
			}
		);

		// Notify the winning bidder (in a real app, you might send an email/push notification)
		console.log(`Bid accepted: ${bidId} for auction: ${auctionId}`);

		return NextResponse.json({
			message: "Bid accepted successfully! Auction is now closed.",
			winningBid: {
				bidId: bid._id,
				amount: bid.amount,
				bidderId: bid.userId,
			},
		});
	} catch (error) {
		console.error("Error accepting bid:", error);
		return NextResponse.json(
			{ error: "Failed to accept bid" },
			{ status: 500 }
		);
	}
}

// Helper function to close an auction
async function closeAuction(db, auctionId, userId) {
	try {
		const auctionObjectId = new ObjectId(auctionId);

		// Close the auction
		const result = await db.collection("user_auctions").updateOne(
			{
				_id: auctionObjectId,
				ownerId: userId,
			},
			{
				$set: {
					status: "completed",
					updatedAt: new Date(),
				},
			}
		);

		if (result.matchedCount === 0) {
			return NextResponse.json(
				{ error: "Auction not found or unauthorized" },
				{ status: 404 }
			);
		}

		// Update all bids for this auction to reflect auction closure
		await db.collection("bids").updateMany(
			{ auctionId: auctionObjectId },
			{
				$set: {
					status: "auction_closed",
					updatedAt: new Date(),
				},
			}
		);

		return NextResponse.json({
			message: "Auction closed successfully!",
		});
	} catch (error) {
		console.error("Error closing auction:", error);
		return NextResponse.json(
			{ error: "Failed to close auction" },
			{ status: 500 }
		);
	}
}

// Helper function to cancel an auction
async function cancelAuction(db, auctionId, userId) {
	try {
		const auctionObjectId = new ObjectId(auctionId);

		// Cancel the auction
		const result = await db.collection("user_auctions").updateOne(
			{
				_id: auctionObjectId,
				ownerId: userId,
			},
			{
				$set: {
					status: "cancelled",
					updatedAt: new Date(),
				},
			}
		);

		if (result.matchedCount === 0) {
			return NextResponse.json(
				{ error: "Auction not found or unauthorized" },
				{ status: 404 }
			);
		}

		// Refund all bidders
		const bids = await db
			.collection("bids")
			.find({
				auctionId: auctionObjectId,
				status: "leading", // Only refund active leading bids
			})
			.toArray();

		// Refund each bidder
		for (const bid of bids) {
			await db
				.collection("users")
				.updateOne(
					{ _id: bid.userId },
					{ $inc: { savingsBalance: bid.amount } }
				);

			// Update bid status
			await db.collection("bids").updateOne(
				{ _id: bid._id },
				{
					$set: {
						status: "refunded",
						updatedAt: new Date(),
					},
				}
			);
		}

		return NextResponse.json({
			message: "Auction cancelled successfully! All bids have been refunded.",
		});
	} catch (error) {
		console.error("Error cancelling auction:", error);
		return NextResponse.json(
			{ error: "Failed to cancel auction" },
			{ status: 500 }
		);
	}
}

// GET user's auctions and bids
export async function GET(request) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}
		const { searchParams } = new URL(request.url);
		const type = searchParams.get("type") || "my-auctions"; // my-auctions, my-bids, active

		const { db } = await connectToDatabase();
		const userId = new ObjectId(authResult.userId);

		switch (type) {
			case "my-auctions":
				const myAuctions = await db
					.collection("user_auctions")
					.find({ ownerId: userId })
					.sort({ createdAt: -1 })
					.toArray();
				return NextResponse.json({ auctions: myAuctions });

			case "my-bids":
				const myBids = await db
					.collection("bids")
					.aggregate([
						{ $match: { userId: userId } }, // Changed from bidderId to userId
						{ $sort: { createdAt: -1 } },
						{
							$lookup: {
								from: "user_auctions",
								localField: "auctionId",
								foreignField: "_id",
								as: "auction",
							},
						},
						{ $unwind: "$auction" },
					])
					.toArray();
				return NextResponse.json({ bids: myBids });

			case "active":
				const activeAuctions = await db
					.collection("user_auctions")
					.find({
						status: "active",
						endDate: { $gt: new Date() },
					})
					.sort({ createdAt: -1 })
					.toArray();
				return NextResponse.json({ auctions: activeAuctions });

			default:
				return NextResponse.json({ error: "Invalid type" }, { status: 400 });
		}
	} catch (error) {
		console.error("GET /api/user/auctions error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

// POST: Create a new user auction
export async function POST(request) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}
		const {
			title,
			description,
			category,
			startingPrice,
			reservePrice,
			duration, // in days
			minBidIncrement, // minimum bid percentage increase
			images,
			itemCondition,
			certificateDetails, // for investment certificates
		} = await request.json();

		if (!title || !startingPrice || !duration || !minBidIncrement) {
			return NextResponse.json(
				{
					error:
						"Title, starting price, duration, and minimum bid increment are required",
				},
				{ status: 400 }
			);
		}

		const { db } = await connectToDatabase();
		const userId = new ObjectId(authResult.userId);

		const newAuction = {
			ownerId: userId,
			title,
			description: description || "",
			category: category || "general",
			startingPrice: parseFloat(startingPrice),
			reservePrice: reservePrice ? parseFloat(reservePrice) : null,
			currentBid: parseFloat(startingPrice),
			minBidIncrement: parseFloat(minBidIncrement), // percentage
			duration: parseInt(duration),
			itemCondition: itemCondition || "used",
			certificateDetails: certificateDetails || null,
			images: images || [],
			status: "active",
			startDate: new Date(),
			endDate: new Date(Date.now() + parseInt(duration) * 24 * 60 * 60 * 1000),
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const result = await db.collection("user_auctions").insertOne(newAuction);

		return NextResponse.json(
			{
				message: "Auction created successfully",
				auctionId: result.insertedId,
				auction: newAuction,
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error("POST /api/user/auctions error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

// PUT: Update auction (accept bid, close auction, etc.)
export async function PUT(request) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}
		const { action, auctionId, bidId } = await request.json();

		if (!action || !auctionId) {
			return NextResponse.json(
				{ error: "Action and auction ID are required" },
				{ status: 400 }
			);
		}

		const { db } = await connectToDatabase();
		const userId = new ObjectId(authResult.userId);

		// Verify user owns the auction
		const auction = await db.collection("user_auctions").findOne({
			_id: new ObjectId(auctionId),
			ownerId: userId,
		});

		if (!auction) {
			return NextResponse.json(
				{ error: "Auction not found or unauthorized" },
				{ status: 404 }
			);
		}

		switch (action) {
			case "accept_bid":
				if (!bidId) {
					return NextResponse.json(
						{ error: "Bid ID is required for accept_bid action" },
						{ status: 400 }
					);
				}
				return await acceptBid(db, auctionId, bidId, userId);

			case "close_auction":
				return await closeAuction(db, auctionId, userId);

			case "cancel_auction":
				return await cancelAuction(db, auctionId, userId);

			default:
				return NextResponse.json({ error: "Invalid action" }, { status: 400 });
		}
	} catch (error) {
		console.error("PUT /api/user/auctions error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
