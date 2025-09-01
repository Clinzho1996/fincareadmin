// lib/email.js
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: process.env.EMAIL_USER, // Your Gmail address
		pass: process.env.EMAIL_PASSWORD, // Your App Password (not regular password)
	},
});

export async function sendEmail({ to, subject, html }) {
	try {
		await transporter.sendMail({
			from: process.env.EMAIL_USER,
			to,
			subject,
			html,
		});
	} catch (error) {
		console.error("Email sending error:", error);
		throw new Error("Failed to send email");
	}
}
