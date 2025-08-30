// app/api/admin/customers/[id]/route.js
export const dynamic = "force-dynamic";

import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

// GET customer by ID
export async function GET(request, { params }) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}

		const { db } = await connectToDatabase();
		const { id } = params;

		const user = await db
			.collection("users")
			.findOne(
				{ _id: new ObjectId(id) },
				{ projection: { password: 0, otp: 0 } }
			);

		if (!user) {
			return NextResponse.json(
				{ error: "Customer not found" },
				{ status: 404 }
			);
		}

		return NextResponse.json({
			status: "success",
			data: user,
		});
	} catch (error) {
		console.error("GET /api/admin/customers/[id] error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

// UPDATE customer
export async function PUT(request, { params }) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}

		const { db } = await connectToDatabase();
		const { id } = params;
		const body = await request.json();

		// Extract allowed fields to update
		const {
			firstName,
			lastName,
			email,
			phone,
			address,
			gender,
			accountNumber,
			bank,
		} = body;

		const updateData = {};
		if (firstName) updateData.firstName = firstName;
		if (lastName) updateData.lastName = lastName;
		if (email) updateData.email = email;
		if (phone) updateData.phone = phone;
		if (address) updateData.address = address;
		if (gender) updateData.gender = gender;
		if (accountNumber) updateData.accountNumber = accountNumber;
		if (bank) updateData.bank = bank;

		updateData.updatedAt = new Date();

		const result = await db
			.collection("users")
			.updateOne({ _id: new ObjectId(id) }, { $set: updateData });

		if (result.matchedCount === 0) {
			return NextResponse.json(
				{ error: "Customer not found" },
				{ status: 404 }
			);
		}

		return NextResponse.json({
			status: "success",
			message: "Customer updated successfully",
		});
	} catch (error) {
		console.error("PUT /api/admin/customers/[id] error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

// DELETE customer
export async function DELETE(request, { params }) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}

		const { db } = await connectToDatabase();
		const { id } = params;

		const result = await db
			.collection("users")
			.deleteOne({ _id: new ObjectId(id) });

		if (result.deletedCount === 0) {
			return NextResponse.json(
				{ error: "Customer not found" },
				{ status: 404 }
			);
		}

		return NextResponse.json({
			status: "success",
			message: "Customer deleted successfully",
		});
	} catch (error) {
		console.error("DELETE /api/admin/customers/[id] error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

// PATCH customer (for suspend/reactivate)
export async function PATCH(request, { params }) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}

		const { db } = await connectToDatabase();
		const { id } = params;
		const body = await request.json();
		const { action } = body;

		let updateData = {};
		if (action === "suspend") {
			updateData.membershipStatus = "suspended";
		} else if (action === "reactivate") {
			updateData.membershipStatus = "approved";
		} else {
			return NextResponse.json({ error: "Invalid action" }, { status: 400 });
		}

		updateData.updatedAt = new Date();

		const result = await db
			.collection("users")
			.updateOne({ _id: new ObjectId(id) }, { $set: updateData });

		if (result.matchedCount === 0) {
			return NextResponse.json(
				{ error: "Customer not found" },
				{ status: 404 }
			);
		}

		return NextResponse.json({
			status: "success",
			message: `Customer ${action}ed successfully`,
		});
	} catch (error) {
		console.error("PATCH /api/admin/customers/[id] error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
