// app/api/user/won-auctions/route.js
import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

// GET user's won auctions from BOTH admin and user auctions
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
		const userId = new ObjectId(authResult.userId);

		console.log(`🔍 Fetching won auctions for user: ${userId}`);

		// 1. Get auctions won from USER auctions (user-to-user)
		const userWonAuctions = await db
			.collection("user_won_auctions")
			.find({
				newOwnerId: userId,
			})
			.sort({ acceptedAt: -1 })
			.toArray();

		console.log(`🏆 User won auctions: ${userWonAuctions.length}`);

		// 2. Get investments won from ADMIN auctions
		const adminWonInvestments = await db
			.collection("user_investments")
			.find({
				newOwnerId: userId,
				previousOwner: "admin", // This indicates it came from an admin auction
			})
			.sort({ acceptedAt: -1 })
			.toArray();

		console.log(`💼 Admin won investments: ${adminWonInvestments.length}`);

		// 3. Also check auctions collection for completed auctions where user is winner
		const directWonAuctions = await db
			.collection("auctions")
			.find({
				winnerId: userId,
				status: "completed",
			})
			.sort({ ownershipTransferredAt: -1 })
			.toArray();

		console.log(`🎯 Direct won auctions: ${directWonAuctions.length}`);

		// 4. Check user_auctions for completed auctions where user is winner
		const userDirectWonAuctions = await db
			.collection("user_auctions")
			.find({
				winnerId: userId,
				status: "completed",
			})
			.sort({ transferredAt: -1 })
			.toArray();

		console.log(`👤 User direct won auctions: ${userDirectWonAuctions.length}`);

		// Combine all won items
		const allWonItems = [
			// Format user auction wins
			...userWonAuctions.map((auction) => ({
				...auction,
				source: "user_auction",
				type: "user_auction",
				title: auction.title,
				winningBidAmount: auction.winningBidAmount,
				acceptedAt: auction.acceptedAt,
			})),

			// Format admin auction wins (investments)
			...adminWonInvestments.map((investment) => ({
				...investment,
				source: "admin_auction",
				type: "investment",
				title: investment.investmentName,
				winningBidAmount: investment.winningBidAmount,
				acceptedAt: investment.acceptedAt,
				previousOwner: {
					firstName: "Admin",
					lastName: "",
					email: "admin@fincare.com",
				},
			})),

			// Format direct admin auction wins
			...directWonAuctions.map((auction) => ({
				...auction,
				source: "admin_auction_direct",
				type: "investment",
				title: auction.investmentName,
				winningBidAmount: auction.winningBidAmount,
				acceptedAt: auction.ownershipTransferredAt,
				previousOwner: {
					firstName: "Admin",
					lastName: "",
					email: "admin@fincare.com",
				},
			})),

			// Format direct user auction wins
			...userDirectWonAuctions.map((auction) => ({
				...auction,
				source: "user_auction_direct",
				type: "user_auction",
				title: auction.title,
				winningBidAmount: auction.winningBidAmount,
				acceptedAt: auction.transferredAt,
			})),
		];

		console.log(`🎊 Total won items: ${allWonItems.length}`);

		// Get user details for previous owners in user auctions
		const wonAuctionsWithDetails = await Promise.all(
			allWonItems.map(async (item) => {
				if (item.previousOwnerId && !item.previousOwner) {
					const previousOwner = await db
						.collection("users")
						.findOne({ _id: item.previousOwnerId });

					return {
						...item,
						previousOwner: previousOwner
							? {
									firstName: previousOwner.firstName,
									lastName: previousOwner.lastName,
									email: previousOwner.email,
							  }
							: null,
					};
				}
				return item;
			})
		);

		// Sort by acceptance date (newest first)
		wonAuctionsWithDetails.sort(
			(a, b) => new Date(b.acceptedAt) - new Date(a.acceptedAt)
		);

		return NextResponse.json({
			wonAuctions: wonAuctionsWithDetails,
			summary: {
				total: wonAuctionsWithDetails.length,
				fromUserAuctions: userWonAuctions.length,
				fromAdminAuctions:
					adminWonInvestments.length + directWonAuctions.length,
				directWins: directWonAuctions.length + userDirectWonAuctions.length,
			},
		});
	} catch (error) {
		console.error("GET /api/user/won-auctions error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
