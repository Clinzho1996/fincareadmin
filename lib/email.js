// lib/email.js
import nodemailer from "nodemailer";

// Create a transporter (configure with your email service)
const transporter = nodemailer.createTransporter({
	service: "gmail", // or your email service
	auth: {
		user: process.env.EMAIL_USER,
		pass: process.env.EMAIL_PASSWORD,
	},
});

export async function sendEmail({ to, subject, html }) {
	try {
		const mailOptions = {
			from: process.env.EMAIL_FROM || "noreply@fincare.com",
			to,
			subject,
			html,
		};

		const result = await transporter.sendMail(mailOptions);
		return result;
	} catch (error) {
		console.error("Error sending email:", error);
		throw new Error("Failed to send email");
	}
}
