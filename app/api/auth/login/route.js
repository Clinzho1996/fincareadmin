// app/api/auth/login/route.js
import { connectToDatabase } from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

export async function POST(req) {
	try {
		const { email, password } = await req.json();

		if (!email || !password) {
			return NextResponse.json(
				{ status: "error", error: "Email and password are required" },
				{ status: 400 }
			);
		}

		// Check if JWT_SECRET is set
		if (!process.env.JWT_SECRET) {
			console.error("JWT_SECRET is not defined in login route");
			return NextResponse.json(
				{ status: "error", error: "Server configuration error" },
				{ status: 500 }
			);
		}

		const { db } = await connectToDatabase();

		// Convert email to lowercase for case-insensitive search
		const normalizedEmail = email.toLowerCase().trim();

		// Find user with case-insensitive email match
		const user = await db.collection("users").findOne({
			email: { $regex: new RegExp(`^${normalizedEmail}$`, "i") },
		});

		if (!user) {
			return NextResponse.json(
				{ status: "error", error: "Invalid credentials" },
				{ status: 401 }
			);
		}

		const isValid = await bcrypt.compare(password, user.password);
		if (!isValid) {
			return NextResponse.json(
				{ status: "error", error: "Invalid credentials" },
				{ status: 401 }
			);
		}

		// Generate JWT with proper payload
		const token = jwt.sign(
			{
				userId: user._id.toString(), // Ensure this is a string
				email: user.email,
			},
			process.env.JWT_SECRET,
			{ expiresIn: "7d" }
		);

		console.log("Login successful, token generated for user:", user.email);

		return NextResponse.json({
			status: "success",
			message: "Login successful",
			token,
			user: {
				_id: user._id.toString(),
				email: user.email,
				firstName: user.firstName,
				lastName: user.lastName,
			},
		});
	} catch (error) {
		console.error("Login error:", error);
		return NextResponse.json(
			{ status: "error", error: "Internal server error" },
			{ status: 500 }
		);
	}
}
