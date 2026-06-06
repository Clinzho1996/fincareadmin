// app/api/auth/register/route.js
import { sendEmail } from "@/lib/email";
import { connectToDatabase } from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

// Password strength validation function
const validatePasswordStrength = (password) => {
	const checks = {
		minLength: password.length >= 8,
		hasLowercase: /[a-z]/.test(password),
		hasUppercase: /[A-Z]/.test(password),
		hasNumber: /[0-9]/.test(password),
		hasSpecialChar: /[$@#&!]/.test(password),
	};

	const passedChecks = Object.values(checks).filter(Boolean).length;
	const isStrong = passedChecks >= 4; // At least 4 out of 5 criteria

	return {
		isValid: isStrong,
		checks,
		strength: passedChecks,
		strengthLevel: getStrengthLevel(passedChecks),
		message: !isStrong ? getStrengthMessage(checks) : null,
	};
};

const getStrengthLevel = (strength) => {
	switch (strength) {
		case 5:
			return "Very Strong";
		case 4:
			return "Strong";
		case 3:
			return "Good";
		case 2:
			return "Weak";
		default:
			return "Very Weak";
	}
};

const getStrengthMessage = (checks) => {
	if (!checks.minLength) {
		return "Password must be at least 8 characters long";
	}
	const missing = [];
	if (!checks.hasLowercase) missing.push("lowercase letter");
	if (!checks.hasUppercase) missing.push("uppercase letter");
	if (!checks.hasNumber) missing.push("number");
	if (!checks.hasSpecialChar) missing.push("special character ($@#&!)");

	return `Password must contain at least one ${missing.join(", ")}`;
};

export async function POST(request) {
	try {
		const body = await request.json();

		// Destructure with default empty string for otherName
		const {
			firstName,
			lastName,
			otherName = "",
			phone,
			email,
			password,
			confirmPassword,
		} = body;

		// Validation - explicitly note that otherName is optional
		const requiredFields = {
			firstName: "First name",
			lastName: "Last name",
			phone: "Phone number",
			email: "Email",
			password: "Password",
			confirmPassword: "Confirm password",
		};

		// Check each required field
		for (const [field, label] of Object.entries(requiredFields)) {
			if (!body[field]) {
				return NextResponse.json(
					{
						success: false,
						error: `${label} is required`,
						field: field,
					},
					{ status: 400 },
				);
			}
		}

		// Check if passwords match
		if (password !== confirmPassword) {
			return NextResponse.json(
				{
					success: false,
					error: "Passwords do not match",
					field: "confirmPassword",
				},
				{ status: 400 },
			);
		}

		// Validate password strength
		const passwordValidation = validatePasswordStrength(password);
		if (!passwordValidation.isValid) {
			return NextResponse.json(
				{
					success: false,
					error: passwordValidation.message,
					passwordStrength: {
						score: passwordValidation.strength,
						level: passwordValidation.strengthLevel,
						requirements: passwordValidation.checks,
					},
				},
				{ status: 400 },
			);
		}

		// Email format validation
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return NextResponse.json(
				{
					success: false,
					error: "Please provide a valid email address",
					field: "email",
				},
				{ status: 400 },
			);
		}

		// Phone number validation (Nigerian phone numbers)
		const phoneRegex = /^(0|234)?[7-9][0-1][0-9]{8}$/;
		if (!phoneRegex.test(phone)) {
			return NextResponse.json(
				{
					success: false,
					error:
						"Please provide a valid Nigerian phone number (e.g., 08012345678)",
					field: "phone",
				},
				{ status: 400 },
			);
		}

		const { db } = await connectToDatabase();

		// Check if user already exists by email
		const normalizedEmail = email.toLowerCase().trim();
		const existingUserByEmail = await db
			.collection("users")
			.findOne({ email: normalizedEmail });

		if (existingUserByEmail) {
			return NextResponse.json(
				{
					success: false,
					error: "An account already exists with this email address",
					field: "email",
				},
				{ status: 409 },
			);
		}

		// Check if user already exists by phone
		const normalizedPhone = phone.trim();
		const existingUserByPhone = await db
			.collection("users")
			.findOne({ phone: normalizedPhone });

		if (existingUserByPhone) {
			return NextResponse.json(
				{
					success: false,
					error: "An account already exists with this phone number",
					field: "phone",
				},
				{ status: 409 },
			);
		}

		// Hash password
		const hashedPassword = await bcrypt.hash(password, 12);

		// Generate OTP
		const otp = Math.floor(1000 + Math.random() * 9000).toString();
		const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

		// Create user object
		const newUser = {
			firstName: firstName.trim(),
			lastName: lastName.trim(),
			otherName: otherName ? otherName.trim() : "",
			phone: normalizedPhone,
			email: normalizedEmail,
			password: hashedPassword,
			otp,
			otpExpiry,
			isEmailVerified: false,
			failedLoginAttempts: 0,
			savingsBalance: 0,
			totalInvestment: 0,
			totalLoans: 0,
			totalAuctions: 0,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const result = await db.collection("users").insertOne(newUser);

		// Send OTP via email with password requirements info
		await sendEmail({
			to: email,
			subject: "Verify your Fincare account",
			html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0092DD;">Welcome to Fincare, ${firstName}!</h2>
          <p>Thank you for registering with Fincare. Please use the verification code below to complete your registration:</p>
          
          <div style="background-color: #F3F4F6; padding: 15px; text-align: center; font-size: 32px; letter-spacing: 5px; font-weight: bold; margin: 20px 0;">
            ${otp}
          </div>
          
          <p>This code will expire in <strong>10 minutes</strong>.</p>
          
          <h3 style="color: #333; margin-top: 30px;">Account Information:</h3>
          <ul style="color: #666; line-height: 1.6;">
            <li><strong>Name:</strong> ${firstName} ${lastName}</li>
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>Phone:</strong> ${phone}</li>
          </ul>
          
          <p style="margin-top: 30px; color: #666; font-size: 12px;">
            If you didn't create an account with Fincare, please ignore this email or contact our support team.
          </p>
          
          <hr style="margin: 20px 0; border-color: #eee;" />
          <p style="color: #999; font-size: 11px;">Fincare - Your Financial Companion</p>
        </div>
      `,
		});

		// Exclude password and sensitive data before returning
		const userWithoutSensitiveData = {
			_id: result.insertedId,
			firstName: newUser.firstName,
			lastName: newUser.lastName,
			otherName: newUser.otherName,
			phone: newUser.phone,
			email: newUser.email,
			isEmailVerified: newUser.isEmailVerified,
			savingsBalance: newUser.savingsBalance,
			totalInvestment: newUser.totalInvestment,
			totalLoans: newUser.totalLoans,
			totalAuctions: newUser.totalAuctions,
			createdAt: newUser.createdAt,
			updatedAt: newUser.updatedAt,
		};

		return NextResponse.json(
			{
				success: true,
				message: "User registered successfully. Please verify your email.",
				userId: result.insertedId,
				user: userWithoutSensitiveData,
				requiresVerification: true,
			},
			{ status: 201 },
		);
	} catch (error) {
		console.error("POST /api/auth/register error:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Unable to create account at this time. Please try again later.",
			},
			{ status: 500 },
		);
	}
}
