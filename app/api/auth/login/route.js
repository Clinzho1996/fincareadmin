// ./app/api/auth/login/route.js
import clientPromise from "@/lib/mongodb";
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

		const client = await clientPromise;
		const db = client.db("fincare_db");

		// Find user by email (without returning password)
		const user = await db.collection("users").findOne(
			{ email },
			{ projection: { password: 1 } } // only fetch password for comparison
		);

		if (!user) {
			return NextResponse.json(
				{ error: "Invalid credentials" },
				{ status: 401 }
			);
		}

		// Compare entered password with hashed password
		const isPasswordValid = await bcrypt.compare(password, user.password);
		if (!isPasswordValid) {
			return NextResponse.json(
				{ error: "Invalid credentials" },
				{ status: 401 }
			);
		}

		// Fetch user data again without password for response
		const userData = await db.collection("users").findOne(
			{ email },
			{ projection: { password: 0 } } // exclude password
		);

		// Create JWT token
		const token = jwt.sign(
			{ userId: userData._id, email: userData.email },
			process.env.JWT_SECRET,
			{ expiresIn: "1h" }
		);

		return NextResponse.json({
			status: "success",
			message: "Login successful",
			token,
			user: userData,
		});
	} catch (error) {
		console.error("Login error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
