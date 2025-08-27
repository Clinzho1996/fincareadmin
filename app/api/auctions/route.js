// app/api/auctions/route.js
import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

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
		const type = searchParams.get("type"); // "my-auctions" or "all"

		const { db } = await connectToDatabase();

		let query = {};

		if (type === "my-auctions") {
			// Get only user's auctions
			query.userId = authResult.userId;
		} else {
			// Get all active auctions (for browsing)
			query.status = "active";
		}

		const auctions = await db
			.collection("auctions")
			.find(query)
			.sort({ createdAt: -1 })
			.toArray();

		// For each auction, get bid count and highest bid
		const auctionsWithBidInfo = await Promise.all(
			auctions.map(async (auction) => {
				const bidCount = await db
					.collection("bids")
					.countDocuments({ auctionId: auction._id });

				const userBid = await db.collection("bids").findOne({
					auctionId: auction._id,
					userId: authResult.userId,
				});

				return {
					...auction,
					bidCount,
					userHasBid: !!userBid,
					userBidAmount: userBid?.amount || 0,
				};
			})
		);

		return NextResponse.json({ auctions: auctionsWithBidInfo });
	} catch (error) {
		console.error("GET /api/auctions error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

export async function POST(request) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}

		const { investmentId, auctionName, description, reservePrice, duration } =
			await request.json();

		if (!investmentId || !auctionName || !reservePrice || !duration) {
			return NextResponse.json(
				{
					error:
						"Investment ID, auction name, reserve price, and duration are required",
				},
				{ status: 400 }
			);
		}

		const { db } = await connectToDatabase();

		// Check if investment exists and belongs to user
		const investment = await db.collection("investments").findOne({
			_id: new ObjectId(investmentId),
			userId: authResult.userId,
		});

		if (!investment) {
			return NextResponse.json(
				{ error: "Investment not found" },
				{ status: 404 }
			);
		}

		// Check if investment is already in an active auction
		const existingAuction = await db.collection("auctions").findOne({
			investmentId: new ObjectId(investmentId),
			status: "active",
		});

		if (existingAuction) {
			return NextResponse.json(
				{ error: "This investment is already in an active auction" },
				{ status: 400 }
			);
		}

		const newAuction = {
			userId: authResult.userId,
			investmentId: new ObjectId(investmentId),
			investmentName: investment.investmentName,
			auctionName,
			description: description || "",
			reservePrice,
			currentBid: 0,
			duration, // in days
			status: "active",
			startDate: new Date(),
			endDate: new Date(Date.now() + duration * 24 * 60 * 60 * 1000),
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const result = await db.collection("auctions").insertOne(newAuction);

		// Update user's total auctions
		await db
			.collection("users")
			.updateOne({ _id: authResult.userId }, { $inc: { totalAuctions: 1 } });

		return NextResponse.json(
			{
				message: "Auction created successfully",
				auctionId: result.insertedId,
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error("POST /api/auctions error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
