import jwt from "jsonwebtoken";

export async function authenticate(request) {
	try {
		console.log("Authentication started");

		const authHeader = request.headers.get("authorization");
		console.log("Auth header:", authHeader);

		if (!authHeader) {
			console.log("No authorization header");
			return { error: "No token provided", status: 401 };
		}

		if (!authHeader.startsWith("Bearer ")) {
			console.log("Invalid authorization format");
			return { error: "Invalid token format", status: 401 };
		}

		const token = authHeader.substring(7);
		console.log("Token extracted:", token);
		console.log("JWT_SECRET exists:", !!process.env.JWT_SECRET);
		console.log("JWT_SECRET length:", process.env.JWT_SECRET?.length);

		if (!process.env.JWT_SECRET) {
			console.error("JWT_SECRET is not defined");
			return { error: "Server configuration error", status: 500 };
		}

		try {
			const decoded = jwt.verify(token, process.env.JWT_SECRET);
			console.log("Token successfully decoded:", decoded);
			console.log("User ID:", decoded.userId);
			console.log("Email:", decoded.email);

			return {
				userId: decoded.userId,
				email: decoded.email,
			};
		} catch (jwtError) {
			console.error("JWT verification error details:", jwtError.message);
			console.error("JWT error name:", jwtError.name);

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
