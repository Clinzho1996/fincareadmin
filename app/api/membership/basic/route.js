import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

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
			bvn,
			dob,
			gender,
			profession,
			source_of_income,
			bank_name,
			account_number,
			account_name,
			address,
		} = await request.json();

		// Validate required fields
		if (
			!bvn ||
			!dob ||
			!gender ||
			!profession ||
			!source_of_income ||
			!bank_name ||
			!account_number ||
			!account_name ||
			!address
		) {
			return NextResponse.json(
				{ error: "All fields are required" },
				{ status: 400 }
			);
		}

		// Validate BVN format (11 digits)
		if (!/^\d{11}$/.test(bvn)) {
			return NextResponse.json(
				{ error: "BVN must be 11 digits" },
				{ status: 400 }
			);
		}

		// Validate account number format (10 digits)
		if (!/^\d{10}$/.test(account_number)) {
			return NextResponse.json(
				{ error: "Account number must be 10 digits" },
				{ status: 400 }
			);
		}

		// Validate gender
		if (!["male", "female"].includes(gender.toLowerCase())) {
			return NextResponse.json(
				{ error: "Gender must be male or female" },
				{ status: 400 }
			);
		}

		const { db } = await connectToDatabase();

		// Check if user already has basic membership
		const existingUser = await db.collection("users").findOne({
			_id: new ObjectId(authResult.userId),
		});

		if (existingUser.membershipLevel === "basic") {
			return NextResponse.json(
				{ error: "You already have basic membership" },
				{ status: 400 }
			);
		}

		// Check if BVN is already registered by another user
		const existingBVN = await db.collection("users").findOne({
			bvn: bvn,
			_id: { $ne: new ObjectId(authResult.userId) },
		});

		if (existingBVN) {
			return NextResponse.json(
				{ error: "BVN already registered by another user" },
				{ status: 400 }
			);
		}

		// Check if account number is already registered by another user
		const existingAccount = await db.collection("users").findOne({
			account_number: account_number,
			_id: { $ne: new ObjectId(authResult.userId) },
		});

		if (existingAccount) {
			return NextResponse.json(
				{ error: "Account number already registered by another user" },
				{ status: 400 }
			);
		}

		// Update user with membership information
		const updateData = {
			bvn,
			dob: new Date(dob),
			gender: gender.toLowerCase(),
			profession,
			source_of_income,
			bank_name,
			account_number,
			account_name,
			address,
			membershipLevel: "basic",
			membershipStatus: "approved",
			membershipApplicationDate: new Date(),
			membershipApprovalDate: new Date(),
			kycCompleted: true,
			updatedAt: new Date(),
		};

		await db
			.collection("users")
			.updateOne(
				{ _id: new ObjectId(authResult.userId) },
				{ $set: updateData }
			);

		// Create membership record
		const membershipRecord = {
			userId: new ObjectId(authResult.userId),
			membershipLevel: "basic",
			status: "approved",
			applicationDate: new Date(),
			approvalDate: new Date(),
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		await db.collection("memberships").insertOne(membershipRecord);

		return NextResponse.json(
			{
				message: "Basic membership registration successful",
				status: "success",
				membership: {
					level: "basic",
					status: "approved",
				},
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error("POST /api/membership/basic error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

// GET - Check membership status
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

		const user = await db.collection("users").findOne(
			{ _id: new ObjectId(authResult.userId) },
			{
				projection: {
					membershipLevel: 1,
					membershipStatus: 1,
					membershipApplicationDate: 1,
					membershipApprovalDate: 1,
					kycCompleted: 1,
					bvn: 1,
					dob: 1,
					gender: 1,
					profession: 1,
					source_of_income: 1,
					bank_name: 1,
					account_number: 1,
					account_name: 1,
					address: 1,
				},
			}
		);

		if (!user) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		return NextResponse.json({
			status: "success",
			membership: {
				level: user.membershipLevel || "none",
				status: user.membershipStatus || "none",
				applicationDate: user.membershipApplicationDate,
				approvalDate: user.membershipApprovalDate,
				kycCompleted: user.kycCompleted || false,
			},
			userDetails: {
				bvn: user.bvn,
				dob: user.dob,
				gender: user.gender,
				profession: user.profession,
				source_of_income: user.source_of_income,
				bank_name: user.bank_name,
				account_number: user.account_number,
				account_name: user.account_name,
				address: user.address,
			},
		});
	} catch (error) {
		console.error("GET /api/membership/basic error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
