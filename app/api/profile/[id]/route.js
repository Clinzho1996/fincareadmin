export const dynamic = "force-dynamic";

import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

// 🔹 GET single user by id (for admins, not self-profile)
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
			return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
		}

		const { db } = await connectToDatabase();
		const user = await db
			.collection("users")
			.findOne(
				{ _id: new ObjectId(id) },
				{ projection: { password: 0, otp: 0 } }
			);

		if (!user) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		return NextResponse.json({ status: "success", user });
	} catch (error) {
		console.error("GET /api/profile/[id] error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

// 🔹 UPDATE user details
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
			return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
		}

		const body = await request.json();
		const { db } = await connectToDatabase();

		await db
			.collection("users")
			.updateOne(
				{ _id: new ObjectId(id) },
				{ $set: { ...body, updatedAt: new Date() } }
			);

		return NextResponse.json({
			status: "success",
			message: "User updated successfully",
		});
	} catch (error) {
		console.error("PUT /api/profile/[id] error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

// 🔹 DELETE user (hard delete)
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
			return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
		}

		const { db } = await connectToDatabase();
		await db.collection("users").deleteOne({ _id: new ObjectId(id) });

		return NextResponse.json({
			status: "success",
			message: "User deleted successfully",
		});
	} catch (error) {
		console.error("DELETE /api/profile/[id] error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

// 🔹 SUSPEND user (soft ban)
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
			return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
		}

		const { action } = await request.json();
		const { db } = await connectToDatabase();

		let updateFields = {};
		if (action === "suspend") {
			updateFields = { status: "suspended", suspendedAt: new Date() };
		} else if (action === "reactivate") {
			updateFields = { status: "active", reactivatedAt: new Date() };
		} else {
			return NextResponse.json(
				{ error: "Invalid action. Use 'suspend' or 'reactivate'" },
				{ status: 400 }
			);
		}

		await db
			.collection("users")
			.updateOne({ _id: new ObjectId(id) }, { $set: updateFields });

		return NextResponse.json({
			status: "success",
			message: `User ${action}d successfully`,
		});
	} catch (error) {
		console.error("PATCH /api/profile/[id] error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
