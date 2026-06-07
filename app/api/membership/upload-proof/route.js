// app/api/membership/upload-proof/route.js
import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

// Configure email transporter
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

		const formData = await request.formData();
		const paymentProof = formData.get("payment_proof");
		const amount = formData.get("amount");
		const transactionRef = formData.get("transactionRef") || `TXN${Date.now()}`;

		if (!paymentProof) {
			return NextResponse.json(
				{ error: "Payment proof is required" },
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

		// Convert image to base64 for storage
		const bytes = await paymentProof.arrayBuffer();
		const buffer = Buffer.from(bytes);
		const base64Image = `data:${paymentProof.type};base64,${buffer.toString("base64")}`;

		// Create membership payment record
		const membershipPayment = {
			userId: new ObjectId(authResult.userId),
			userEmail: user.email,
			userName: `${user.firstName} ${user.lastName}`,
			userPhone: user.phone,
			amount: amount || 100000,
			transactionRef,
			paymentProof: base64Image,
			paymentMethod: "bank_transfer",
			status: "pending",
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const result = await db
			.collection("membership_payments")
			.insertOne(membershipPayment);

		// Send confirmation email to user
		await sendUserConfirmationEmail(user, amount || 100000, transactionRef);

		// Send notification email to admin
		await sendAdminNotificationEmail(
			user,
			amount || 100000,
			transactionRef,
			result.insertedId,
		);

		// Create notification for user
		await db.collection("notifications").insertOne({
			userId: new ObjectId(authResult.userId),
			title: "Premium Membership Application Received 🎉",
			message: `Your premium membership payment of ₦${(amount || 100000).toLocaleString()} has been received. Our team will review and confirm your membership within 24-48 hours.`,
			type: "success",
			isRead: false,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		return NextResponse.json({
			success: true,
			message:
				"Payment proof uploaded successfully. You will receive a confirmation email shortly.",
			paymentId: result.insertedId,
		});
	} catch (error) {
		console.error("POST /api/membership/upload-proof error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

async function sendUserConfirmationEmail(user, amount, transactionRef) {
	try {
		await transporter.sendMail({
			from: `"Fincare CMS" <${process.env.EMAIL_USER}>`,
			to: user.email,
			subject: "Premium Membership Application Received",
			html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0092DD;">Premium Membership Application Received</h2>
          <p>Dear ${user.firstName} ${user.lastName},</p>
          <p>Thank you for choosing Fincare Premium! We have received your membership payment of <strong>₦${amount.toLocaleString()}</strong>.</p>
          
          <div style="background-color: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #333;">Payment Details:</h3>
            <p style="margin: 5px 0;"><strong>Amount:</strong> ₦${amount.toLocaleString()}</p>
            <p style="margin: 5px 0;"><strong>Transaction Reference:</strong> ${transactionRef}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <p>Our team will review your payment proof and activate your premium membership within <strong>24-48 hours</strong>.</p>
          
          <div style="background-color: #E8F5E9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #2E7D32;">✅ <strong>What happens next?</strong></p>
            <ul style="margin-top: 10px;">
              <li>Our team verifies your payment proof</li>
              <li>You receive a confirmation email once approved</li>
              <li>Your premium benefits are activated immediately</li>
              <li>You get access to exclusive features</li>
            </ul>
          </div>
          
          <p>If you have any questions, please contact our support team at support@fincare.com or call +234 912 605 6377.</p>
          
          <hr style="margin: 20px 0; border-color: #eee;">
          <p style="color: #888; font-size: 12px;">Thank you for choosing Fincare - Your Financial Companion</p>
        </div>
      `,
		});
		console.log(`Confirmation email sent to ${user.email}`);
	} catch (error) {
		console.error("Error sending user confirmation email:", error);
	}
}

async function sendAdminNotificationEmail(
	user,
	amount,
	transactionRef,
	paymentId,
) {
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
            <p><strong>Amount:</strong> ₦${amount.toLocaleString()}</p>
            <p><strong>Transaction Ref:</strong> ${transactionRef}</p>
            <p><strong>Payment ID:</strong> ${paymentId}</p>
          </div>
          
          <p>Please review the payment proof in the admin dashboard.</p>
          
          <a href="https://fincareadmin.vercel.app/admin/membership/${paymentId}" 
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
