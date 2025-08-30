import dotenv from "dotenv";
import fs from "fs";
import { MongoClient, ObjectId } from "mongodb";
import path from "path";

dotenv.config();

const __dirname = path.resolve();
const filePath = path.join(__dirname, "scripts", "transactions.json");

async function importTransactions() {
	const client = new MongoClient(process.env.MONGODB_URI);

	try {
		// Connect to MongoDB
		await client.connect();
		console.log("✅ Connected to MongoDB");

		const db = client.db(); // default DB from URI
		const collection = db.collection("transactions");

		// Load the transactions data
		const rawData = JSON.parse(fs.readFileSync(filePath, "utf8"));

		// Handle both formats: { "transactions": [...] } OR just [...]
		const transactionsData = Array.isArray(rawData)
			? rawData
			: rawData.transactions;

		if (!Array.isArray(transactionsData)) {
			throw new Error(
				"transactions.json must contain an array or { transactions: [] }"
			);
		}

		// Convert string IDs to ObjectId
		const transactions = transactionsData.map((tx) => ({
			...tx,
			_id: new ObjectId(tx._id),
			userId: new ObjectId(tx.userId),
			createdAt: new Date(tx.createdAt),
			updatedAt: new Date(tx.updatedAt),
		}));

		// Insert into collection
		const result = await collection.insertMany(transactions);
		console.log(
			`✅ Successfully imported ${result.insertedCount} transactions`
		);
	} catch (error) {
		console.error("❌ Error importing transactions:", error);
	} finally {
		await client.close();
	}
}

importTransactions();
