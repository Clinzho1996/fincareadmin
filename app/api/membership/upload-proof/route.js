// app/api/membership/upload-proof/route.js
import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: process.env.EMAIL_USER,
		pass: process.env.EMAIL_PASSWORD,
	},
});

export async function POST(request) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status },
			);
		}

		// Parse JSON body (not FormData!)
		const { paymentProof, amount, paymentMethod, transactionRef } =
			await request.json();

		if (!paymentProof || !amount) {
			return NextResponse.json(
				{ error: "Payment proof and amount are required" },
				{ status: 400 },
			);
		}

		const { db } = await connectToDatabase();

		// Get user data
		const user = await db.collection("users").findOne({
			_id: new ObjectId(authResult.userId),
		});

		if (!user) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		// Check existing membership
		if (user.membershipStatus === "approved") {
			return NextResponse.json(
				{ error: "You are already a premium member" },
				{ status: 400 },
			);
		}

		// Create membership payment record
		const membershipPayment = {
			userId: new ObjectId(authResult.userId),
			userEmail: user.email,
			userName: `${user.firstName} ${user.lastName}`,
			userPhone: user.phone,
			amount: Number(amount),
			transactionRef: transactionRef || `TXN${Date.now()}`,
			paymentProof: paymentProof, // Store base64 directly
			paymentMethod: paymentMethod || "bank_transfer",
			status: "pending",
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const result = await db
			.collection("membership_payments")
			.insertOne(membershipPayment);

		// Update user membership status
		await db.collection("users").updateOne(
			{ _id: new ObjectId(authResult.userId) },
			{
				$set: {
					membershipStatus: "pending",
					membershipApplicationDate: new Date(),
					updatedAt: new Date(),
				},
			},
		);

		// Send emails (optional but recommended)
		await sendConfirmationEmails(
			user,
			amount,
			transactionRef,
			result.insertedId,
		);

		// Create notification
		await db.collection("notifications").insertOne({
			userId: new ObjectId(authResult.userId),
			title: "Premium Membership Application Received 🎉",
			message: `Your premium membership payment of ₦${Number(amount).toLocaleString()} has been received. Our team will review and confirm your membership within 24-48 hours.`,
			type: "success",
			isRead: false,
			createdAt: new Date(),
		});

		return NextResponse.json({
			success: true,
			message: "Payment proof uploaded successfully",
			paymentId: result.insertedId,
		});
	} catch (error) {
		console.error("POST /api/membership/upload-proof error:", error);
		return NextResponse.json(
			{ error: "Internal server error: " + error.message },
			{ status: 500 },
		);
	}
}

async function sendConfirmationEmails(user, amount, transactionRef, paymentId) {
	// Send user confirmation email
	try {
		await transporter.sendMail({
			from: `"Fincare CMS" <${process.env.EMAIL_USER}>`,
			to: user.email,
			subject: "Premium Membership Application Received",
			html: `
				<h2>Premium Membership Application Received</h2>
				<p>Dear ${user.firstName},</p>
				<p>Thank you for your premium membership payment of ₦${Number(amount).toLocaleString()}.</p>
				<p>Our team will review your application within 24-48 hours.</p>
			`,
		});
	} catch (error) {
		console.error("Email error:", error);
	}
}
