// app/api/profile/route.js
export const dynamic = "force-dynamic";

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
				{ status: authResult.status },
			);
		}

		const { db } = await connectToDatabase();

		// ✅ _id is ObjectId in users
		const user = await db
			.collection("users")
			.findOne(
				{ _id: new ObjectId(authResult.userId) },
				{ projection: { password: 0, otp: 0 } },
			);

		if (!user) {
			return NextResponse.json(
				{ error: "User not found or not verified" },
				{ status: 404 },
			);
		}

		// ✅ use string userId for related collections
		const userIdString = authResult.userId;

		const savings = await db
			.collection("savings")
			.find({ userId: userIdString })
			.toArray();
		const investments = await db
			.collection("investments")
			.find({ userId: userIdString })
			.toArray();
		const loans = await db
			.collection("loans")
			.find({ userId: userIdString })
			.toArray();
		const auctions = await db
			.collection("auctions")
			.find({ userId: userIdString })
			.toArray();

		// Calculate totals - use currentValue for investments (includes accrued interest)
		const totalSavings = savings.reduce(
			(sum, s) => sum + Number(s.currentBalance || 0),
			0,
		);
		const totalInvestment = investments.reduce(
			(sum, i) => sum + Number(i.currentValue || i.amount || 0), // Use currentValue if available
			0,
		);

		// Only count approved loans
		const approvedLoans = loans.filter((loan) => loan.status === "approved");
		const totalLoans = approvedLoans.reduce(
			(sum, l) => sum + Number(l.loanAmount || 0),
			0,
		);

		const totalAuctions = auctions.length;

		// Check if user's totalLoans is out of sync and update if needed
		if (user.totalLoans !== totalLoans) {
			await db
				.collection("users")
				.updateOne(
					{ _id: new ObjectId(authResult.userId) },
					{ $set: { totalLoans } },
				);

			// Update the user object for response
			user.totalLoans = totalLoans;
		}

		// Determine membership status
		let isMember = "none";
		if (
			user.membershipLevel === "basic" ||
			user.membershipLevel === "premium"
		) {
			isMember = user.membershipStatus === "approved" ? "member" : "pending";
		}

		// Add interest summary to each investment
		const enrichedInvestments = investments.map((inv) => ({
			...inv,
			interestEarned: inv.totalInterestEarned || 0,
			projectedMaturityValue:
				inv.amount +
				inv.dailyInterestAmount *
					Math.ceil(
						(new Date(inv.maturityDate) - new Date(inv.startDate)) /
							(1000 * 60 * 60 * 24),
					),
		}));

		return NextResponse.json({
			status: "success",
			user: {
				...user,
				totalSavings,
				totalInvestment,
				totalLoans,
				totalAuctions,
				isMember, // Add membership status to response
				membershipLevel: user.membershipLevel || "none",
				membershipStatus: user.membershipStatus || "none",
			},
			savings,
			investments: enrichedInvestments,
			loans: approvedLoans,
			auctions,
		});
	} catch (error) {
		console.error("GET /api/profile error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// app/api/profile/route.js (add PUT method)
export async function PUT(request) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status },
			);
		}

		const body = await request.json();
		const { firstName, lastName, otherName, email, phone } = body;

		const { db } = await connectToDatabase();

		// Build update object with only provided fields
		const updateFields = {};
		if (firstName !== undefined) updateFields.firstName = firstName.trim();
		if (lastName !== undefined) updateFields.lastName = lastName.trim();
		if (otherName !== undefined) updateFields.otherName = otherName.trim();
		if (email !== undefined) updateFields.email = email.toLowerCase().trim();
		if (phone !== undefined) updateFields.phone = phone.trim();

		updateFields.updatedAt = new Date();

		if (Object.keys(updateFields).length === 0) {
			return NextResponse.json(
				{ error: "No fields to update" },
				{ status: 400 },
			);
		}

		// Check if email is already taken by another user
		if (email) {
			const existingUser = await db.collection("users").findOne({
				email: email.toLowerCase().trim(),
				_id: { $ne: new ObjectId(authResult.userId) },
			});

			if (existingUser) {
				return NextResponse.json(
					{ error: "Email already in use by another account" },
					{ status: 409 },
				);
			}
		}

		// Check if phone is already taken by another user
		if (phone) {
			const existingUser = await db.collection("users").findOne({
				phone: phone.trim(),
				_id: { $ne: new ObjectId(authResult.userId) },
			});

			if (existingUser) {
				return NextResponse.json(
					{ error: "Phone number already in use by another account" },
					{ status: 409 },
				);
			}
		}

		const result = await db
			.collection("users")
			.updateOne(
				{ _id: new ObjectId(authResult.userId) },
				{ $set: updateFields },
			);

		if (result.matchedCount === 0) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		// Get updated user data (excluding sensitive fields)
		const updatedUser = await db
			.collection("users")
			.findOne(
				{ _id: new ObjectId(authResult.userId) },
				{ projection: { password: 0, otp: 0, resetOtp: 0, resetOtpExpiry: 0 } },
			);

		return NextResponse.json({
			success: true,
			message: "Profile updated successfully",
			user: updatedUser,
		});
	} catch (error) {
		console.error("PUT /api/profile error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
