// app/api/admin/users/route.js
import { connectToDatabase } from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

export async function POST(request) {
	try {
		// Verify super admin permissions
		const token = await getToken({ req: request });

		if (!token || token.role !== "super_admin") {
			return NextResponse.json(
				{ error: "Unauthorized. Super admin access required." },
				{ status: 403 }
			);
		}

		const { name, email, password, role, permissions } = await request.json();

		if (!name || !email || !password || !role) {
			return NextResponse.json(
				{ error: "Name, email, password, and role are required" },
				{ status: 400 }
			);
		}

		const { db } = await connectToDatabase();

		// Check if admin already exists
		const existingAdmin = await db.collection("admin_users").findOne({ email });
		if (existingAdmin) {
			return NextResponse.json(
				{ error: "Admin with this email already exists" },
				{ status: 409 }
			);
		}

		// Hash password
		const hashedPassword = await bcrypt.hash(password, 12);

		// Create admin user
		const newAdmin = {
			name,
			email,
			password: hashedPassword,
			role: role || "admin",
			permissions: permissions || [],
			isActive: true,
			lastLogin: null,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const result = await db.collection("admin_users").insertOne(newAdmin);

		// Remove password from response
		// Remove password from response
		const adminWithoutPassword = { ...newAdmin };
		delete adminWithoutPassword.password;

		return NextResponse.json(
			{
				status: "success",
				message: "Admin user created successfully",
				data: {
					admin: { ...adminWithoutPassword, _id: result.insertedId },
				},
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error("Create admin error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
