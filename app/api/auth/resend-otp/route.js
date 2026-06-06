// app/api/auth/resend-otp/route.js
import { sendEmail } from "@/lib/email";
import { connectToDatabase } from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function POST(request) {
	try {
		const { email } = await request.json();

		if (!email) {
			return NextResponse.json({ error: "Email is required" }, { status: 400 });
		}

		const { db } = await connectToDatabase();
		const user = await db.collection("users").findOne({ email });

		if (!user) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		if (user.isEmailVerified) {
			return NextResponse.json(
				{ error: "Email is already verified" },
				{ status: 400 },
			);
		}

		// Generate new OTP
		const otp = Math.floor(1000 + Math.random() * 9000).toString();
		const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

		// Update user with new OTP
		await db.collection("users").updateOne(
			{ email },
			{
				$set: {
					otp: otp,
					otpExpiry: otpExpiry,
					updatedAt: new Date(),
				},
			},
		);

		// Send new OTP via email
		await sendEmail({
			to: email,
			subject: "Fincare - New Verification Code",
			html: `
        <h2>New Verification Code for Fincare</h2>
        <p>Your new verification code is: <strong>${otp}</strong></p>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request a new code, please ignore this email.</p>
      `,
		});

		return NextResponse.json({
			success: true,
			message: "New OTP sent successfully",
		});
	} catch (error) {
		console.error("POST /api/auth/resend-otp error:", error);
		return NextResponse.json(
			{ error: "Internal server error. Please try again later." },
			{ status: 500 },
		);
	}
}
