// app/api/admin/investments/route.js
export const dynamic = "force-dynamic";

import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

// GET all admin investments
export async function GET() {
	try {
		const { db } = await connectToDatabase();
		const investments = await db
			.collection("admin_investments")
			.find({})
			.sort({ createdAt: -1 })
			.toArray();
		return NextResponse.json({ investments });
	} catch (error) {
		console.error("GET /api/admin/investments error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

// POST: create new investment (admin)
export async function POST(request) {
	try {
		const formData = await request.formData();

		const name = formData.get("name");
		const unitPrice = formData.get("unitPrice");
		const interestRate = formData.get("interestRate");
		const type = formData.get("type");
		const maturityDate = formData.get("maturityDate");
		const imageFile = formData.get("image");

		if (!name || !unitPrice || !interestRate || !type || !maturityDate) {
			return NextResponse.json(
				{ error: "Missing required fields" },
				{ status: 400 }
			);
		}

		const { db } = await connectToDatabase();

		let imageData = null;

		// Handle image upload if provided - store as base64
		if (imageFile && imageFile instanceof File) {
			const bytes = await imageFile.arrayBuffer();
			const buffer = Buffer.from(bytes);

			// Convert to base64
			imageData = `data:${imageFile.type};base64,${buffer.toString("base64")}`;
		}

		const newInvestment = {
			name,
			unitPrice: Number(unitPrice),
			interestRate: Number(interestRate),
			type,
			maturityDate: new Date(maturityDate),
			image: imageData,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const result = await db
			.collection("admin_investments")
			.insertOne(newInvestment);

		return NextResponse.json(
			{
				message: "Investment plan created successfully",
				investmentId: result.insertedId,
				investment: newInvestment,
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error("POST /api/admin/investments error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

// PUT: update existing investment by ID
export async function PUT(request) {
	try {
		const formData = await request.formData();

		const id = formData.get("id");
		const name = formData.get("name");
		const unitPrice = formData.get("unitPrice");
		const interestRate = formData.get("interestRate");
		const type = formData.get("type");
		const maturityDate = formData.get("maturityDate");
		const imageFile = formData.get("image");

		if (!id) {
			return NextResponse.json(
				{ error: "Investment ID is required" },
				{ status: 400 }
			);
		}

		const { db } = await connectToDatabase();

		const updateData = { updatedAt: new Date() };
		if (name) updateData.name = name;
		if (unitPrice) updateData.unitPrice = Number(unitPrice);
		if (interestRate) updateData.interestRate = Number(interestRate);
		if (type) updateData.type = type;
		if (maturityDate) updateData.maturityDate = new Date(maturityDate);

		// Handle image update if provided
		if (imageFile && imageFile instanceof File) {
			const bytes = await imageFile.arrayBuffer();
			const buffer = Buffer.from(bytes);
			updateData.image = `data:${imageFile.type};base64,${buffer.toString(
				"base64"
			)}`;
		}

		const result = await db
			.collection("admin_investments")
			.updateOne({ _id: new ObjectId(id) }, { $set: updateData });

		if (result.matchedCount === 0) {
			return NextResponse.json(
				{ error: "Investment not found" },
				{ status: 404 }
			);
		}

		return NextResponse.json({ message: "Investment updated successfully" });
	} catch (error) {
		console.error("PUT /api/admin/investments error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

// DELETE: remove investment by ID
export async function DELETE(request) {
	try {
		const { searchParams } = new URL(request.url);
		const id = searchParams.get("id");

		if (!id) {
			return NextResponse.json(
				{ error: "Investment ID is required" },
				{ status: 400 }
			);
		}

		const { db } = await connectToDatabase();
		const result = await db
			.collection("admin_investments")
			.deleteOne({ _id: new ObjectId(id) });

		if (result.deletedCount === 0) {
			return NextResponse.json(
				{ error: "Investment not found" },
				{ status: 404 }
			);
		}

		return NextResponse.json({ message: "Investment deleted successfully" });
	} catch (error) {
		console.error("DELETE /api/admin/investments error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}