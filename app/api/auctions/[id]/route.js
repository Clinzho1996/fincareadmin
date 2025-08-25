// app/api/auctions/[id]/route.js
import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

// GET - Get specific auction
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
		const auction = await db.collection("auctions").findOne({
			_id: new ObjectId(id),
		});

		if (!auction) {
			return NextResponse.json({ error: "Auction not found" }, { status: 404 });
		}

		// Get bids for this auction
		const bids = await db
			.collection("bids")
			.find({ auctionId: new ObjectId(id) })
			.sort({ amount: -1, createdAt: -1 })
			.toArray();

		return NextResponse.json({
			auction,
			bids,
		});
	} catch (error) {
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

// PUT - Update auction
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
			return NextResponse.json(
				{ error: "Invalid auction ID" },
				{ status: 400 }
			);
		}

		const { auctionName, description, reservePrice, duration, status } =
			await request.json();

		const { db } = await connectToDatabase();

		// Check if auction exists and belongs to user
		const existingAuction = await db.collection("auctions").findOne({
			_id: new ObjectId(id),
			userId: authResult.userId,
		});

		if (!existingAuction) {
			return NextResponse.json({ error: "Auction not found" }, { status: 404 });
		}

		// Cannot modify auction if it has bids and is active
		if (existingAuction.status === "active" && existingAuction.currentBid > 0) {
			return NextResponse.json(
				{ error: "Cannot modify auction with active bids" },
				{ status: 400 }
			);
		}

		const updatedData = {
			updatedAt: new Date(),
		};

		if (auctionName) updatedData.auctionName = auctionName;
		if (description !== undefined) updatedData.description = description;
		if (reservePrice) updatedData.reservePrice = reservePrice;
		if (duration) {
			updatedData.duration = duration;
			updatedData.endDate = new Date(
				existingAuction.startDate.getTime() + duration * 24 * 60 * 60 * 1000
			);
		}
		if (status) updatedData.status = status;

		await db
			.collection("auctions")
			.updateOne({ _id: new ObjectId(id) }, { $set: updatedData });

		return NextResponse.json({
			message: "Auction updated successfully",
		});
	} catch (error) {
		console.error("PUT /api/auctions error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

// DELETE - Delete auction
export async function DELETE(request, { params }) {
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

		// Check if auction exists and belongs to user
		const auction = await db.collection("auctions").findOne({
			_id: new ObjectId(id),
			userId: authResult.userId,
		});

		if (!auction) {
			return NextResponse.json({ error: "Auction not found" }, { status: 404 });
		}

		// Cannot delete auction if it has bids
		if (auction.currentBid > 0) {
			return NextResponse.json(
				{ error: "Cannot delete auction with active bids" },
				{ status: 400 }
			);
		}

		// Delete the auction
		await db.collection("auctions").deleteOne({ _id: new ObjectId(id) });

		// Delete any bids associated with this auction
		await db.collection("bids").deleteMany({ auctionId: new ObjectId(id) });

		// Update user's total auctions
		await db
			.collection("users")
			.updateOne({ _id: authResult.userId }, { $inc: { totalAuctions: -1 } });

		return NextResponse.json({
			message: "Auction deleted successfully",
		});
	} catch (error) {
		console.error("DELETE /api/auctions error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

// POST - Place a bid on auction
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

		// Create the bid
		const newBid = {
			auctionId: new ObjectId(id),
			userId: authResult.userId,
			amount,
			status: "active",
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		await db.collection("bids").insertOne(newBid);

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

			console.log("AUCTION OWNER:", auctionOwner);

			// In a real app, you would send a notification or email here
			console.log(
				`Auction "${auction.auctionName}" has received its first bid of ${amount}`
			);
		}

		return NextResponse.json(
			{
				message: "Bid placed successfully",
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error("POST /api/auction error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

// PATCH - Close or cancel auction
export async function PATCH(request, { params }) {
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

		const { action } = await request.json(); // 'close' or 'cancel'

		if (!["close", "cancel"].includes(action)) {
			return NextResponse.json(
				{ error: "Valid action is required (close or cancel)" },
				{ status: 400 }
			);
		}

		const { db } = await connectToDatabase();

		// Check if auction exists and belongs to user
		const auction = await db.collection("auctions").findOne({
			_id: new ObjectId(id),
			userId: authResult.userId,
		});

		if (!auction) {
			return NextResponse.json({ error: "Auction not found" }, { status: 404 });
		}

		if (action === "close") {
			// Close the auction (end it early)
			if (auction.status !== "active") {
				return NextResponse.json(
					{ error: "Only active auctions can be closed" },
					{ status: 400 }
				);
			}

			await db.collection("auctions").updateOne(
				{ _id: new ObjectId(id) },
				{
					$set: {
						status: "closed",
						endDate: new Date(),
						updatedAt: new Date(),
					},
				}
			);

			// Process the winning bid if there is one
			if (auction.currentBid > 0) {
				const winningBid = await db
					.collection("bids")
					.findOne({ auctionId: new ObjectId(id) }, { sort: { amount: -1 } });

				if (winningBid) {
					// Transfer funds to auction owner
					await db
						.collection("users")
						.updateOne(
							{ _id: auction.userId },
							{ $inc: { savingsBalance: winningBid.amount } }
						);

					// Transfer investment ownership to bid winner
					await db
						.collection("investments")
						.updateOne(
							{ _id: auction.investmentId },
							{ $set: { userId: winningBid.userId } }
						);

					// Mark bid as won
					await db
						.collection("bids")
						.updateOne({ _id: winningBid._id }, { $set: { status: "won" } });

					// Refund other bidders
					await db.collection("bids").updateMany(
						{
							auctionId: new ObjectId(id),
							_id: { $ne: winningBid._id },
						},
						{ $set: { status: "refunded" } }
					);

					await db.collection("users").updateMany(
						{
							_id: {
								$in: await db
									.collection("bids")
									.find({
										auctionId: new ObjectId(id),
										_id: { $ne: winningBid._id },
									})
									.map((bid) => bid.userId)
									.toArray(),
							},
						},
						{
							$inc: {
								savingsBalance: (
									await db.collection("bids").findOne({ _id: winningBid._id })
								).amount,
							},
						}
					);
				}
			}

			return NextResponse.json({
				message: "Auction closed successfully",
			});
		} else if (action === "cancel") {
			// Cancel the auction
			if (auction.status !== "active") {
				return NextResponse.json(
					{ error: "Only active auctions can be cancelled" },
					{ status: 400 }
				);
			}

			if (auction.currentBid > 0) {
				return NextResponse.json(
					{ error: "Cannot cancel auction with active bids" },
					{ status: 400 }
				);
			}

			await db.collection("auctions").updateOne(
				{ _id: new ObjectId(id) },
				{
					$set: {
						status: "cancelled",
						updatedAt: new Date(),
					},
				}
			);

			return NextResponse.json({
				message: "Auction cancelled successfully",
			});
		}
	} catch (error) {
		console.error("PATCH /api/auctions error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
