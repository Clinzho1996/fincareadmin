// app/api/admin/auth/login/route.js
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

		// Find admin user
		const admin = await db.collection("admin_users").findOne({ email });

		if (!admin) {
			return NextResponse.json(
				{ error: "Invalid credentials" },
				{ status: 401 }
			);
		}

		// Check if admin is active
		if (!admin.isActive) {
			return NextResponse.json(
				{ error: "Account is deactivated. Please contact super admin." },
				{ status: 401 }
			);
		}

		// Verify password
		const isPasswordValid = await bcrypt.compare(password, admin.password);
		if (!isPasswordValid) {
			return NextResponse.json(
				{ error: "Invalid credentials" },
				{ status: 401 }
			);
		}

		// Generate JWT token
		const token = jwt.sign(
			{
				id: admin._id,
				email: admin.email,
				role: admin.role,
				permissions: admin.permissions,
			},
			process.env.JWT_SECRET,
			{ expiresIn: "24h" }
		);

		// Remove password from response
		const { password: _, ...adminWithoutPassword } = admin;

		return NextResponse.json({
			status: "success",
			message: "Login successful",
			data: {
				admin: adminWithoutPassword,
				token,
			},
		});
	} catch (error) {
		console.error("Admin login error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
