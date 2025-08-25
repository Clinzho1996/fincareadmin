// app/api/loans/route.js
import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
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
			status: "pending",
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const result = await db.collection("loans").insertOne(newLoan);

		// Update user's total loans
		await db
			.collection("users")
			.updateOne(
				{ _id: authResult.userId },
				{ $inc: { totalLoans: loanAmount } }
			);

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
