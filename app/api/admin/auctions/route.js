// app/api/admin/auctions/route.js
import { authenticateAdmin } from "@/lib/middleware"; // separate admin auth middleware
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

// GET all auctions (admin view)
export async function GET() {
	try {
		const { db } = await connectToDatabase();
		const auctions = await db.collection("auctions").find({}).toArray();
		return NextResponse.json({ auctions });
	} catch (error) {
		console.error("GET /api/admin/auctions error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

// POST: Create a new auction
// app/api/admin/auction-investment/route.js

export async function POST(request) {
	try {
		const {
			name,
			amount,
			unitPrice,
			interestRate,
			maturityDate,
			image,
			auctionName,
			description,
			reservePrice,
			duration,
		} = await request.json();

		if (
			!name ||
			!amount ||
			!unitPrice ||
			!interestRate ||
			!maturityDate ||
			!auctionName ||
			!reservePrice ||
			!duration
		) {
			return NextResponse.json(
				{ error: "All fields are required" },
				{ status: 400 }
			);
		}

		const { db } = await connectToDatabase();

		// 1️⃣ Create investment
		const newInvestment = {
			name,
			amount,
			unitPrice,
			interestRate,
			maturityDate: new Date(maturityDate),
			image: image || null,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const investmentResult = await db
			.collection("admin_investments")
			.insertOne(newInvestment);

		// 2️⃣ Create auction for this investment
		const investmentId = investmentResult.insertedId;

		const newAuction = {
			investmentId,
			investmentName: name,
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

		const auctionResult = await db.collection("auctions").insertOne(newAuction);

		return NextResponse.json(
			{
				message: "Investment and auction created successfully",
				investmentId,
				auctionId: auctionResult.insertedId,
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error("POST /api/admin/auction-investment error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

// PUT: Update an auction by ID
export async function PUT(request) {
	try {
		const authResult = await authenticateAdmin(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}

		const { auctionId, ...updateData } = await request.json();
		if (!auctionId) {
			return NextResponse.json(
				{ error: "Auction ID is required" },
				{ status: 400 }
			);
		}

		const { db } = await connectToDatabase();
		updateData.updatedAt = new Date();

		const result = await db
			.collection("auctions")
			.updateOne({ _id: new ObjectId(auctionId) }, { $set: updateData });

		if (result.matchedCount === 0) {
			return NextResponse.json({ error: "Auction not found" }, { status: 404 });
		}

		return NextResponse.json({ message: "Auction updated successfully" });
	} catch (error) {
		console.error("PUT /api/admin/auctions error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

// DELETE: Delete an auction by ID
export async function DELETE(request) {
	try {
		const authResult = await authenticateAdmin(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}

		const { searchParams } = new URL(request.url);
		const auctionId = searchParams.get("auctionId");

		if (!auctionId) {
			return NextResponse.json(
				{ error: "Auction ID is required" },
				{ status: 400 }
			);
		}

		const { db } = await connectToDatabase();
		const result = await db
			.collection("auctions")
			.deleteOne({ _id: new ObjectId(auctionId) });

		if (result.deletedCount === 0) {
			return NextResponse.json({ error: "Auction not found" }, { status: 404 });
		}

		return NextResponse.json({ message: "Auction deleted successfully" });
	} catch (error) {
		console.error("DELETE /api/admin/auctions error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
