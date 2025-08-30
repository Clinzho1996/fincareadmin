// app/api/admin/membership/route.js
import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

// GET - Get all membership applications
export async function GET(request) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}

		const { searchParams } = new URL(request.url);
		const status = searchParams.get("status") || "pending";
		const page = parseInt(searchParams.get("page")) || 1;
		const limit = parseInt(searchParams.get("limit")) || 10;

		const { db } = await connectToDatabase();

		const membershipPayments = await db
			.collection("membership_payments")
			.aggregate([
				{ $match: { status } },
				{ $sort: { createdAt: -1 } },
				{ $skip: (page - 1) * limit },
				{ $limit: limit },
				{
					$lookup: {
						from: "users",
						localField: "userId",
						foreignField: "_id",
						as: "user",
					},
				},
				{
					$project: {
						amount: 1,
						paymentProof: 1,
						paymentMethod: 1,
						status: 1,
						createdAt: 1,
						"user.firstName": 1,
						"user.lastName": 1,
						"user.email": 1,
						"user.phone": 1,
					},
				},
			])
			.toArray();

		const total = await db
			.collection("membership_payments")
			.countDocuments({ status });

		return NextResponse.json({
			payments: membershipPayments,
			pagination: {
				page,
				limit,
				total,
				pages: Math.ceil(total / limit),
			},
		});
	} catch (error) {
		console.error("GET /api/admin/membership error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

// PATCH - Update membership status
export async function PATCH(request) {
	try {
		const authResult = await adminOnly(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}

		const { paymentId, status, adminNotes } = await request.json();

		if (!paymentId || !status || !["approved", "rejected"].includes(status)) {
			return NextResponse.json(
				{ error: "Valid payment ID and status are required" },
				{ status: 400 }
			);
		}

		const { db } = await connectToDatabase();

		// Find the payment
		const payment = await db.collection("membership_payments").findOne({
			_id: new ObjectId(paymentId),
		});

		if (!payment) {
			return NextResponse.json({ error: "Payment not found" }, { status: 404 });
		}

		// Update payment status
		const updateData = {
			status,
			reviewedAt: new Date(),
			reviewedBy: authResult.userId,
			updatedAt: new Date(),
		};

		if (adminNotes) updateData.adminNotes = adminNotes;

		await db
			.collection("membership_payments")
			.updateOne({ _id: new ObjectId(paymentId) }, { $set: updateData });

		// Update user membership status
		await db.collection("users").updateOne(
			{ _id: payment.userId },
			{
				$set: {
					membershipStatus: status,
					membershipApprovalDate: status === "approved" ? new Date() : null,
					updatedAt: new Date(),
				},
			}
		);

		return NextResponse.json({
			message: `Membership application ${status} successfully`,
		});
	} catch (error) {
		console.error("PATCH /api/admin/membership error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
