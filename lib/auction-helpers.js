// lib/auction-helpers.js
import { ObjectId } from "mongodb";

// Accept a bid and close the auction
export async function acceptBid(db, auctionId, bidId, ownerId) {
	const session = db.client.startSession();

	try {
		await session.withTransaction(async () => {
			const auctionObjectId = new ObjectId(auctionId);
			const bidObjectId = new ObjectId(bidId);

			// Get the bid
			const bid = await db.collection("bids").findOne({
				_id: bidObjectId,
				auctionId: auctionObjectId,
			});

			if (!bid) {
				throw new Error("Bid not found");
			}

			// Update bid status to accepted
			await db
				.collection("bids")
				.updateOne(
					{ _id: bidObjectId },
					{ $set: { status: "accepted", updatedAt: new Date() } }
				);

			// Reject all other bids for this auction
			await db.collection("bids").updateMany(
				{
					auctionId: auctionObjectId,
					_id: { $ne: bidObjectId },
				},
				{ $set: { status: "rejected", updatedAt: new Date() } }
			);

			// Close the auction
			await db.collection("user_auctions").updateOne(
				{ _id: auctionObjectId },
				{
					$set: {
						status: "completed",
						winningBidId: bidObjectId,
						winnerId: bid.bidderId,
						finalPrice: bid.amount,
						updatedAt: new Date(),
					},
				}
			);

			// Create certificate transfer record
			const auction = await db
				.collection("user_auctions")
				.findOne({ _id: auctionObjectId });

			if (auction.certificateDetails) {
				await db.collection("certificate_transfers").insertOne({
					auctionId: auctionObjectId,
					originalOwnerId: ownerId,
					newOwnerId: bid.bidderId,
					certificateDetails: auction.certificateDetails,
					transferAmount: bid.amount,
					status: "pending_payment", // pending_payment, completed, failed
					createdAt: new Date(),
					updatedAt: new Date(),
				});
			}
		});

		return NextResponse.json({
			message: "Bid accepted and auction closed successfully",
			nextStep: "Admin will contact the winner for payment processing",
		});
	} catch (error) {
		console.error("acceptBid error:", error);
		return NextResponse.json(
			{ error: error.message || "Failed to accept bid" },
			{ status: 400 }
		);
	} finally {
		await session.endSession();
	}
}

// Close auction without accepting any bid
export async function closeAuction(db, auctionId, ownerId) {
	const result = await db.collection("user_auctions").updateOne(
		{
			_id: new ObjectId(auctionId),
			ownerId: ownerId,
		},
		{
			$set: {
				status: "closed",
				updatedAt: new Date(),
			},
		}
	);

	if (result.matchedCount === 0) {
		return NextResponse.json(
			{ error: "Auction not found or unauthorized" },
			{ status: 404 }
		);
	}

	return NextResponse.json({ message: "Auction closed successfully" });
}

// Cancel auction
export async function cancelAuction(db, auctionId, ownerId) {
	const session = db.client.startSession();

	try {
		await session.withTransaction(async () => {
			const auctionObjectId = new ObjectId(auctionId);

			// Update auction status
			await db
				.collection("user_auctions")
				.updateOne(
					{ _id: auctionObjectId, ownerId: ownerId },
					{ $set: { status: "cancelled", updatedAt: new Date() } }
				);

			// Reject all bids for this auction
			await db
				.collection("bids")
				.updateMany(
					{ auctionId: auctionObjectId },
					{ $set: { status: "rejected", updatedAt: new Date() } }
				);
		});

		return NextResponse.json({ message: "Auction cancelled successfully" });
	} catch (error) {
		console.error("cancelAuction error:", error);
		return NextResponse.json(
			{ error: "Failed to cancel auction" },
			{ status: 400 }
		);
	} finally {
		await session.endSession();
	}
}
