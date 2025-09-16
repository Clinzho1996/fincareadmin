import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const options = {};

let client;
let clientPromise;

if (!uri) {
	throw new Error("Please add your Mongo URI to .env.local");
}

if (process.env.NODE_ENV === "development") {
	// In development mode, reuse the global variable across hot reloads
	if (!global._mongoClientPromise) {
		client = new MongoClient(uri, options);
		global._mongoClientPromise = client.connect();
	}
	clientPromise = global._mongoClientPromise;
} else {
	// In production mode, always create a new connection
	client = new MongoClient(uri, options);
	clientPromise = client.connect();
}

// Export connection helper
export async function connectToDatabase() {
	const client = await clientPromise;
	const db = client.db(process.env.MONGODB_DB);
	return { client, db };
}
