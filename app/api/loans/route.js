// app/api/loans/route.js
import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

export async function GET(request) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}

		const { db } = await connectToDatabase();
		const loans = await db
			.collection("loans")
			.find({ userId: authResult.userId })
			.toArray();

		return NextResponse.json({ loans });
	} catch (error) {
		console.error("GET /api/loans error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

export async function POST(request) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
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

		const newLoan = {
			userId: authResult.userId,
			loanAmount: Number(loanAmount),
			purpose,
			duration: Number(duration),
			debitFromSavings: debitFromSavings || false,
			borrowerDetails: {
				fullName,
				phone,
				email,
				gender,
			},
			guarantorDetails: {
				coverage: Number(guarantorCoverage) || 0,
				profession: guarantorProfession || "",
			},
			governmentId: governmentId || "",
			activeInvestments: activeInvestments || [],
			status: "pending",
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const result = await db.collection("loans").insertOne(newLoan);

		// Only update totalLoans if the loan is approved
		// For pending loans, we'll update when status changes to approved
		if (newLoan.status === "approved") {
			await db
				.collection("users")
				.updateOne(
					{ _id: new ObjectId(authResult.userId) },
					{ $inc: { totalLoans: Number(loanAmount) } }
				);
		}

		return NextResponse.json(
			{
				message: "Loan application submitted successfully",
				loanId: result.insertedId,
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error("POST /api/loans error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

// PATCH endpoint to update loan status
export async function PATCH(request) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}

		const { loanId, status } = await request.json();

		if (!loanId || !status) {
			return NextResponse.json(
				{ error: "Loan ID and status are required" },
				{ status: 400 }
			);
		}

		const { db } = await connectToDatabase();

		// Find the loan
		const loan = await db.collection("loans").findOne({
			_id: new ObjectId(loanId),
			userId: authResult.userId,
		});

		if (!loan) {
			return NextResponse.json({ error: "Loan not found" }, { status: 404 });
		}

		// Update loan status
		await db
			.collection("loans")
			.updateOne(
				{ _id: new ObjectId(loanId) },
				{ $set: { status, updatedAt: new Date() } }
			);

		// If status changed to approved, update user's total loans
		if (status === "approved" && loan.status !== "approved") {
			await db
				.collection("users")
				.updateOne(
					{ _id: new ObjectId(authResult.userId) },
					{ $inc: { totalLoans: Number(loan.loanAmount) } }
				);
		}

		// If status changed from approved to something else, subtract from total loans
		if (loan.status === "approved" && status !== "approved") {
			await db
				.collection("users")
				.updateOne(
					{ _id: new ObjectId(authResult.userId) },
					{ $inc: { totalLoans: -Number(loan.loanAmount) } }
				);
		}

		return NextResponse.json({
			message: "Loan status updated successfully",
		});
	} catch (error) {
		console.error("PATCH /api/loans error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
