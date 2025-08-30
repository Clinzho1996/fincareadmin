import bcrypt from "bcryptjs";
import { connectToDatabase } from "../lib/mongodb.js";

async function createSuperAdmin() {
	try {
		const { db } = await connectToDatabase();

		const superAdmin = {
			name: "Super Admin",
			email: "superadmin@fincare.com",
			password: await bcrypt.hash("admin123", 12),
			role: "super_admin",
			permissions: ["*"], // Full permissions
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		// Check if super admin already exists
		const existingAdmin = await db.collection("admin_users").findOne({
			email: superAdmin.email,
		});

		if (!existingAdmin) {
			await db.collection("admin_users").insertOne(superAdmin);
			console.log("Super admin created successfully");
			console.log("Email: superadmin@fincare.com");
			console.log("Password: admin123");
		} else {
			console.log("Super admin already exists");
		}
	} catch (error) {
		console.error("Error creating super admin:", error);
	}
}

createSuperAdmin();
