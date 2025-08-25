import { authenticateAdmin } from "@/lib/middleware"; // Use admin auth
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
	try {
		const authResult = await authenticateAdmin(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}

		const { db } = await connectToDatabase();
		const auction = await db
			.collection("auctions")
			.findOne({ _id: new ObjectId(params.id) });

		if (!auction) {
			return NextResponse.json({ error: "Auction not found" }, { status: 404 });
		}

		return NextResponse.json({ auction });
	} catch (error) {
		console.error("GET /api/admin/auctions/:id error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

export async function PUT(request, { params }) {
	try {
		const authResult = await authenticateAdmin(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}

		const updates = await request.json();
		updates.updatedAt = new Date();

		const { db } = await connectToDatabase();
		const result = await db
			.collection("auctions")
			.updateOne({ _id: new ObjectId(params.id) }, { $set: updates });

		if (result.matchedCount === 0) {
			return NextResponse.json({ error: "Auction not found" }, { status: 404 });
		}

		return NextResponse.json({ message: "Auction updated successfully" });
	} catch (error) {
		console.error("PUT /api/admin/auctions/:id error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

export async function DELETE(request, { params }) {
	try {
		const authResult = await authenticateAdmin(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}

		const { db } = await connectToDatabase();
		const result = await db
			.collection("auctions")
			.deleteOne({ _id: new ObjectId(params.id) });

		if (result.deletedCount === 0) {
			return NextResponse.json({ error: "Auction not found" }, { status: 404 });
		}

		return NextResponse.json({ message: "Auction deleted successfully" });
	} catch (error) {
		console.error("DELETE /api/admin/auctions/:id error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
