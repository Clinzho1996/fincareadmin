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

		// connect to db
		const { db } = await connectToDatabase();

		// check if user exists
		const user = await db.collection("users").findOne({ email });
		if (!user) {
			return NextResponse.json(
				{ status: "error", error: "Invalid credentials" },
				{ status: 401 }
			);
		}

		// verify password
		const isValid = await bcrypt.compare(password, user.password);
		if (!isValid) {
			return NextResponse.json(
				{ status: "error", error: "Invalid credentials" },
				{ status: 401 }
			);
		}

		// generate JWT
		const token = jwt.sign(
			{ userId: user._id.toString(), email: user.email },
			process.env.JWT_SECRET,
			{ expiresIn: "7d" }
		);

		// success
		return NextResponse.json({
			status: "success",
			message: "Login successful",
			token,
			user: {
				_id: user._id,
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
