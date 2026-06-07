// app/api/membership/upload-proof/route.js
import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createNotification } from "../../../../lib/notifications";

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

		if (user.membershipStatus === "pending") {
			return NextResponse.json(
				{ error: "You already have a pending membership application" },
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

		// Update user membership status to pending
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

		// Send emails
		await sendConfirmationEmails(
			user,
			amount,
			transactionRef,
			result.insertedId,
		);

		// Create notification using the createNotification function
		await createNotification(
			authResult.userId,
			"Premium Membership Application Received 🎉",
			`Your premium membership payment of ₦${Number(amount).toLocaleString()} has been received. Our team will review and confirm your membership within 24-48 hours.`,
			"success",
			{
				paymentId: result.insertedId,
				amount: Number(amount),
				transactionRef: transactionRef || `TXN${Date.now()}`,
			},
			"/membership/status",
		);

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
				<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
					<h2 style="color: #0092DD;">Premium Membership Application Received</h2>
					<p>Dear ${user.firstName},</p>
					<p>Thank you for your premium membership payment of <strong>₦${Number(amount).toLocaleString()}</strong>.</p>
					
					<div style="background-color: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0;">
						<h3 style="margin: 0 0 10px 0;">Payment Details:</h3>
						<p><strong>Amount:</strong> ₦${Number(amount).toLocaleString()}</p>
						<p><strong>Transaction Reference:</strong> ${transactionRef || `TXN${Date.now()}`}</p>
						<p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
					</div>
					
					<p>Our team will review your application within <strong>24-48 hours</strong>. You will receive another email once your membership is activated.</p>
					
					<p>If you have any questions, please contact our support team at support@fincare.com</p>
					
					<hr style="margin: 20px 0; border-color: #eee;">
					<p style="color: #888; font-size: 12px;">Thank you for choosing Fincare - Your Financial Companion</p>
				</div>
			`,
		});
		console.log(`Confirmation email sent to ${user.email}`);
	} catch (error) {
		console.error("Error sending user confirmation email:", error);
	}

	// Send admin notification email
	try {
		await transporter.sendMail({
			from: `"Fincare CMS" <${process.env.EMAIL_USER}>`,
			to: process.env.ADMIN_EMAIL || "confidinho@yahoo.com",
			subject: "New Premium Membership Application",
			html: `
				<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
					<h2 style="color: #0092DD;">New Premium Membership Application</h2>
					<p>A user has submitted a premium membership application.</p>
					
					<div style="background-color: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0;">
						<h3 style="margin: 0 0 10px 0;">User Details:</h3>
						<p><strong>Name:</strong> ${user.firstName} ${user.lastName}</p>
						<p><strong>Email:</strong> ${user.email}</p>
						<p><strong>Phone:</strong> ${user.phone || "Not provided"}</p>
						<p><strong>Amount:</strong> ₦${Number(amount).toLocaleString()}</p>
						<p><strong>Transaction Ref:</strong> ${transactionRef || `TXN${Date.now()}`}</p>
						<p><strong>Payment ID:</strong> ${paymentId}</p>
					</div>
					
					<p>Please review the payment proof in the admin dashboard and approve/reject the membership.</p>
				</div>
			`,
		});
		console.log("Admin notification email sent");
	} catch (error) {
		console.error("Error sending admin notification email:", error);
	}
}
