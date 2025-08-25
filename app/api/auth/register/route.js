// app/api/auth/register/route.js
import { sendEmail } from "@/lib/email";
import { connectToDatabase } from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(request) {
	try {
		const {
			firstName,
			lastName,
			otherName,
			phone,
			email,
			password,
			confirmPassword,
		} = await request.json();

		// Validation
		if (
			!firstName ||
			!lastName ||
			!phone ||
			!email ||
			!password ||
			!confirmPassword
		) {
			return NextResponse.json(
				{ error: "All fields except other name are required" },
				{ status: 400 }
			);
		}

		if (password !== confirmPassword) {
			return NextResponse.json(
				{ error: "Passwords do not match" },
				{ status: 400 }
			);
		}

		if (password.length < 6) {
			return NextResponse.json(
				{ error: "Password must be at least 6 characters" },
				{ status: 400 }
			);
		}

		const { db } = await connectToDatabase();

		// Check if user already exists
		const existingUser = await db.collection("users").findOne({ email });
		if (existingUser) {
			return NextResponse.json(
				{ error: "User already exists with this email" },
				{ status: 409 }
			);
		}

		// Hash password
		const hashedPassword = await bcrypt.hash(password, 12);

		// Generate OTP
		const otp = Math.floor(1000 + Math.random() * 9000).toString();
		const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

		// Create user
		const newUser = {
			firstName,
			lastName,
			otherName: otherName || "",
			phone,
			email,
			password: hashedPassword,
			otp,
			otpExpiry,
			isEmailVerified: false,
			savingsBalance: 0,
			totalInvestment: 0,
			totalLoans: 0,
			totalAuctions: 0,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const result = await db.collection("users").insertOne(newUser);

		// Send OTP via email
		await sendEmail({
			to: email,
			subject: "Verify your FinCare account",
			html: `
        <h2>Welcome to FinCare!</h2>
        <p>Your verification code is: <strong>${otp}</strong></p>
        <p>This code will expire in 10 minutes.</p>
      `,
		});

		// Exclude password before returning
		const { password: removedPassword, ...userWithoutPassword } = newUser;

		return NextResponse.json(
			{
				message: "User registered successfully. Please verify your email.",
				userId: result.insertedId,
				user: userWithoutPassword,
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error("POST /api/auth/register error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
