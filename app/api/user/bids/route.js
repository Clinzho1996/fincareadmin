// app/api/user/bids/route.js - FIXED WITH PROPER ESCROW SYSTEM
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
				{ status: authResult.status },
			);
		}

		const { auctionId, amount, bidType, percentage } = await request.json();

		// Validate required fields
		if (!auctionId || !amount) {
			return NextResponse.json(
				{ error: "Auction ID and bid amount are required" },
				{ status: 400 },
			);
		}

		const { db } = await connectToDatabase();
		const userId = new ObjectId(authResult.userId);

		// Get the auction
		const auction = await db.collection("user_auctions").findOne({
			_id: new ObjectId(auctionId),
		});

		if (!auction) {
			return NextResponse.json({ error: "Auction not found" }, { status: 404 });
		}

		// Check if auction is still active
		if (auction.status !== "active") {
			return NextResponse.json(
				{ error: "Auction is no longer active" },
				{ status: 400 },
			);
		}

		// Check if auction has ended
		if (new Date(auction.endDate) < new Date()) {
			return NextResponse.json({ error: "Auction has ended" }, { status: 400 });
		}

		// Check if user is the auction owner (cannot bid on own auction)
		if (auction.ownerId.toString() === userId.toString()) {
			return NextResponse.json(
				{ error: "You cannot bid on your own auction" },
				{ status: 400 },
			);
		}

		const currentBid = auction.currentBid || auction.startingPrice || 0;
		const hasReservePrice = auction.reservePrice && auction.reservePrice > 0;

		// VALIDATION 1: Check if bid is higher than current bid
		if (amount <= currentBid) {
			return NextResponse.json(
				{
					error: `Bid must be higher than current bid of ₦${Number(currentBid).toLocaleString()}`,
				},
				{ status: 400 },
			);
		}

		// VALIDATION 2: Check reserve price
		if (hasReservePrice && amount < auction.reservePrice) {
			return NextResponse.json(
				{
					error: `Reserve price of ₦${Number(auction.reservePrice).toLocaleString()} not met. You need ₦${Number(auction.reservePrice - amount).toLocaleString()} more.`,
				},
				{ status: 400 },
			);
		}

		// VALIDATION 3: Check minimum bid increment
		const minBidIncrement = auction.minBidIncrement || 5;
		const minIncrementAmount = currentBid * (1 + minBidIncrement / 100);
		const effectiveMinBid = hasReservePrice
			? Math.max(minIncrementAmount, auction.reservePrice)
			: minIncrementAmount;

		if (amount < effectiveMinBid) {
			const reason =
				hasReservePrice && auction.reservePrice > minIncrementAmount
					? `Reserve price of ₦${Number(auction.reservePrice).toLocaleString()}`
					: `${minBidIncrement}% increase from current bid of ₦${Number(currentBid).toLocaleString()}`;

			return NextResponse.json(
				{
					error: `Minimum bid is ₦${Number(effectiveMinBid).toLocaleString()} (${reason})`,
				},
				{ status: 400 },
			);
		}

		// Get user's current balance
		const user = await db.collection("users").findOne({
			_id: userId,
		});

		if (!user) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		const userBalance = user.savingsBalance || user.totalSavings || 0;

		// Check if user has enough balance for the bid
		if (amount > userBalance) {
			return NextResponse.json(
				{
					error: `Insufficient funds. You have ₦${Number(userBalance).toLocaleString()} available.`,
				},
				{ status: 400 },
			);
		}

		// ---- FIX: ESCROW SYSTEM ----
		// Check if user already has an active bid on this auction
		const existingUserBid = await db.collection("bids").findOne({
			auctionId: new ObjectId(auctionId),
			userId: userId,
			status: "leading",
		});

		if (existingUserBid) {
			// User already has a leading bid - refund their previous bid first
			await db.collection("users").updateOne(
				{ _id: userId },
				{
					$inc: {
						savingsBalance: existingUserBid.amount, // Refund previous bid
					},
				},
			);

			// Update old bid status
			await db.collection("bids").updateOne(
				{ _id: existingUserBid._id },
				{
					$set: {
						status: "replaced",
						updatedAt: new Date(),
					},
				},
			);
		}

		// Now deduct the NEW bid amount from user's balance
		await db.collection("users").updateOne(
			{ _id: userId },
			{
				$inc: {
					savingsBalance: -amount, // Deduct new bid
				},
				$set: {
					updatedAt: new Date(),
				},
			},
		);

		// Create the NEW bid
		const bidData = {
			auctionId: new ObjectId(auctionId),
			userId: userId,
			amount: amount,
			bidType: bidType || "absolute",
			percentage: bidType === "percentage" ? percentage : null,
			status: "leading",
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		// Insert the new bid
		const result = await db.collection("bids").insertOne(bidData);

		// Update the auction's current bid
		await db.collection("user_auctions").updateOne(
			{ _id: new ObjectId(auctionId) },
			{
				$set: {
					currentBid: amount,
					updatedAt: new Date(),
				},
			},
		);

		// Create notification for the bid
		const notification = {
			userId: userId,
			type: "bid_placed",
			title: "Bid Placed",
			message: `You placed a bid of ₦${Number(amount).toLocaleString()} on "${auction.title}"`,
			relatedAuctionId: new ObjectId(auctionId),
			isRead: false,
			createdAt: new Date(),
		};

		await db.collection("notifications").insertOne(notification);

		// ---- REFUND PREVIOUS LEADING BIDDER (if any and not the current user) ----
		if (currentBid > 0) {
			const previousLeadingBid = await db
				.collection("bids")
				.find({
					auctionId: new ObjectId(auctionId),
					userId: { $ne: userId },
					status: "leading",
				})
				.sort({ amount: -1 })
				.limit(1)
				.toArray();

			if (previousLeadingBid.length > 0) {
				const previousBid = previousLeadingBid[0];

				// REFUND the previous bidder
				await db.collection("users").updateOne(
					{ _id: previousBid.userId },
					{
						$inc: {
							savingsBalance: previousBid.amount,
						},
					},
				);

				// Update previous bid status
				await db.collection("bids").updateOne(
					{ _id: previousBid._id },
					{
						$set: {
							status: "outbid",
							updatedAt: new Date(),
						},
					},
				);

				// Create notification for outbid user
				const outbidNotification = {
					userId: previousBid.userId,
					type: "outbid",
					title: "You've Been Outbid!",
					message: `Your bid of ₦${Number(previousBid.amount).toLocaleString()} on "${auction.title}" has been surpassed by ₦${Number(amount - previousBid.amount).toLocaleString()}`,
					relatedAuctionId: new ObjectId(auctionId),
					isRead: false,
					createdAt: new Date(),
				};

				await db.collection("notifications").insertOne(outbidNotification);
			}
		}

		return NextResponse.json(
			{
				success: true,
				message: "Bid placed successfully",
				bid: {
					_id: result.insertedId,
					...bidData,
				},
			},
			{ status: 201 },
		);
	} catch (error) {
		console.error("POST /api/user/bids error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// GET - Get user's bids
export async function GET(request) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status },
			);
		}

		const { searchParams } = new URL(request.url);
		const auctionId = searchParams.get("auctionId");
		const status = searchParams.get("status");

		const { db } = await connectToDatabase();
		const userId = new ObjectId(authResult.userId);

		const query = { userId: userId };

		if (auctionId) {
			query.auctionId = new ObjectId(auctionId);
		}

		if (status) {
			query.status = status;
		}

		const bids = await db
			.collection("bids")
			.find(query)
			.sort({ createdAt: -1 })
			.toArray();

		// Get auction details for each bid
		const bidsWithAuction = await Promise.all(
			bids.map(async (bid) => {
				const auction = await db.collection("user_auctions").findOne({
					_id: bid.auctionId,
				});
				return {
					...bid,
					auction: auction || null,
				};
			}),
		);

		return NextResponse.json({
			bids: bidsWithAuction,
		});
	} catch (error) {
		console.error("GET /api/user/bids error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
