// app/api/auctions/[id]/bids/route.js
import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

// GET - Get all bids for a specific auction
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
						"user.firstName": 1,
						"user.lastName": 1,
						"user.email": 1,
					},
				},
			])
			.toArray();

		return NextResponse.json({
			auction: {
				_id: auction._id,
				auctionName: auction.auctionName,
				reservePrice: auction.reservePrice,
				currentBid: auction.currentBid,
				status: auction.status,
				endDate: auction.endDate,
			},
			bids,
		});
	} catch (error) {
		console.error("GET /api/auctions/[id]/bids error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

// POST - Place a new bid on an auction
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

		// Extract userId from the token directly since authResult doesn't contain it
		const authHeader = request.headers.get("authorization");
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return NextResponse.json(
				{ error: "Authorization header missing or invalid" },
				{ status: 401 }
			);
		}

		const token = authHeader.replace("Bearer ", "");
		let userId;

		try {
			// Decode the JWT token to get the userId
			const payload = JSON.parse(
				Buffer.from(token.split(".")[1], "base64").toString()
			);
			userId = payload.userId;
			console.log("Token successfully decoded, userId:", userId);
		} catch (e) {
			console.error("Failed to decode token:", e);
			return NextResponse.json({ error: "Invalid token" }, { status: 401 });
		}

		if (!userId) {
			return NextResponse.json(
				{ error: "User authentication failed - no user ID found in token" },
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
			if (!auction.totalInvestmentValue || auction.totalInvestmentValue <= 0) {
				return NextResponse.json(
					{
						error:
							"Auction does not have a valid total investment value for percentage bidding",
					},
					{ status: 400 }
				);
			}

			finalAmount = (percentage / 100) * auction.totalInvestmentValue;
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
		if (finalAmount < auction.reservePrice) {
			return NextResponse.json(
				{
					error: `Bid must meet or exceed reserve price of ₦${auction.reservePrice.toLocaleString()}`,
				},
				{ status: 400 }
			);
		}

		// Check if bid is higher than current bid
		if (finalAmount <= auction.currentBid) {
			return NextResponse.json(
				{
					error: `Bid must be higher than current bid of ₦${auction.currentBid.toLocaleString()}`,
				},
				{ status: 400 }
			);
		}

		// Check if user has sufficient funds
		const user = await db
			.collection("users")
			.findOne({ _id: new ObjectId(userId) });

		if (!user || user.savingsBalance < finalAmount) {
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
		if (auction.currentBid > 0) {
			const previousBid = await db.collection("bids").findOne({
				auctionId: new ObjectId(id),
				amount: auction.currentBid,
				status: "leading",
			});

			if (previousBid) {
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

		// If this is the first bid, notify the auction owner
		if (auction.currentBid === 0) {
			const auctionOwner = await db
				.collection("users")
				.findOne({ _id: auction.userId });

			if (auctionOwner) {
				console.log(
					`Auction "${auction.auctionName}" has received its first bid of ${finalAmount}`
				);
				// In a real app, send notification/email to auctionOwner.email
			}
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
