// lib/middleware.js - Updated version
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

export async function authenticate(request) {
	try {
		console.log("Authentication started");

		const authHeader = request.headers.get("authorization");
		console.log("Auth header:", authHeader ? "Present" : "Missing");

		if (!authHeader) {
			console.log("No authorization header");
			return { error: "No token provided", status: 401 };
		}

		if (!authHeader.startsWith("Bearer ")) {
			console.log("Invalid authorization format");
			return { error: "Invalid token format", status: 401 };
		}

		const token = authHeader.substring(7);
		console.log("Token extracted, length:", token.length);

		if (!process.env.JWT_SECRET) {
			console.error("JWT_SECRET is not defined");
			return { error: "Server configuration error", status: 500 };
		}

		try {
			const decoded = jwt.verify(token, process.env.JWT_SECRET);
			console.log("Token successfully decoded");
			console.log("Decoded user ID:", decoded.userId);
			console.log("Decoded email:", decoded.email);

			// Return both string and ObjectId versions for flexibility
			let userIdObjectId;
			let userIdString = decoded.userId;

			try {
				userIdObjectId = new ObjectId(decoded.userId);
				console.log("Successfully converted to ObjectId");
			} catch (objectIdError) {
				console.log(
					"User ID is not a valid ObjectId string, using as string",
					objectIdError
				);
				userIdObjectId = decoded.userId;
			}

			return {
				userId: userIdObjectId, // Could be ObjectId or string
				userIdString: userIdString, // Always the string version
				email: decoded.email,
			};
		} catch (jwtError) {
			console.error("JWT verification error:", jwtError.message);

			if (jwtError.name === "JsonWebTokenError") {
				return { error: "Invalid token", status: 401 };
			} else if (jwtError.name === "TokenExpiredError") {
				return { error: "Token expired", status: 401 };
			} else {
				return { error: "Token verification failed", status: 401 };
			}
		}
	} catch (error) {
		console.error("Authentication process error:", error);
		return { error: "Authentication failed", status: 500 };
	}
}
