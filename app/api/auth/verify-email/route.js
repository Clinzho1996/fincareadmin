// app/api/auth/verify-email/route.js
import { connectToDatabase } from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function POST(request) {
	try {
		const { email, otp } = await request.json();

		if (!email || !otp) {
			return NextResponse.json(
				{ error: "Email and OTP are required" },
				{ status: 400 }
			);
		}

		const { db } = await connectToDatabase();
		const user = await db.collection("users").findOne({ email });

		if (!user) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		if (user.isEmailVerified) {
			return NextResponse.json(
				{ error: "Email is already verified" },
				{ status: 400 }
			);
		}

		if (user.otp !== otp) {
			return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
		}

		if (new Date() > new Date(user.otpExpiry)) {
			return NextResponse.json({ error: "OTP has expired" }, { status: 400 });
		}

		// Update user as verified
		await db.collection("users").updateOne(
			{ email },
			{
				$set: {
					isEmailVerified: true,
					updatedAt: new Date(),
				},
				$unset: {
					otp: "",
					otpExpiry: "",
				},
			}
		);

		return NextResponse.json({
			message: "Email verified successfully",
		});
	} catch (error) {
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
