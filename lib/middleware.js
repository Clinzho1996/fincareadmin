// lib/middleware.js
import { connectToDatabase } from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

export async function authenticate(request) {
	try {
		const authHeader = request.headers.get("authorization");

		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return { error: "Authentication token required", status: 401 };
		}

		const token = authHeader.substring(7);

		try {
			const decoded = jwt.verify(token, process.env.JWT_SECRET);

			const { db } = await connectToDatabase();
			const user = await db.collection("users").findOne({
				_id: new ObjectId(decoded.userId), // ✅ convert string → ObjectId
				isEmailVerified: true,
			});

			if (!user) {
				return { error: "User not found or not verified", status: 401 };
			}

			return {
				userId: decoded.userId,
				email: decoded.email,
				role: user.role || "user",
				status: "success", // ✅ include status
			};
		} catch (error) {
			console.error("Token verification error:", error);
			return { error: "Invalid or expired token", status: 401 };
		}
	} catch (error) {
		console.error("Authentication error:", error);
		return { error: "Authentication failed", status: 500 };
	}
}

// Admin-only middleware
export async function adminOnly(request) {
	const authResult = await authenticate(request);

	if (authResult.error) {
		return authResult;
	}

	if (authResult.role !== "admin") {
		console.error("Admin access denied:", authResult);
		return { error: "Admin access required", status: 403 };
	}

	return { ...authResult, status: "success" };
}
