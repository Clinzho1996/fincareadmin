// app/api/auth/register/route.js
import { sendEmail } from "@/lib/email";
import { connectToDatabase } from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(request) {
	try {
		const body = await request.json();

		// Destructure with default empty string for otherName
		const {
			firstName,
			lastName,
			otherName = "", // Default to empty string if not provided
			phone,
			email,
			password,
			confirmPassword,
		} = body;

		// Validation - explicitly note that otherName is optional
		const requiredFields = {
			firstName: "First name",
			lastName: "Last name",
			phone: "Phone number",
			email: "Email",
			password: "Password",
			confirmPassword: "Confirm password",
		};

		// Check each required field
		for (const [field, label] of Object.entries(requiredFields)) {
			if (!body[field]) {
				return NextResponse.json(
					{ error: `${label} is required` },
					{ status: 400 },
				);
			}
		}

		// Password validation
		if (password !== confirmPassword) {
			return NextResponse.json(
				{ error: "Passwords do not match" },
				{ status: 400 },
			);
		}

		if (password.length < 6) {
			return NextResponse.json(
				{ error: "Password must be at least 6 characters" },
				{ status: 400 },
			);
		}

		// Email format validation (optional but recommended)
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return NextResponse.json(
				{ error: "Please provide a valid email address" },
				{ status: 400 },
			);
		}

		// Phone number validation (optional but recommended)
		const phoneRegex = /^[0-9+\-\s()]{10,}$/;
		if (!phoneRegex.test(phone)) {
			return NextResponse.json(
				{ error: "Please provide a valid phone number" },
				{ status: 400 },
			);
		}

		const { db } = await connectToDatabase();

		// Check if user already exists
		const normalizedEmail = email.toLowerCase().trim();
		const existingUser = await db
			.collection("users")
			.findOne({ email: normalizedEmail });

		if (existingUser) {
			return NextResponse.json(
				{ error: "User already exists with this email" },
				{ status: 409 },
			);
		}

		// Hash password
		const hashedPassword = await bcrypt.hash(password, 12);

		// Generate OTP
		const otp = Math.floor(1000 + Math.random() * 9000).toString();
		const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

		// Create user object with optional otherName
		const newUser = {
			firstName: firstName.trim(),
			lastName: lastName.trim(),
			otherName: otherName ? otherName.trim() : "", // Handle empty or whitespace
			phone: phone.trim(),
			email: normalizedEmail,
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
        <h2>Welcome to FinCare, ${firstName}!</h2>
        <p>Your verification code is: <strong>${otp}</strong></p>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't create an account with FinCare, please ignore this email.</p>
      `,
		});

		// Exclude password and sensitive data before returning
		// Use pick/create a new object instead of destructuring with unused variables
		const userWithoutSensitiveData = {
			_id: result.insertedId,
			firstName: newUser.firstName,
			lastName: newUser.lastName,
			otherName: newUser.otherName,
			phone: newUser.phone,
			email: newUser.email,
			isEmailVerified: newUser.isEmailVerified,
			savingsBalance: newUser.savingsBalance,
			totalInvestment: newUser.totalInvestment,
			totalLoans: newUser.totalLoans,
			totalAuctions: newUser.totalAuctions,
			createdAt: newUser.createdAt,
			updatedAt: newUser.updatedAt,
		};

		return NextResponse.json(
			{
				success: true,
				message: "User registered successfully. Please verify your email.",
				userId: result.insertedId,
				user: userWithoutSensitiveData,
			},
			{ status: 201 },
		);
	} catch (error) {
		console.error("POST /api/auth/register error:", error);
		return NextResponse.json(
			{ error: "Internal server error. Please try again later." },
			{ status: 500 },
		);
	}
}
