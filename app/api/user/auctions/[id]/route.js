// app/api/user/auctions/[id]/route.js
import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

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
		const { db } = await connectToDatabase();
		const userId = new ObjectId(authResult.userId);

		const auction = await db.collection("user_auctions").findOne({
			_id: new ObjectId(id),
			ownerId: userId,
		});

		if (!auction) {
			return NextResponse.json({ error: "Auction not found" }, { status: 404 });
		}

		return NextResponse.json({ auction });
	} catch (error) {
		console.error("GET /api/user/auctions/[id] error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
