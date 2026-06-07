// app/api/membership/upload-proof/route.js
import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { createNotification } from "@/lib/notifications";
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

		// Parse JSON body
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

		// Check if user already has premium membership
		if (user.premiumMembership?.status === "approved") {
			return NextResponse.json(
				{ error: "You are already a premium member" },
				{ status: 400 },
			);
		}

		// Check if there's already a pending premium application
		if (user.premiumMembership?.status === "pending") {
			return NextResponse.json(
				{
					error:
						"You already have a pending premium membership application. Please wait for admin approval.",
				},
				{ status: 400 },
			);
		}

		// Create premium membership payment record
		const premiumPayment = {
			userId: new ObjectId(authResult.userId),
			userEmail: user.email,
			userName: `${user.firstName} ${user.lastName}`,
			userPhone: user.phone,
			membershipType: "premium",
			amount: Number(amount),
			transactionRef: transactionRef || `PREMIUM${Date.now()}`,
			paymentProof: paymentProof,
			paymentMethod: paymentMethod || "bank_transfer",
			status: "pending",
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const result = await db
			.collection("premium_membership_payments")
			.insertOne(premiumPayment);

		// Update user's premium membership status
		await db.collection("users").updateOne(
			{ _id: new ObjectId(authResult.userId) },
			{
				$set: {
					premiumMembership: {
						status: "pending",
						applicationDate: new Date(),
						paymentId: result.insertedId,
						amount: Number(amount),
					},
					updatedAt: new Date(),
				},
			},
		);

		// Send confirmation emails
		await sendConfirmationEmails(
			user,
			amount,
			transactionRef,
			result.insertedId,
		);

		// Create notification
		await createNotification(
			authResult.userId,
			"Premium Membership Application Received 🎉",
			`Your premium membership payment of ₦${Number(amount).toLocaleString()} has been received. Our team will review and activate your premium benefits within 24-48 hours.`,
			"success",
			{
				paymentId: result.insertedId,
				amount: Number(amount),
				transactionRef: transactionRef || `PREMIUM${Date.now()}`,
				membershipType: "premium",
			},
			"/premium-membership/status",
		);

		return NextResponse.json({
			success: true,
			message:
				"Premium membership application submitted successfully. You will receive a confirmation email once approved.",
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
					<p>Thank you for choosing <strong>Premium Membership</strong>!</p>
					<p>We have received your payment of <strong>₦${Number(amount).toLocaleString()}</strong>.</p>
					
					<div style="background-color: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0;">
						<h3 style="margin: 0 0 10px 0;">Payment Details:</h3>
						<p><strong>Amount:</strong> ₦${Number(amount).toLocaleString()}</p>
						<p><strong>Transaction Reference:</strong> ${transactionRef || `PREMIUM${Date.now()}`}</p>
						<p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
					</div>
					
					<p>Our team will review your payment and activate your premium benefits within <strong>24-48 hours</strong>.</p>
					
					<div style="background-color: #E8F5E9; padding: 15px; border-radius: 8px; margin: 20px 0;">
						<p><strong>Premium Benefits you'll get:</strong></p>
						<ul>
							<li>Reduced loan interest rates</li>
							<li>Priority loan consideration</li>
							<li>Exclusive investment opportunities</li>
							<li>Enhanced auction participation</li>
						</ul>
					</div>
					
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
					<p>A user has applied for Premium Membership.</p>
					
					<div style="background-color: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0;">
						<h3 style="margin: 0 0 10px 0;">User Details:</h3>
						<p><strong>Name:</strong> ${user.firstName} ${user.lastName}</p>
						<p><strong>Email:</strong> ${user.email}</p>
						<p><strong>Phone:</strong> ${user.phone || "Not provided"}</p>
						<p><strong>Amount Paid:</strong> ₦${Number(amount).toLocaleString()}</p>
						<p><strong>Transaction Ref:</strong> ${transactionRef || `PREMIUM${Date.now()}`}</p>
						<p><strong>Payment ID:</strong> ${paymentId}</p>
					</div>
					
					<p>Please review the payment proof and approve/reject this premium membership application.</p>
					
					<a href="https://fincareadmin.vercel.app/admin/premium-membership/${paymentId}" 
					   style="background-color: #0092DD; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
						Review Application
					</a>
				</div>
			`,
		});
		console.log("Admin notification email sent");
	} catch (error) {
		console.error("Error sending admin notification email:", error);
	}
}
