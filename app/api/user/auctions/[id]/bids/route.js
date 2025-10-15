// app/api/user/auctions/[id]/bids/route.js
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET({ params }) {
	try {
		const session = await getServerSession();
		if (!session?.user?.id) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { id } = params;
		const { db } = await connectToDatabase();

		const bids = await db
			.collection("bids")
			.find({ auctionId: new ObjectId(id) })
			.sort({ amount: -1, createdAt: -1 })
			.toArray();

		return NextResponse.json({ bids });
	} catch (error) {
		console.error("GET /api/user/auctions/[id]/bids error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
