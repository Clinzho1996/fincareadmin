import { connectToDatabase } from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

// helper: generate a random password
function generatePassword(length = 10) {
	const chars =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
	let pwd = "";
	for (let i = 0; i < length; i++) {
		pwd += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return pwd;
}

// helper: send email
async function sendWelcomeEmail(to, password) {
	const transporter = nodemailer.createTransport({
		host: process.env.SMTP_HOST,
		port: process.env.SMTP_PORT,
		secure: false,
		auth: {
			user: process.env.SMTP_USER,
			pass: process.env.SMTP_PASS,
		},
	});

	await transporter.sendMail({
		from: `"Fincare Admin" <${process.env.SMTP_USER}>`,
		to,
		subject: "Your Fincare Admin Account",
		html: `
      <h2>Welcome to Fincare Admin</h2>
      <p>Your account has been created. Here are your login details:</p>
      <p><b>Email:</b> ${to}</p>
      <p><b>Temporary Password:</b> ${password}</p>
      <p>Please login and change your password immediately.</p>
    `,
	});
}

export async function POST(request) {
	try {
		const token = await getToken({ req: request });

		if (!token || (token.role !== "super_admin" && token.role !== "admin")) {
			return NextResponse.json(
				{ error: "Unauthorized. Super admin access required." },
				{ status: 403 }
			);
		}

		const { first_name, last_name, email, role, permissions } =
			await request.json();

		if (!first_name || !last_name || !email || !role) {
			return NextResponse.json(
				{ error: "First name, last name, email, and role are required" },
				{ status: 400 }
			);
		}

		const { db } = await connectToDatabase();

		// check duplicate
		const existingAdmin = await db.collection("admin_users").findOne({ email });
		if (existingAdmin) {
			return NextResponse.json(
				{ error: "Admin with this email already exists" },
				{ status: 409 }
			);
		}

		// generate & hash password
		const plainPassword = generatePassword(12);
		const hashedPassword = await bcrypt.hash(plainPassword, 12);

		const newAdmin = {
			name: `${first_name} ${last_name}`,
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

		// email the password
		await sendWelcomeEmail(email, plainPassword);

		const { password, ...adminWithoutPassword } = newAdmin;

		return NextResponse.json(
			{
				status: "success",
				message: "Admin user created successfully. Password sent via email.",
				data: { admin: { ...adminWithoutPassword, _id: result.insertedId } },
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

export async function GET(request) {
	try {
		const token = await getToken({ req: request });

		if (!token || (token.role !== "super_admin" && token.role !== "admin")) {
			return NextResponse.json(
				{ error: "Unauthorized. Super admin access required." },
				{ status: 403 }
			);
		}

		const { db } = await connectToDatabase();
		const admins = await db
			.collection("admin_users")
			.find({})
			.project({ password: 0 }) // ❌ exclude password
			.toArray();

		return NextResponse.json({
			status: "success",
			data: admins,
		});
	} catch (error) {
		console.error("Fetch admins error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
