// app/api/auth/forgot-password/route.js
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
			// Don't reveal whether email exists for security
			return NextResponse.json({
				message: "If the email exists, a password reset code has been sent",
			});
		}

		// Generate OTP
		const otp = Math.floor(1000 + Math.random() * 9000).toString();
		const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

		// Save OTP to user
		await db.collection("users").updateOne(
			{ email },
			{
				$set: {
					resetOtp: otp,
					resetOtpExpiry: otpExpiry,
					updatedAt: new Date(),
				},
			}
		);

		// Send OTP via email
		await sendEmail({
			to: email,
			subject: "Reset your FinCare password",
			html: `
        <h2>Password Reset Request</h2>
        <p>Your password reset code is: <strong>${otp}</strong></p>
        <p>This code will expire in 10 minutes.</p>
      `,
		});

		return NextResponse.json({
			message: "If the email exists, a password reset code has been sent",
		});
	} catch (error) {
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
