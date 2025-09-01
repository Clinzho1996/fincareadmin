export const dynamic = "force-dynamic";

import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function GET(request) {
	try {
		// Authenticate the request
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}

		// Connect to database first
		const { db } = await connectToDatabase();

		const token = await getToken({ req: request });

		if (!token || (token.role !== "super_admin" && token.role !== "admin")) {
			return NextResponse.json(
				{ error: "Unauthorized. Super admin access required." },
				{ status: 403 }
			);
		}

		const { searchParams } = new URL(request.url);

		// Get pagination parameters
		const page = parseInt(searchParams.get("page")) || 1;
		const limit = parseInt(searchParams.get("limit")) || 10;
		const skip = (page - 1) * limit;

		// Get filter parameters
		const search = searchParams.get("search") || "";
		const status = searchParams.get("status") || "";
		const membershipLevel = searchParams.get("membershipLevel") || "";

		// Build filter query
		let filter = {};

		// Search filter (by name, email, or phone)
		if (search) {
			filter.$or = [
				{ firstName: { $regex: search, $options: "i" } },
				{ lastName: { $regex: search, $options: "i" } },
				{ email: { $regex: search, $options: "i" } },
				{ phone: { $regex: search, $options: "i" } },
			];
		}

		// Membership status filter
		if (status && status !== "all") {
			filter.membershipStatus = status;
		}

		// Membership level filter
		if (membershipLevel && membershipLevel !== "all") {
			filter.membershipLevel = membershipLevel;
		}

		// Get total count for pagination
		const total = await db.collection("users").countDocuments(filter);

		// Get users with pagination and filtering
		const users = await db
			.collection("users")
			.find(filter, { projection: { password: 0, otp: 0 } })
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limit)
			.toArray();

		// Calculate additional stats for each user
		const usersWithStats = await Promise.all(
			users.map(async (user) => {
				const userIdString = user._id.toString();

				const savings = await db
					.collection("savings")
					.find({ userId: userIdString })
					.toArray();
				const investments = await db
					.collection("investments")
					.find({ userId: userIdString })
					.toArray();
				const loans = await db
					.collection("loans")
					.find({ userId: userIdString })
					.toArray();
				const auctions = await db
					.collection("auctions")
					.find({ userId: userIdString })
					.toArray();

				// Calculate totals
				const totalSavings = savings.reduce(
					(sum, s) => sum + Number(s.currentBalance || 0),
					0
				);
				const totalInvestment = investments.reduce(
					(sum, i) => sum + Number(i.amount || 0),
					0
				);

				// Only count approved loans
				const approvedLoans = loans.filter(
					(loan) => loan.status === "approved"
				);
				const totalLoans = approvedLoans.reduce(
					(sum, l) => sum + Number(l.loanAmount || 0),
					0
				);

				const totalAuctions = auctions.length;

				// Determine membership status
				let isMember = "none";
				if (
					user.membershipLevel === "basic" ||
					user.membershipLevel === "premium"
				) {
					isMember =
						user.membershipStatus === "approved" ? "member" : "pending";
				}

				return {
					...user,
					totalSavings,
					totalInvestment,
					totalLoans,
					totalAuctions,
					isMember,
					savingsCount: savings.length,
					investmentsCount: investments.length,
					loansCount: loans.length,
					auctionsCount: auctions.length,
				};
			})
		);

		return NextResponse.json({
			status: "success",
			customers: usersWithStats,
			pagination: {
				page,
				limit,
				total,
				pages: Math.ceil(total / limit),
			},
		});
	} catch (error) {
		console.error("GET /api/admin/customers error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

export async function POST(request) {
	try {
		// Authenticate the request
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}

		// Check if user is admin or super_admin
		const token = await getToken({ req: request });
		if (!token || (token.role !== "super_admin" && token.role !== "admin")) {
			return NextResponse.json(
				{ error: "Unauthorized. Admin access required." },
				{ status: 403 }
			);
		}

		// Parse request body
		const {
			firstName,
			lastName,
			email,
			phone,
			otherName = "",
			bvn = "",
			dob = "",
			gender = "",
			profession = "",
			source_of_income = "",
			bank_name = "",
			account_number = "",
			account_name = "",
			address = "",
		} = await request.json();

		// Validate required fields
		if (!firstName || !lastName || !email || !phone) {
			return NextResponse.json(
				{ error: "First name, last name, email, and phone are required" },
				{ status: 400 }
			);
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return NextResponse.json(
				{ error: "Invalid email format" },
				{ status: 400 }
			);
		}

		// Validate phone format (basic validation)
		const phoneRegex = /^[0-9]{10,15}$/;
		if (!phoneRegex.test(phone.replace(/\D/g, ""))) {
			return NextResponse.json(
				{ error: "Invalid phone number format" },
				{ status: 400 }
			);
		}

		// Connect to database
		const { db } = await connectToDatabase();

		// Check if user already exists with this email
		const existingUserByEmail = await db.collection("users").findOne({ email });
		if (existingUserByEmail) {
			return NextResponse.json(
				{ error: "User with this email already exists" },
				{ status: 409 }
			);
		}

		// Check if user already exists with this phone
		const existingUserByPhone = await db.collection("users").findOne({ phone });
		if (existingUserByPhone) {
			return NextResponse.json(
				{ error: "User with this phone number already exists" },
				{ status: 409 }
			);
		}

		// Generate a temporary secure password
		const tempPassword = generatePassword(10);
		const hashedPassword = await bcrypt.hash(tempPassword, 12);

		// Create user object
		const newUser = {
			firstName,
			lastName,
			otherName,
			email,
			phone,
			password: hashedPassword,
			bvn,
			dob: dob ? new Date(dob) : null,
			gender,
			profession,
			source_of_income,
			bank_name,
			account_number,
			account_name,
			address,
			isEmailVerified: false,
			membershipLevel: "none",
			membershipStatus: "none",
			kycCompleted: false,
			savingsBalance: 0,
			totalInvestment: 0,
			totalLoans: 0,
			totalAuctions: 0,
			createdAt: new Date(),
			updatedAt: new Date(),
			createdBy: {
				adminId: authResult.userId,
				adminEmail: token.email,
				timestamp: new Date(),
			},
			adminCreated: true,
			tempPassword: tempPassword,
			passwordResetRequired: true,
		};

		// Insert user into database
		const result = await db.collection("users").insertOne(newUser);

		// Send welcome email with login details
		await sendWelcomeEmail(email, tempPassword);

		// Remove sensitive information before returning
		const { password, tempPassword: _, ...userWithoutSensitiveData } = newUser;

		return NextResponse.json(
			{
				status: "success",
				message: "Customer created successfully. Login details sent via email.",
				user: {
					...userWithoutSensitiveData,
					_id: result.insertedId,
					tempPassword: tempPassword, // still return for admin reference
				},
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error("POST /api/admin/customers error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

/**
 * Generate a random password
 */
function generatePassword(length = 10) {
	const chars =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
	let pwd = "";
	for (let i = 0; i < length; i++) {
		pwd += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return pwd;
}

/**
 * Send welcome email to user with login credentials
 */
async function sendWelcomeEmail(email, password) {
	try {
		const transporter = nodemailer.createTransport({
			service: "gmail",
			auth: {
				user: process.env.EMAIL_USER, // Gmail address
				pass: process.env.EMAIL_PASSWORD, // App Password
			},
		});

		await transporter.verify();

		const info = await transporter.sendMail({
			from: `"Fincare CMS" <noreply@fincare.com>`,
			to: email,
			subject: "Welcome to Fincare",
			html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to Fincare</h2>
          <p>Your account has been successfully created.</p>
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

		console.log("Welcome email sent: %s", info.messageId);
		return true;
	} catch (error) {
		console.error("Error sending email:", error);
		return false;
	}
}
