// app/api/admin/bids/[id]/accept/route.js
import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

export async function PUT(request, { params }) {
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
			return NextResponse.json({ error: "Invalid bid ID" }, { status: 400 });
		}

		const { db } = await connectToDatabase();

		// Get the bid details
		const bid = await db.collection("bids").findOne({ _id: new ObjectId(id) });

		if (!bid) {
			return NextResponse.json({ error: "Bid not found" }, { status: 404 });
		}

		// Start a transaction to update bid status and auction
		const session = db.client.startSession();

		try {
			await session.withTransaction(async () => {
				// Update the bid status to accepted
				await db
					.collection("bids")
					.updateOne(
						{ _id: new ObjectId(id) },
						{ $set: { status: "accepted", updatedAt: new Date() } },
						{ session }
					);

				// Reject all other bids for this auction
				await db.collection("bids").updateMany(
					{
						auctionId: bid.auctionId,
						_id: { $ne: new ObjectId(id) },
						status: "pending",
					},
					{ $set: { status: "rejected", updatedAt: new Date() } },
					{ session }
				);

				// Update the auction status to completed
				await db.collection("auctions").updateOne(
					{ _id: bid.auctionId },
					{
						$set: {
							status: "completed",
							winningBidId: new ObjectId(id),
							updatedAt: new Date(),
						},
					},
					{ session }
				);
			});

			return NextResponse.json({ message: "Bid accepted successfully" });
		} finally {
			await session.endSession();
		}
	} catch (error) {
		console.error("PUT /api/admin/bids/[id]/accept error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
