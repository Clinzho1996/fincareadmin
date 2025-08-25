// app/api/withdrawals/[id]/route.js
import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

// GET - Get specific withdrawal
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
			return NextResponse.json(
				{ error: "Invalid withdrawal ID" },
				{ status: 400 }
			);
		}

		const { db } = await connectToDatabase();
		const withdrawal = await db.collection("withdrawals").findOne({
			_id: new ObjectId(id),
			userId: authResult.userId,
		});

		if (!withdrawal) {
			return NextResponse.json(
				{ error: "Withdrawal not found" },
				{ status: 404 }
			);
		}

		return NextResponse.json({ withdrawal });
	} catch (error) {
		console.error("GET /api/auth/withdrawals error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

// PUT - Update withdrawal (for user to update before approval)
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
			return NextResponse.json(
				{ error: "Invalid withdrawal ID" },
				{ status: 400 }
			);
		}

		const { accountName, bankName, accountNumber, routingNumber, notes } =
			await request.json();

		const { db } = await connectToDatabase();

		// Check if withdrawal exists and belongs to user
		const existingWithdrawal = await db.collection("withdrawals").findOne({
			_id: new ObjectId(id),
			userId: authResult.userId,
		});

		if (!existingWithdrawal) {
			return NextResponse.json(
				{ error: "Withdrawal not found" },
				{ status: 404 }
			);
		}

		// Cannot update if already processed
		if (existingWithdrawal.status !== "pending") {
			return NextResponse.json(
				{ error: "Cannot update processed withdrawal" },
				{ status: 400 }
			);
		}

		const updatedData = {
			updatedAt: new Date(),
		};

		if (accountName) updatedData.accountName = accountName;
		if (bankName) updatedData.bankName = bankName;
		if (accountNumber) updatedData.accountNumber = accountNumber;
		if (routingNumber !== undefined) updatedData.routingNumber = routingNumber;
		if (notes !== undefined) updatedData.notes = notes;

		await db
			.collection("withdrawals")
			.updateOne({ _id: new ObjectId(id) }, { $set: updatedData });

		return NextResponse.json({
			message: "Withdrawal updated successfully",
		});
	} catch (error) {
		console.error("PUT /api/auth/withdrawals error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

// DELETE - Cancel withdrawal
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
			return NextResponse.json(
				{ error: "Invalid withdrawal ID" },
				{ status: 400 }
			);
		}

		const { db } = await connectToDatabase();

		// Check if withdrawal exists and belongs to user
		const withdrawal = await db.collection("withdrawals").findOne({
			_id: new ObjectId(id),
			userId: authResult.userId,
		});

		if (!withdrawal) {
			return NextResponse.json(
				{ error: "Withdrawal not found" },
				{ status: 404 }
			);
		}

		// Cannot delete if already processed
		if (withdrawal.status !== "pending") {
			return NextResponse.json(
				{ error: "Cannot delete processed withdrawal" },
				{ status: 400 }
			);
		}

		// Return the reserved amount to savings balance
		await db
			.collection("users")
			.updateOne(
				{ _id: authResult.userId },
				{ $inc: { savingsBalance: withdrawal.amount } }
			);

		// Delete the withdrawal
		await db.collection("withdrawals").deleteOne({ _id: new ObjectId(id) });

		return NextResponse.json({
			message: "Withdrawal cancelled successfully",
		});
	} catch (error) {
		console.error("DLETE /api/auth/withdrawals error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
