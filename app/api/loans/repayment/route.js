// app/api/loans/repayment/route.js
import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { mkdir, writeFile } from "fs/promises";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import path from "path";

export async function POST(request) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}

		const formData = await request.formData();
		const loanId = formData.get("loanId");
		const proofFile = formData.get("proof");

		// Validate inputs
		if (!loanId) {
			return NextResponse.json(
				{ error: "Loan ID is required" },
				{ status: 400 }
			);
		}

		if (!proofFile || !proofFile.name || !proofFile.type) {
			return NextResponse.json(
				{ error: "Valid proof file is required" },
				{ status: 400 }
			);
		}

		// Validate file type
		const allowedMimeTypes = [
			"image/jpeg",
			"image/jpg",
			"image/png",
			"image/gif",
			"image/webp",
		];
		if (!allowedMimeTypes.includes(proofFile.type)) {
			return NextResponse.json(
				{ error: "Only image files are allowed (JPEG, PNG, GIF, WEBP)" },
				{ status: 400 }
			);
		}

		const { db } = await connectToDatabase();

		// Check if loan exists and belongs to user
		const loan = await db.collection("loans").findOne({
			_id: new ObjectId(loanId),
			userId: authResult.userId,
		});

		if (!loan) {
			return NextResponse.json({ error: "Loan not found" }, { status: 404 });
		}

		// Check if loan is approved
		if (loan.status !== "approved") {
			return NextResponse.json(
				{ error: "Only approved loans can be repaid" },
				{ status: 400 }
			);
		}

		// Generate unique filename
		const timestamp = Date.now();
		const fileExtension = proofFile.name.split(".").pop();
		const fileName = `repayment_${loanId}_${timestamp}.${fileExtension}`;

		// Create uploads directory if it doesn't exist
		const uploadsDir = path.join(
			process.cwd(),
			"public",
			"uploads",
			"repayments"
		);
		try {
			await mkdir(uploadsDir, { recursive: true });
		} catch (error) {
			console.error("Error creating uploads directory:", error);
		}

		// Convert file to buffer and save
		const bytes = await proofFile.arrayBuffer();
		const buffer = Buffer.from(bytes);
		const filePath = path.join(uploadsDir, fileName);

		try {
			await writeFile(filePath, buffer);
		} catch (error) {
			console.error("Error saving file:", error);
			return NextResponse.json(
				{ error: "Failed to save proof file" },
				{ status: 500 }
			);
		}

		// Create repayment record
		const repayment = {
			loanId: new ObjectId(loanId),
			userId: authResult.userId,
			amount: loan.loanAmount, // Or calculate based on repayment schedule
			proofImage: `/uploads/repayments/${fileName}`,
			status: "pending_review",
			submittedAt: new Date(),
			reviewedAt: null,
			reviewedBy: null,
			reviewNotes: null,
		};

		const result = await db.collection("loan_repayments").insertOne(repayment);

		// Update loan status to indicate repayment is pending
		await db.collection("loans").updateOne(
			{ _id: new ObjectId(loanId) },
			{
				$set: {
					repaymentStatus: "pending",
					updatedAt: new Date(),
				},
			}
		);

		return NextResponse.json(
			{
				message:
					"Repayment submitted successfully. Waiting for admin approval.",
				repaymentId: result.insertedId,
				proofUrl: `/uploads/repayments/${fileName}`,
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error("Loan repayment error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

// GET - Get user's loan repayments
export async function GET(request) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}

		const { searchParams } = new URL(request.url);
		const loanId = searchParams.get("loanId");
		const status = searchParams.get("status");

		const { db } = await connectToDatabase();

		// Build query
		const query = { userId: authResult.userId };
		if (loanId) query.loanId = new ObjectId(loanId);
		if (status) query.status = status;

		const repayments = await db
			.collection("loan_repayments")
			.find(query)
			.sort({ submittedAt: -1 })
			.toArray();

		return NextResponse.json({ repayments });
	} catch (error) {
		console.error("GET repayments error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
