// app/api/auth/reset-password/route.js
import { connectToDatabase } from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

// Password strength validation function
const validatePasswordStrength = (password) => {
	const checks = {
		minLength: password.length >= 8,
		hasLowercase: /[a-z]/.test(password),
		hasUppercase: /[A-Z]/.test(password),
		hasNumber: /[0-9]/.test(password),
		hasSpecialChar: /[$@#&!]/.test(password),
	};

	const passedChecks = Object.values(checks).filter(Boolean).length;
	const isStrong = passedChecks >= 4; // At least 4 out of 5 criteria

	return {
		isValid: isStrong,
		checks,
		strength: passedChecks,
		message: !isStrong ? getStrengthMessage(checks) : null,
	};
};

const getStrengthMessage = (checks) => {
	if (!checks.minLength) {
		return "Password must be at least 8 characters long";
	}
	const missing = [];
	if (!checks.hasLowercase) missing.push("lowercase letter");
	if (!checks.hasUppercase) missing.push("uppercase letter");
	if (!checks.hasNumber) missing.push("number");
	if (!checks.hasSpecialChar) missing.push("special character ($@#&!)");

	return `Password must contain at least one ${missing.join(", ")}`;
};

export async function POST(request) {
	try {
		const { email, otp, newPassword, confirmPassword } = await request.json();

		// Check for missing fields
		if (!email || !otp || !newPassword || !confirmPassword) {
			return NextResponse.json(
				{ error: "All fields are required" },
				{ status: 400 },
			);
		}

		// Check if passwords match
		if (newPassword !== confirmPassword) {
			return NextResponse.json(
				{ error: "Passwords do not match" },
				{ status: 400 },
			);
		}

		// Validate password strength
		const passwordValidation = validatePasswordStrength(newPassword);
		if (!passwordValidation.isValid) {
			return NextResponse.json(
				{
					error: passwordValidation.message,
					passwordStrength: passwordValidation.strength,
					requirements: {
						minLength: newPassword.length >= 8,
						hasLowercase: /[a-z]/.test(newPassword),
						hasUppercase: /[A-Z]/.test(newPassword),
						hasNumber: /[0-9]/.test(newPassword),
						hasSpecialChar: /[$@#&!]/.test(newPassword),
					},
				},
				{ status: 400 },
			);
		}

		const { db } = await connectToDatabase();
		const user = await db.collection("users").findOne({ email });

		if (!user) {
			// Return generic error for security
			return NextResponse.json({ error: "Invalid request" }, { status: 400 });
		}

		// Check if OTP exists
		if (!user.resetOtp) {
			return NextResponse.json(
				{ error: "No password reset request found. Please request a new OTP." },
				{ status: 400 },
			);
		}

		// Validate OTP
		if (user.resetOtp !== otp) {
			return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
		}

		// Check OTP expiry
		if (new Date() > new Date(user.resetOtpExpiry)) {
			return NextResponse.json(
				{ error: "OTP has expired. Please request a new one." },
				{ status: 400 },
			);
		}

		// Check if new password is same as old password
		const isSamePassword = await bcrypt.compare(newPassword, user.password);
		if (isSamePassword) {
			return NextResponse.json(
				{ error: "New password cannot be the same as your current password" },
				{ status: 400 },
			);
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
			},
		);

		// Optional: Log password change (for audit purposes)
		console.log(`Password reset successful for user: ${email}`);

		return NextResponse.json({
			success: true,
			message: "Password reset successfully",
		});
	} catch (error) {
		console.error("POST /api/auth/reset-password error:", error);
		return NextResponse.json(
			{ error: "Internal server error. Please try again later." },
			{ status: 500 },
		);
	}
}
