// app/api/loans/[id]/route.js
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
			return NextResponse.json({ error: "Invalid loan ID" }, { status: 400 });
		}

		const { db } = await connectToDatabase();
		const loan = await db.collection("loans").findOne({
			_id: new ObjectId(id),
			userId: authResult.userId,
		});

		if (!loan) {
			return NextResponse.json({ error: "Loan not found" }, { status: 404 });
		}

		return NextResponse.json({ loan });
	} catch (error) {
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
			return NextResponse.json({ error: "Invalid loan ID" }, { status: 400 });
		}

		const {
			loanAmount,
			purpose,
			duration,
			debitFromSavings,
			fullName,
			phone,
			email,
			gender,
			guarantorCoverage,
			guarantorProfession,
			governmentId,
			activeInvestments,
		} = await request.json();

		if (
			!loanAmount ||
			!purpose ||
			!duration ||
			!fullName ||
			!phone ||
			!email ||
			!gender
		) {
			return NextResponse.json(
				{ error: "Required fields are missing" },
				{ status: 400 }
			);
		}

		const { db } = await connectToDatabase();

		// Check if loan exists and belongs to user
		const existingLoan = await db.collection("loans").findOne({
			_id: new ObjectId(id),
			userId: authResult.userId,
		});

		if (!existingLoan) {
			return NextResponse.json({ error: "Loan not found" }, { status: 404 });
		}

		// Calculate loan amount difference
		const amountDifference = loanAmount - existingLoan.loanAmount;

		const updatedLoan = {
			loanAmount,
			purpose,
			duration,
			debitFromSavings: debitFromSavings || false,
			borrowerDetails: {
				fullName,
				phone,
				email,
				gender,
			},
			guarantorDetails: {
				coverage: guarantorCoverage || 0,
				profession: guarantorProfession || "",
			},
			governmentId: governmentId || "",
			activeInvestments: activeInvestments || [],
			updatedAt: new Date(),
		};

		await db
			.collection("loans")
			.updateOne({ _id: new ObjectId(id) }, { $set: updatedLoan });

		// Update user's total loans if amount changed
		if (amountDifference !== 0) {
			await db
				.collection("users")
				.updateOne(
					{ _id: authResult.userId },
					{ $inc: { totalLoans: amountDifference } }
				);
		}

		return NextResponse.json({
			message: "Loan updated successfully",
		});
	} catch (error) {
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
			return NextResponse.json({ error: "Invalid loan ID" }, { status: 400 });
		}

		const { db } = await connectToDatabase();

		// Check if loan exists and belongs to user
		const loan = await db.collection("loans").findOne({
			_id: new ObjectId(id),
			userId: authResult.userId,
		});

		if (!loan) {
			return NextResponse.json({ error: "Loan not found" }, { status: 404 });
		}

		// Update user's total loans
		await db
			.collection("users")
			.updateOne(
				{ _id: authResult.userId },
				{ $inc: { totalLoans: -loan.loanAmount } }
			);

		// Delete the loan
		await db.collection("loans").deleteOne({ _id: new ObjectId(id) });

		return NextResponse.json({
			message: "Loan deleted successfully",
		});
	} catch (error) {
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
