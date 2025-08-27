// app/api/membership/status/route.js
import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
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

		const user = await db
			.collection("users")
			.findOne(
				{ _id: new ObjectId(authResult.userId) },
				{
					projection: {
						membershipStatus: 1,
						membershipApplicationDate: 1,
						membershipApprovalDate: 1,
					},
				}
			);

		if (!user) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		// Determine membership status for response
		let isMember = "none";
		if (user.membershipStatus === "approved") {
			isMember = "member";
		} else if (user.membershipStatus === "pending") {
			isMember = "pending";
		}

		return NextResponse.json({
			status: "success",
			membership: {
				isMember,
				applicationDate: user.membershipApplicationDate,
				approvalDate: user.membershipApprovalDate,
				status: user.membershipStatus || "none",
			},
		});
	} catch (error) {
		console.error("GET /api/membership/status error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
