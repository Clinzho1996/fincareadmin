// app/api/admin/settings/route.js
import { connectToDatabase } from "@/lib/mongodb";
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

export async function GET(request) {
	try {
		const token = await getToken({ req: request });

		if (!token || (token.role !== "admin" && token.role !== "super_admin")) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
		}

		const { db } = await connectToDatabase();

		// Get current settings or create default if none exists
		let settings = await db
			.collection("settings")
			.findOne({ type: "loan_settings" });

		if (!settings) {
			// Create default settings
			const defaultSettings = {
				type: "loan_settings",
				interestRate: 10, // 10% default
				processingFeeRate: 1, // 1% default
				updatedBy: token.id,
				updatedAt: new Date(),
				createdAt: new Date(),
			};

			const result = await db.collection("settings").insertOne(defaultSettings);
			settings = { _id: result.insertedId, ...defaultSettings };
		}

		return NextResponse.json({
			status: "success",
			data: settings,
		});
	} catch (error) {
		console.error("GET /api/admin/settings error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

export async function PATCH(request) {
	try {
		const token = await getToken({ req: request });

		if (!token || (token.role !== "admin" && token.role !== "super_admin")) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
		}

		const { interestRate, processingFeeRate } = await request.json();

		if (!interestRate || interestRate <= 0) {
			return NextResponse.json(
				{ error: "Valid interest rate is required" },
				{ status: 400 }
			);
		}

		const { db } = await connectToDatabase();

		const updateData = {
			interestRate: parseFloat(interestRate),
			updatedBy: token.id,
			updatedAt: new Date(),
		};

		if (processingFeeRate !== undefined) {
			updateData.processingFeeRate = parseFloat(processingFeeRate);
		}

		// Upsert settings
		const result = await db
			.collection("settings")
			.updateOne(
				{ type: "loan_settings" },
				{ $set: updateData },
				{ upsert: true }
			);

		console.log("Upsert result:", result);

		// Log the change
		await db.collection("settings_history").insertOne({
			type: "loan_settings_update",
			previousSettings: updateData,
			updatedBy: token.id,
			updatedAt: new Date(),
		});

		return NextResponse.json({
			status: "success",
			message: "Loan settings updated successfully",
			data: updateData,
		});
	} catch (error) {
		console.error("PATCH /api/admin/settings error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
