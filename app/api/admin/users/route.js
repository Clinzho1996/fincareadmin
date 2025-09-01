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

async function sendWelcomeEmail(email, password) {
	try {
		const transporter = nodemailer.createTransport({
			service: "gmail",
			auth: {
				user: process.env.EMAIL_USER, // Your Gmail address
				pass: process.env.EMAIL_PASSWORD, // Your App Password (not regular password)
			},
		});

		// Verify connection configuration
		await transporter.verify();
		console.log("Server is ready to take our messages");

		// Send mail
		const info = await transporter.sendMail({
			from: `"Fincare CMS" <noreply@fincare.com>`,
			to: email,
			subject: "Welcome to Our Admin Panel",
			html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to Our Admin Panel</h2>
          <p>Your admin account has been successfully created.</p>
          <p>Here are your login credentials:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Password:</strong> ${password}</p>
          </div>
          <p style="color: #ff0000;">Please change your password after your first login for security reasons.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #888; font-size: 12px;">
            If you did not request this account, please contact support immediately.
          </p>
        </div>
      `,
		});

		console.log("Message sent: %s", info.messageId);
		return true;
	} catch (error) {
		console.error("Error sending email:", error);
		return false;
	}
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

		// Check for existing user
		const existingAdmin = await db.collection("admin_users").findOne({ email });
		if (existingAdmin) {
			return NextResponse.json(
				{ error: "Admin with this email already exists" },
				{ status: 409 }
			);
		}

		// Generate & hash password
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

		// Try to email the password
		let emailSent = false;
		try {
			emailSent = await sendWelcomeEmail(email, plainPassword);
		} catch (emailError) {
			console.error("Failed to send welcome email:", emailError);
		}

		const adminWithoutPassword = { ...newAdmin };
		delete adminWithoutPassword.password;

		return NextResponse.json(
			{
				status: "success",
				message: emailSent
					? "Admin user created successfully. Password sent via email."
					: "Admin user created successfully. Failed to send welcome email.",
				data: {
					admin: { ...adminWithoutPassword, _id: result.insertedId },
					// Return the plain password only if email failed
					...(!emailSent && { plainPassword }),
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
