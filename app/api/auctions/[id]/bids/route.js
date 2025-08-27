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
				{ $sort: { amount: -1, createdAt: -1 } }, // Sort by highest bid first, then by time
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
export async function POST(request, { params }) {
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

		const { amount } = await request.json();

		if (!amount || amount <= 0) {
			return NextResponse.json(
				{ error: "Valid bid amount is required" },
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

		// Cannot bid on your own auction
		if (auction.userId.toString() === authResult.userId.toString()) {
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

		// Check if bid meets reserve price
		if (amount < auction.reservePrice) {
			return NextResponse.json(
				{ error: "Bid must meet or exceed reserve price" },
				{ status: 400 }
			);
		}

		// Check if bid is higher than current bid
		if (amount <= auction.currentBid) {
			return NextResponse.json(
				{ error: "Bid must be higher than current bid" },
				{ status: 400 }
			);
		}

		// Check if user has sufficient funds
		const user = await db
			.collection("users")
			.findOne({ _id: authResult.userId });
		if (user.savingsBalance < amount) {
			return NextResponse.json(
				{ error: "Insufficient funds to place bid" },
				{ status: 400 }
			);
		}

		// Reserve the bid amount (in a real app, this would be more sophisticated)
		await db
			.collection("users")
			.updateOne(
				{ _id: authResult.userId },
				{ $inc: { savingsBalance: -amount } }
			);

		// If there was a previous highest bid, refund that user
		if (auction.currentBid > 0) {
			const previousBid = await db
				.collection("bids")
				.findOne({ auctionId: new ObjectId(id), amount: auction.currentBid });

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

		// Create the new bid
		const newBid = {
			auctionId: new ObjectId(id),
			userId: authResult.userId,
			amount,
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
					currentBid: amount,
					updatedAt: new Date(),
				},
			}
		);

		// If this is the first bid, notify the auction owner
		if (auction.currentBid === 0) {
			const auctionOwner = await db
				.collection("users")
				.findOne({ _id: auction.userId });

			console.log(auctionOwner);
			// In a real app, you would send a notification or email here
			console.log(
				`Auction "${auction.auctionName}" has received its first bid of ${amount}`
			);
		}

		return NextResponse.json(
			{
				message: "Bid placed successfully",
				bidId: result.insertedId,
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
