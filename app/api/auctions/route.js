// app/api/auctions/route.js
import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
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

		const { db } = await connectToDatabase();
		const auctions = await db
			.collection("auctions")
			.find({ userId: authResult.userId })
			.toArray();

		return NextResponse.json({ auctions });
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
