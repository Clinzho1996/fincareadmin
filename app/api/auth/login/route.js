// app/api/auth/login/route.js
import { connectToDatabase } from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

export async function POST(req) {
	try {
		const { email, password } = await req.json();

		// Validate input fields
		if (!email || !password) {
			return NextResponse.json(
				{
					success: false,
					error: "Email and password are required",
					field: !email ? "email" : "password",
				},
				{ status: 400 },
			);
		}

		// Email format validation
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return NextResponse.json(
				{
					success: false,
					error: "Please provide a valid email address",
					field: "email",
				},
				{ status: 400 },
			);
		}

		// Check if JWT_SECRET is set
		if (!process.env.JWT_SECRET) {
			console.error("JWT_SECRET is not defined in login route");
			return NextResponse.json(
				{
					success: false,
					error: "Server configuration error. Please contact support.",
				},
				{ status: 500 },
			);
		}

		const { db } = await connectToDatabase();

		// Convert email to lowercase for case-insensitive search
		const normalizedEmail = email.toLowerCase().trim();

		// Find user with case-insensitive email match
		const user = await db.collection("users").findOne({
			email: { $regex: new RegExp(`^${normalizedEmail}$`, "i") },
		});

		// Generic error for security (don't reveal if email exists or not)
		if (!user) {
			return NextResponse.json(
				{
					success: false,
					error:
						"Invalid email or password. Please check your credentials and try again.",
				},
				{ status: 401 },
			);
		}

		// Check if email is verified
		if (user.isEmailVerified === false) {
			return NextResponse.json(
				{
					success: false,
					error:
						"Please verify your email address before logging in. Check your inbox for the verification code.",
					needsVerification: true,
					email: user.email,
				},
				{ status: 403 },
			);
		}

		// Verify password
		const isValid = await bcrypt.compare(password, user.password);
		if (!isValid) {
			// Increment failed login attempts (optional)
			await db.collection("users").updateOne(
				{ _id: user._id },
				{
					$inc: { failedLoginAttempts: 1 },
					$set: { lastFailedLogin: new Date() },
				},
			);

			return NextResponse.json(
				{
					success: false,
					error:
						"Invalid email or password. Please check your credentials and try again.",
				},
				{ status: 401 },
			);
		}

		// Reset failed login attempts on successful login
		await db.collection("users").updateOne(
			{ _id: user._id },
			{
				$set: {
					lastLogin: new Date(),
					failedLoginAttempts: 0,
				},
				$unset: { lastFailedLogin: "" },
			},
		);

		// Generate JWT with proper payload
		const token = jwt.sign(
			{
				userId: user._id.toString(),
				email: user.email,
				firstName: user.firstName,
				lastName: user.lastName,
			},
			process.env.JWT_SECRET,
			{ expiresIn: "7d" },
		);

		console.log("Login successful for user:", user.email);

		// Return success response with user data (excluding sensitive info)
		return NextResponse.json({
			success: true,
			message: "Login successful",
			token,
			user: {
				_id: user._id.toString(),
				email: user.email,
				firstName: user.firstName,
				lastName: user.lastName,
				otherName: user.otherName || "",
				phone: user.phone,
				isEmailVerified: user.isEmailVerified,
				savingsBalance: user.savingsBalance || 0,
				totalInvestment: user.totalInvestment || 0,
				totalLoans: user.totalLoans || 0,
				totalAuctions: user.totalAuctions || 0,
			},
		});
	} catch (error) {
		console.error("Login error:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Unable to log in at this time. Please try again later.",
			},
			{ status: 500 },
		);
	}
}
