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
		const user = await db.collection("users").findOne({ email });

		if (!user || !(await bcrypt.compare(password, user.password))) {
			return NextResponse.json(
				{ error: "Invalid credentials" },
				{ status: 401 }
			);
		}

		if (!user.isEmailVerified) {
			return NextResponse.json(
				{ error: "Email not verified" },
				{ status: 401 }
			);
		}

		const token = jwt.sign(
			{ userId: user._id, email: user.email },
			process.env.JWT_SECRET,
			{ expiresIn: "7d" }
		);

		// Remove password field before returning user
		delete user.password;

		return NextResponse.json({
			message: "Login successful",
			token,
			user,
		});
	} catch (err) {
		console.error("POST /api/auth/login error:", err);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
