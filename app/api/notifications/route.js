// app/api/notifications/route.js
import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

// GET - Fetch user notifications
export async function GET(request) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status },
			);
		}

		const { db } = await connectToDatabase();
		const { searchParams } = new URL(request.url);
		const limit = parseInt(searchParams.get("limit")) || 50;

		const notifications = await db
			.collection("notifications")
			.find({ userId: authResult.userId })
			.sort({ createdAt: -1 })
			.limit(limit)
			.toArray();

		// Get unread count
		const unreadCount = await db
			.collection("notifications")
			.countDocuments({ userId: authResult.userId, isRead: false });

		return NextResponse.json({
			success: true,
			notifications,
			unreadCount,
		});
	} catch (error) {
		console.error("GET /api/notifications error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// POST - Create notification (called from other actions)
export async function POST(request) {
	try {
		const { userId, title, message, type, data, actionUrl } =
			await request.json();

		if (!userId || !title || !message) {
			return NextResponse.json(
				{ error: "UserId, title, and message are required" },
				{ status: 400 },
			);
		}

		const { db } = await connectToDatabase();

		const notification = {
			userId: typeof userId === "string" ? new ObjectId(userId) : userId,
			title,
			message,
			type: type || "info", // info, success, warning, error, loan, savings, investment, auction
			data: data || null,
			actionUrl: actionUrl || null,
			isRead: false,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const result = await db.collection("notifications").insertOne(notification);

		return NextResponse.json({
			success: true,
			notificationId: result.insertedId,
		});
	} catch (error) {
		console.error("POST /api/notifications error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// PATCH - Mark notification as read or mark all as read
export async function PATCH(request) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status },
			);
		}

		const { notificationId, markAllAsRead } = await request.json();
		const { db } = await connectToDatabase();

		if (markAllAsRead) {
			await db
				.collection("notifications")
				.updateMany(
					{ userId: authResult.userId, isRead: false },
					{ $set: { isRead: true, updatedAt: new Date() } },
				);

			return NextResponse.json({
				success: true,
				message: "All notifications marked as read",
			});
		}

		if (!notificationId) {
			return NextResponse.json(
				{ error: "Notification ID is required" },
				{ status: 400 },
			);
		}

		const result = await db
			.collection("notifications")
			.updateOne(
				{ _id: new ObjectId(notificationId), userId: authResult.userId },
				{ $set: { isRead: true, updatedAt: new Date() } },
			);

		if (result.matchedCount === 0) {
			return NextResponse.json(
				{ error: "Notification not found" },
				{ status: 404 },
			);
		}

		return NextResponse.json({
			success: true,
			message: "Notification marked as read",
		});
	} catch (error) {
		console.error("PATCH /api/notifications error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
