// app/api/admin/settings/history/route.js
import { connectToDatabase } from "@/lib/mongodb";
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

export async function GET(request) {
	try {
		const token = await getToken({ req: request });

		if (!token || (token.role !== "admin" && token.role !== "super_admin")) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
		}

		const { db } = await connectToDatabase();

		const history = await db
			.collection("settings_history")
			.find({ type: "loan_settings_update" })
			.sort({ updatedAt: -1 })
			.limit(20)
			.toArray();

		return NextResponse.json({
			status: "success",
			data: { history },
		});
	} catch (error) {
		console.error("GET /api/admin/settings/history error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
