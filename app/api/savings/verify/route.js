// app/api/savings/verify/route.js
import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

export async function POST(request) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}

		const { savingId, proofImage } = await request.json();

		if (!savingId) {
			return NextResponse.json(
				{ error: "Saving ID is required" },
				{ status: 400 }
			);
		}

		const { db } = await connectToDatabase();

		// Update saving record with verification proof
		await db.collection("savings").updateOne(
			{
				_id: new ObjectId(savingId),
				userId: authResult.userId,
			},
			{
				$set: {
					proofImage: proofImage,
					status: "pending_verification",
					updatedAt: new Date(),
				},
			}
		);

		return NextResponse.json({
			message: "Savings verification submitted successfully",
			status: "pending_verification",
		});
	} catch (error) {
		console.error("POST /api/savings/verify error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
