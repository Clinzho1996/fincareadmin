// app/api/admin/transactions/[id]/route.js
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

export async function PATCH(request, { params }) {
	try {
		const token = await getToken({ req: request });

		if (!token || (token.role !== "admin" && token.role !== "super_admin")) {
			return NextResponse.json(
				{ error: "Unauthorized. Admin access required." },
				{ status: 403 }
			);
		}

		const { id } = params;
		const { status } = await request.json();

		if (
			!status ||
			!["pending", "completed", "failed", "processing"].includes(status)
		) {
			return NextResponse.json(
				{ error: "Valid status is required" },
				{ status: 400 }
			);
		}

		const { db } = await connectToDatabase();

		const result = await db.collection("transactions").updateOne(
			{ _id: new ObjectId(id) },
			{
				$set: {
					status,
					updatedAt: new Date(),
				},
			}
		);

		if (result.matchedCount === 0) {
			return NextResponse.json(
				{ error: "Transaction not found" },
				{ status: 404 }
			);
		}

		return NextResponse.json({
			status: "success",
			message: "Transaction status updated successfully",
		});
	} catch (error) {
		console.error("Update transaction error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
