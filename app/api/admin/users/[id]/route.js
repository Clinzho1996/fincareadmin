// app/api/admin/users/[id]/route.js
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

async function verifyAdmin(request) {
	const token = await getToken({ req: request });
	if (!token || (token.role !== "super_admin" && token.role !== "admin")) {
		return null;
	}
	return token;
}

// ✅ Update user (PUT)
export async function PUT(request, { params }) {
	try {
		const token = await verifyAdmin(request);
		if (!token) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
		}

		const { id } = params;
		if (!ObjectId.isValid(id)) {
			return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
		}

		const body = await request.json();
		const { name, email, role, permissions } = body;

		const { db } = await connectToDatabase();

		const updateData = {
			...(name && { name }),
			...(email && { email }),
			...(role && { role }),
			...(permissions && { permissions }),
			updatedAt: new Date(),
		};

		const result = await db
			.collection("admin_users")
			.updateOne({ _id: new ObjectId(id) }, { $set: updateData });

		if (result.matchedCount === 0) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		return NextResponse.json({
			status: "success",
			message: "User updated successfully",
		});
	} catch (error) {
		console.error("Update admin error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

// ✅ Delete user (DELETE)
export async function DELETE(request, { params }) {
	try {
		const token = await verifyAdmin(request);
		if (!token || token.role !== "super_admin") {
			return NextResponse.json(
				{ error: "Only super admin can delete users" },
				{ status: 403 }
			);
		}

		const { id } = params;
		if (!ObjectId.isValid(id)) {
			return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
		}

		const { db } = await connectToDatabase();

		const result = await db
			.collection("admin_users")
			.deleteOne({ _id: new ObjectId(id) });

		if (result.deletedCount === 0) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		return NextResponse.json({
			status: "success",
			message: "User deleted successfully",
		});
	} catch (error) {
		console.error("Delete admin error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

// ✅ Suspend user (PATCH - suspend)
export async function PATCH(request, { params }) {
	try {
		const token = await verifyAdmin(request);
		if (!token) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
		}

		const { id } = params;
		if (!ObjectId.isValid(id)) {
			return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
		}

		const { action } = await request.json();
		if (!["suspend", "reactivate"].includes(action)) {
			return NextResponse.json(
				{ error: "Invalid action. Use 'suspend' or 'reactivate'" },
				{ status: 400 }
			);
		}

		const { db } = await connectToDatabase();

		const result = await db.collection("admin_users").updateOne(
			{ _id: new ObjectId(id) },
			{
				$set: {
					isActive: action === "reactivate",
					updatedAt: new Date(),
				},
			}
		);

		if (result.matchedCount === 0) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		return NextResponse.json({
			status: "success",
			message: `User ${action}d successfully`,
		});
	} catch (error) {
		console.error("Suspend/Reactivate admin error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
