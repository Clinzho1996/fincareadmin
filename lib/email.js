// lib/email.js
import nodemailer from "nodemailer";

// Create a transporter (configure with your email service)
const transporter = nodemailer.createTransport({
	service: "gmail", // or another SMTP service
	auth: {
		user: process.env.EMAIL_USER,
		pass: process.env.EMAIL_PASSWORD,
	},
});

export async function sendEmail({ to, subject, html }) {
	try {
		const mailOptions = {
			from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
			to,
			subject,
			html,
		};

		const result = await transporter.sendMail(mailOptions);
		return result;
	} catch (err) {
		console.error("Error sending email:", err);
		throw new Error("Failed to send email");
	}
}
