// app/api/auctions/[id]/bids/route.js - Fixed version
import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

// POST - Place a new bid on an auction
export async function POST(request, { params }) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}

		// Use the userId from authResult instead of manual token decoding
		const userId = authResult.userId;

		if (!userId) {
			return NextResponse.json(
				{ error: "User authentication failed - no user ID found" },
				{ status: 401 }
			);
		}

		const { id } = params;

		if (!ObjectId.isValid(id)) {
			return NextResponse.json(
				{ error: "Invalid auction ID" },
				{ status: 400 }
			);
		}

		const { amount, bidType, percentage } = await request.json();

		// Validate bid type
		if (!bidType || (bidType !== "absolute" && bidType !== "percentage")) {
			return NextResponse.json(
				{ error: "Valid bid type is required (absolute or percentage)" },
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

		// Check if auction has a userId - if not, it might be an admin-created auction
		// Remove the strict check since some auctions might not have userId
		if (!auction.userId) {
			console.log("Auction has no userId, allowing bid placement");
			// Continue with bid placement instead of returning error
		} else {
			// Convert both IDs to string for safe comparison
			const auctionUserIdStr = auction.userId.toString();
			const authUserIdStr = userId.toString();

			// Cannot bid on your own auction
			if (auctionUserIdStr === authUserIdStr) {
				return NextResponse.json(
					{ error: "Cannot bid on your own auction" },
					{ status: 400 }
				);
			}
		}

		// Check if auction is active
		if (auction.status !== "active") {
			return NextResponse.json(
				{ error: "Auction is not active" },
				{ status: 400 }
			);
		}

		// Check if auction has ended
		if (new Date() > new Date(auction.endDate)) {
			return NextResponse.json({ error: "Auction has ended" }, { status: 400 });
		}

		let finalAmount = amount;

		// Handle percentage-based bidding
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

			// Calculate amount based on percentage of total investment value
			// If no totalInvestmentValue, use current bid or starting price as fallback
			const baseAmount =
				auction.totalInvestmentValue ||
				auction.currentBid ||
				auction.startingPrice ||
				auction.reservePrice ||
				0;

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
		} else {
			// Validate absolute amount
			if (!amount || amount <= 0) {
				return NextResponse.json(
					{ error: "Valid bid amount is required" },
					{ status: 400 }
				);
			}
		}

		// Check if bid meets reserve price
		if (finalAmount < (auction.reservePrice || 0)) {
			return NextResponse.json(
				{
					error: `Bid must meet or exceed reserve price of ₦${(
						auction.reservePrice || 0
					).toLocaleString()}`,
				},
				{ status: 400 }
			);
		}

		// Check if bid is higher than current bid
		if (finalAmount <= (auction.currentBid || 0)) {
			return NextResponse.json(
				{
					error: `Bid must be higher than current bid of ₦${(
						auction.currentBid || 0
					).toLocaleString()}`,
				},
				{ status: 400 }
			);
		}

		// Check if user has sufficient funds
		const user = await db
			.collection("users")
			.findOne({ _id: new ObjectId(userId) });

		if (!user || (user.savingsBalance || 0) < finalAmount) {
			return NextResponse.json(
				{ error: "Insufficient funds to place bid" },
				{ status: 400 }
			);
		}

		// Reserve the bid amount
		await db
			.collection("users")
			.updateOne(
				{ _id: new ObjectId(userId) },
				{ $inc: { savingsBalance: -finalAmount } }
			);

		// If there was a previous highest bid, refund that user
		if ((auction.currentBid || 0) > 0) {
			const previousBid = await db.collection("bids").findOne({
				auctionId: new ObjectId(id),
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

		// Create the new bid with bid type and percentage if applicable
		const newBid = {
			auctionId: new ObjectId(id),
			userId: new ObjectId(userId),
			amount: finalAmount,
			bidType: bidType,
			...(bidType === "percentage" && { percentage: percentage }),
			status: "leading",
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const result = await db.collection("bids").insertOne(newBid);

		// Update auction with new current bid
		await db.collection("auctions").updateOne(
			{ _id: new ObjectId(id) },
			{
				$set: {
					currentBid: finalAmount,
					updatedAt: new Date(),
				},
			}
		);

		// If this is the first bid, log it (remove owner notification if no userId)
		if ((auction.currentBid || 0) === 0) {
			console.log(
				`Auction "${auction.auctionName}" has received its first bid of ${finalAmount}`
			);
		}

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
		console.error("POST /api/auctions/[id]/bids error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
