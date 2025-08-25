// app/api/admin/investments/route.js
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
		const { name, unitPrice, interestRate, type, maturityDate, image } =
			await request.json();

		if (!name || !unitPrice || !interestRate || !type || !maturityDate) {
			return NextResponse.json(
				{ error: "Missing required fields" },
				{ status: 400 }
			);
		}

		const { db } = await connectToDatabase();

		const newInvestment = {
			name,
			unitPrice,
			interestRate,
			type,
			maturityDate: new Date(maturityDate),
			image: image || null,
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
		const { id, name, unitPrice, interestRate, type, maturityDate, image } =
			await request.json();

		if (!id) {
			return NextResponse.json(
				{ error: "Investment ID is required" },
				{ status: 400 }
			);
		}

		const { db } = await connectToDatabase();

		const updateData = { updatedAt: new Date() };
		if (name) updateData.name = name;
		if (unitPrice) updateData.unitPrice = unitPrice;
		if (interestRate) updateData.interestRate = interestRate;
		if (type) updateData.type = type;
		if (maturityDate) updateData.maturityDate = new Date(maturityDate);
		if (image) updateData.image = image;

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
