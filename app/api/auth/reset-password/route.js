// app/api/auth/reset-password/route.js
import { connectToDatabase } from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(request) {
	try {
		const { email, otp, newPassword, confirmPassword } = await request.json();

		if (!email || !otp || !newPassword || !confirmPassword) {
			return NextResponse.json(
				{ error: "All fields are required" },
				{ status: 400 }
			);
		}

		if (newPassword !== confirmPassword) {
			return NextResponse.json(
				{ error: "Passwords do not match" },
				{ status: 400 }
			);
		}

		if (newPassword.length < 6) {
			return NextResponse.json(
				{ error: "Password must be at least 6 characters" },
				{ status: 400 }
			);
		}

		const { db } = await connectToDatabase();
		const user = await db.collection("users").findOne({ email });

		if (!user) {
			return NextResponse.json({ error: "Invalid request" }, { status: 400 });
		}

		if (user.resetOtp !== otp) {
			return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
		}

		if (new Date() > new Date(user.resetOtpExpiry)) {
			return NextResponse.json({ error: "OTP has expired" }, { status: 400 });
		}

		// Hash new password
		const hashedPassword = await bcrypt.hash(newPassword, 12);

		// Update password and clear reset OTP
		await db.collection("users").updateOne(
			{ email },
			{
				$set: {
					password: hashedPassword,
					updatedAt: new Date(),
				},
				$unset: {
					resetOtp: "",
					resetOtpExpiry: "",
				},
			}
		);

		return NextResponse.json({
			message: "Password reset successfully",
		});
	} catch (error) {
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
