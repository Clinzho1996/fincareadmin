// app/api/admin/premium-membership/approve/route.js
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

		const { db } = await connectToDatabase();

		// Check if user is admin
		const admin = await db.collection("users").findOne({
			_id: new ObjectId(authResult.userId),
		});

		if (admin.role !== "admin" && admin.role !== "super_admin") {
			return NextResponse.json(
				{ error: "Admin access required" },
				{ status: 403 },
			);
		}

		const { paymentId, action, notes } = await request.json();

		if (!paymentId || !action) {
			return NextResponse.json(
				{ error: "Payment ID and action are required" },
				{ status: 400 },
			);
		}

		const payment = await db.collection("premium_membership_payments").findOne({
			_id: new ObjectId(paymentId),
		});

		if (!payment) {
			return NextResponse.json(
				{ error: "Payment record not found" },
				{ status: 404 },
			);
		}

		const user = await db.collection("users").findOne({
			_id: payment.userId,
		});

		if (!user) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		if (action === "approve") {
			// Update premium payment status
			await db.collection("premium_membership_payments").updateOne(
				{ _id: new ObjectId(paymentId) },
				{
					$set: {
						status: "approved",
						approvedAt: new Date(),
						approvedBy: authResult.userId,
						adminNotes: notes,
						updatedAt: new Date(),
					},
				},
			);

			// Update user's premium membership
			await db.collection("users").updateOne(
				{ _id: payment.userId },
				{
					$set: {
						premiumMembership: {
							status: "approved",
							approvedDate: new Date(),
							paymentId: new ObjectId(paymentId),
							amount: payment.amount,
						},
						membershipLevel: "premium",
						membershipStatus: "approved",
						updatedAt: new Date(),
					},
				},
			);

			// Send approval email
			await transporter.sendMail({
				from: `"Fincare CMS" <${process.env.EMAIL_USER}>`,
				to: user.email,
				subject: "Premium Membership Approved! 🎉",
				html: `
					<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
						<h2 style="color: #0092DD;">Congratulations! Your Premium Membership is Active</h2>
						<p>Dear ${user.firstName},</p>
						<p>Your premium membership has been <strong>approved and activated</strong>!</p>
						<p>You now have access to all premium benefits including:</p>
						<ul>
							<li>Reduced loan interest rates</li>
							<li>Priority loan consideration</li>
							<li>Exclusive investment opportunities</li>
							<li>Enhanced auction participation</li>
						</ul>
						<p>Thank you for upgrading to Fincare Premium!</p>
					</div>
				`,
			});

			// Create notification
			await createNotification(
				payment.userId.toString(),
				"Premium Membership Approved! 🎉",
				"Congratulations! Your premium membership has been approved. You now have access to all premium benefits.",
				"success",
				{
					membershipLevel: "premium",
					approvedDate: new Date(),
				},
				"/dashboard",
			);
		} else if (action === "reject") {
			// Update premium payment status
			await db.collection("premium_membership_payments").updateOne(
				{ _id: new ObjectId(paymentId) },
				{
					$set: {
						status: "rejected",
						rejectedAt: new Date(),
						rejectedBy: authResult.userId,
						rejectionReason: notes,
						updatedAt: new Date(),
					},
				},
			);

			// Update user's premium membership status
			await db.collection("users").updateOne(
				{ _id: payment.userId },
				{
					$set: {
						premiumMembership: {
							status: "rejected",
							rejectedDate: new Date(),
							rejectionReason: notes,
						},
						updatedAt: new Date(),
					},
				},
			);

			// Send rejection email
			await transporter.sendMail({
				from: `"Fincare CMS" <${process.env.EMAIL_USER}>`,
				to: user.email,
				subject: "Premium Membership Application Update",
				html: `
					<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
						<h2 style="color: #0092DD;">Premium Membership Application Update</h2>
						<p>Dear ${user.firstName},</p>
						<p>We regret to inform you that your premium membership application could not be approved at this time.</p>
						<p><strong>Reason:</strong> ${notes || "Please contact support for more information."}</p>
						<p>Please contact our support team if you have any questions.</p>
					</div>
				`,
			});

			// Create notification
			await createNotification(
				payment.userId.toString(),
				"Premium Membership Update",
				`Your premium membership application was not approved. Reason: ${notes || "Please contact support"}`,
				"error",
				{
					membershipLevel: "premium",
					status: "rejected",
				},
				"/contact-support",
			);
		}

		return NextResponse.json({
			success: true,
			message: `Premium membership ${action}d successfully`,
		});
	} catch (error) {
		console.error("POST /api/admin/premium-membership/approve error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
