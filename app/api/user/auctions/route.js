// app/api/user/auctions/route.js
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

// GET user's auctions and bids
export async function GET(request) {
	try {
		const session = await getServerSession();
		if (!session?.user?.id) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { searchParams } = new URL(request.url);
		const type = searchParams.get("type") || "my-auctions"; // my-auctions, my-bids, active

		const { db } = await connectToDatabase();
		const userId = new ObjectId(session.user.id);

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
						{ $match: { bidderId: userId } },
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
		const session = await getServerSession();
		if (!session?.user?.id) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
		const userId = new ObjectId(session.user.id);

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
		const session = await getServerSession();
		if (!session?.user?.id) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { action, auctionId, bidId } = await request.json();

		if (!action || !auctionId) {
			return NextResponse.json(
				{ error: "Action and auction ID are required" },
				{ status: 400 }
			);
		}

		const { db } = await connectToDatabase();
		const userId = new ObjectId(session.user.id);

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
