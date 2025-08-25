// app/api/auth/login/route.js
import { connectToDatabase } from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

export async function POST(request) {
	try {
		const { email, password } = await request.json();

		if (!email || !password) {
			return NextResponse.json(
				{ error: "Email and password are required" },
				{ status: 400 }
			);
		}

		const { db } = await connectToDatabase();

		// Find user
		const user = await db.collection("users").findOne({ email });
		if (!user) {
			return NextResponse.json(
				{ error: "Invalid email or password" },
				{ status: 401 }
			);
		}

		// Compare password
		const isMatch = await bcrypt.compare(password, user.password);
		if (!isMatch) {
			return NextResponse.json(
				{ error: "Invalid email or password" },
				{ status: 401 }
			);
		}

		// Optionally block unverified users
		if (!user.isEmailVerified) {
			return NextResponse.json(
				{ error: "Please verify your email before logging in." },
				{ status: 403 }
			);
		}

		// Generate JWT
		const token = jwt.sign(
			{ userId: user._id, email: user.email },
			process.env.JWT_SECRET,
			{ expiresIn: "7d" }
		);

		// Exclude password
		const { password: _password, ...userWithoutPassword } = user;

		return NextResponse.json(
			{
				message: "Login successful",
				token,
				user: userWithoutPassword,
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error("POST /api/auth/login error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
