// app/api/admin/loans/route.js
export const dynamic = "force-dynamic";

import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

export async function GET(request) {
	try {
		// Authenticate the request using getToken
		const token = await getToken({ req: request });

		if (!token || (token.role !== "super_admin" && token.role !== "admin")) {
			return NextResponse.json(
				{ error: "Unauthorized. Admin access required." },
				{ status: 403 }
			);
		}

		// Connect to database
		const { db } = await connectToDatabase();

		const { searchParams } = new URL(request.url);

		// Get pagination parameters
		const page = parseInt(searchParams.get("page")) || 1;
		const limit = parseInt(searchParams.get("limit")) || 10;
		const skip = (page - 1) * limit;

		// Get filter parameters
		const search = searchParams.get("search") || "";
		const status = searchParams.get("status") || "";

		// Build filter query
		let filter = {};

		// Status filter
		if (status && status !== "all") {
			filter.status = status;
		}

		// Search filter (by borrower name, email, or phone)
		if (search) {
			filter.$or = [
				{ "borrowerDetails.fullName": { $regex: search, $options: "i" } },
				{ "borrowerDetails.email": { $regex: search, $options: "i" } },
				{ "borrowerDetails.phone": { $regex: search, $options: "i" } },
			];
		}

		// Get total count for pagination
		const total = await db.collection("loans").countDocuments(filter);

		// Get loans with pagination and filtering
		const loans = await db
			.collection("loans")
			.find(filter)
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limit)
			.toArray();

		return NextResponse.json({
			status: "success",
			loans,
			pagination: {
				page,
				limit,
				total,
				pages: Math.ceil(total / limit),
			},
		});
	} catch (error) {
		console.error("GET /api/admin/loans error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

export async function PATCH(request) {
	try {
		// Authenticate the request using getToken
		const token = await getToken({ req: request });

		if (!token || (token.role !== "super_admin" && token.role !== "admin")) {
			return NextResponse.json(
				{ error: "Unauthorized. Admin access required." },
				{ status: 403 }
			);
		}

		// Connect to database
		const { db } = await connectToDatabase();

		const { loanId, status } = await request.json();

		if (!loanId || !status) {
			return NextResponse.json(
				{ error: "Loan ID and status are required" },
				{ status: 400 }
			);
		}

		// Find the loan
		const loan = await db.collection("loans").findOne({
			_id: new ObjectId(loanId),
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
					{ _id: new ObjectId(loan.userId) },
					{ $inc: { totalLoans: Number(loan.loanAmount) } }
				);
		}

		// If status changed from approved to something else, subtract from total loans
		if (loan.status === "approved" && status !== "approved") {
			await db
				.collection("users")
				.updateOne(
					{ _id: new ObjectId(loan.userId) },
					{ $inc: { totalLoans: -Number(loan.loanAmount) } }
				);
		}

		return NextResponse.json({
			message: "Loan status updated successfully",
		});
	} catch (error) {
		console.error("PATCH /api/admin/loans error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
