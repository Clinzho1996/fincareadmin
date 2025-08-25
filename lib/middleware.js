// lib/middleware.js
import jwt from "jsonwebtoken";

export async function authenticate(request) {
	try {
		const authHeader = request.headers.get("authorization");

		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return { error: "Authentication token required", status: 401 };
		}

		const token = authHeader.substring(7);

		try {
			const decoded = jwt.verify(token, process.env.JWT_SECRET);
			return { userId: decoded.userId, email: decoded.email };
		} catch (error) {
			return { error: "Invalid or expired token", status: 401 };
		}
	} catch (error) {
		return { error: "Authentication failed", status: 500 };
	}
}
