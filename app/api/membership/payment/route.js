// app/api/membership/payment/route.js
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

		const { paymentProof, amount, paymentMethod } = await request.json();

		if (!paymentProof || !amount) {
			return NextResponse.json(
				{ error: "Payment proof and amount are required" },
				{ status: 400 }
			);
		}

		const { db } = await connectToDatabase();

		// Check if user already has a pending or approved membership
		const user = await db.collection("users").findOne({
			_id: new ObjectId(authResult.userId),
		});

		if (user.membershipStatus === "approved") {
			return NextResponse.json(
				{ error: "You are already a member" },
				{ status: 400 }
			);
		}

		if (user.membershipStatus === "pending") {
			return NextResponse.json(
				{ error: "You already have a pending membership application" },
				{ status: 400 }
			);
		}

		// Create membership payment record
		const membershipPayment = {
			userId: new ObjectId(authResult.userId),
			amount: Number(amount),
			paymentProof,
			paymentMethod: paymentMethod || "bank_transfer",
			status: "pending",
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const result = await db
			.collection("membership_payments")
			.insertOne(membershipPayment);

		// Update user membership status to pending
		await db.collection("users").updateOne(
			{ _id: new ObjectId(authResult.userId) },
			{
				$set: {
					membershipStatus: "pending",
					membershipApplicationDate: new Date(),
					updatedAt: new Date(),
				},
			}
		);

		return NextResponse.json(
			{
				message:
					"Membership payment submitted successfully. Waiting for admin approval.",
				paymentId: result.insertedId,
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error("POST /api/membership/payment error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
