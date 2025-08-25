// app/api/savings/[id]/route.js
import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

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
			return NextResponse.json({ error: "Invalid saving ID" }, { status: 400 });
		}

		const { db } = await connectToDatabase();
		const saving = await db.collection("savings").findOne({
			_id: new ObjectId(id),
			userId: authResult.userId,
		});

		if (!saving) {
			return NextResponse.json({ error: "Saving not found" }, { status: 404 });
		}

		return NextResponse.json({ saving });
	} catch (error) {
		console.error("GET /api/savings error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

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
			return NextResponse.json({ error: "Invalid saving ID" }, { status: 400 });
		}

		const {
			targetAmount,
			reason,
			allocation,
			withdrawFromSavings,
			liquidateLoans,
		} = await request.json();

		if (!targetAmount || !reason) {
			return NextResponse.json(
				{ error: "Target amount and reason are required" },
				{ status: 400 }
			);
		}

		const { db } = await connectToDatabase();

		// Check if saving exists and belongs to user
		const existingSaving = await db.collection("savings").findOne({
			_id: new ObjectId(id),
			userId: authResult.userId,
		});

		if (!existingSaving) {
			return NextResponse.json({ error: "Saving not found" }, { status: 404 });
		}

		// Handle allocation changes if needed
		// This would be more complex in a real application

		const updatedSaving = {
			targetAmount,
			reason,
			allocation: allocation || existingSaving.allocation,
			withdrawFromSavings:
				withdrawFromSavings || existingSaving.withdrawFromSavings,
			liquidateLoans: liquidateLoans || existingSaving.liquidateLoans,
			updatedAt: new Date(),
		};

		await db
			.collection("savings")
			.updateOne({ _id: new ObjectId(id) }, { $set: updatedSaving });

		return NextResponse.json({
			message: "Saving updated successfully",
		});
	} catch (error) {
		console.error("PUT /api/savings error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

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
			return NextResponse.json({ error: "Invalid saving ID" }, { status: 400 });
		}

		const { db } = await connectToDatabase();

		// Check if saving exists and belongs to user
		const saving = await db.collection("savings").findOne({
			_id: new ObjectId(id),
			userId: authResult.userId,
		});

		if (!saving) {
			return NextResponse.json({ error: "Saving not found" }, { status: 404 });
		}

		// If there's an allocated amount, return it to the appropriate source
		if (saving.allocation && saving.allocation.amount > 0) {
			if (saving.allocation.source === "savings") {
				await db
					.collection("users")
					.updateOne(
						{ _id: authResult.userId },
						{ $inc: { savingsBalance: saving.allocation.amount } }
					);
			}
			// Handle other allocation sources as needed
		}

		// Update user's total savings
		await db
			.collection("users")
			.updateOne(
				{ _id: authResult.userId },
				{ $inc: { totalSavings: -saving.currentBalance } }
			);

		// Delete the saving
		await db.collection("savings").deleteOne({ _id: new ObjectId(id) });

		return NextResponse.json({
			message: "Saving deleted successfully",
		});
	} catch (error) {
		console.error("DELETE /api/savings error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
