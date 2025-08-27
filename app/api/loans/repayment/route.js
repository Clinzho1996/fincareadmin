import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import cloudinary from "cloudinary";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

// Configure Cloudinary
cloudinary.v2.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
});

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
		const proofFile = formData.get("proof"); // Blob

		if (!loanId) {
			return NextResponse.json(
				{ error: "Loan ID is required" },
				{ status: 400 }
			);
		}
		if (!proofFile) {
			return NextResponse.json(
				{ error: "Proof image is required" },
				{ status: 400 }
			);
		}

		const { db } = await connectToDatabase();
		const loan = await db.collection("loans").findOne({
			_id: new ObjectId(loanId),
			userId: authResult.userId,
		});

		if (!loan) {
			return NextResponse.json({ error: "Loan not found" }, { status: 404 });
		}
		if (loan.status !== "approved") {
			return NextResponse.json(
				{ error: "Only approved loans can be repaid" },
				{ status: 400 }
			);
		}

		// Convert Blob → Buffer
		const buffer = Buffer.from(await proofFile.arrayBuffer());

		// Upload to Cloudinary
		const uploadResponse = await new Promise((resolve, reject) => {
			const stream = cloudinary.v2.uploader.upload_stream(
				{
					folder: "repayments",
					public_id: `loan_${loanId}_${Date.now()}`,
				},
				(error, result) => {
					if (error) reject(error);
					else resolve(result);
				}
			);
			stream.end(buffer);
		});

		// Create repayment record
		const repayment = {
			loanId: new ObjectId(loanId),
			userId: authResult.userId,
			amount: loan.loanAmount,
			proofImage: uploadResponse.secure_url,
			status: "pending_review",
			submittedAt: new Date(),
		};

		const result = await db.collection("loan_repayments").insertOne(repayment);

		// Update loan status
		await db
			.collection("loans")
			.updateOne(
				{ _id: new ObjectId(loanId) },
				{ $set: { repaymentStatus: "pending", updatedAt: new Date() } }
			);

		return NextResponse.json(
			{
				message:
					"Repayment submitted successfully. Waiting for admin approval.",
				repaymentId: result.insertedId,
				proofUrl: uploadResponse.secure_url,
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
