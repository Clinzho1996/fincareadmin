// lib/notifications.js
import { ObjectId } from "mongodb";
import { connectToDatabase } from "./mongodb";

export async function createNotification(
	userId,
	title,
	message,
	type = "info",
	data = null,
	actionUrl = null,
) {
	try {
		const { db } = await connectToDatabase();

		const notification = {
			userId: typeof userId === "string" ? new ObjectId(userId) : userId,
			title,
			message,
			type,
			data,
			actionUrl,
			isRead: false,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const result = await db.collection("notifications").insertOne(notification);
		return result.insertedId;
	} catch (error) {
		console.error("Error creating notification:", error);
		return null;
	}
}

// Specific notification types
export async function notifyLoanApproved(userId, loanAmount, loanId) {
	return createNotification(
		userId,
		"Loan Approved 🎉",
		`Your loan application of ₦${loanAmount.toLocaleString()} has been approved! Funds will be disbursed soon.`,
		"loan",
		{ loanId, amount: loanAmount },
		`/loans/${loanId}`,
	);
}

export async function notifyLoanDisbursed(userId, loanAmount, loanId) {
	return createNotification(
		userId,
		"Loan Disbursed 💰",
		`Your loan of ₦${loanAmount.toLocaleString()} has been disbursed to your account.`,
		"loan",
		{ loanId, amount: loanAmount },
		`/loans/${loanId}`,
	);
}

export async function notifySavingsVerified(userId, amount, savingId) {
	return createNotification(
		userId,
		"Savings Goal Verified ✅",
		`Your savings goal of ₦${amount.toLocaleString()} has been verified and added to your balance.`,
		"savings",
		{ savingId, amount },
		`/savings/${savingId}`,
	);
}

export async function notifyInvestmentMatured(
	userId,
	investmentName,
	amount,
	investmentId,
) {
	return createNotification(
		userId,
		"Investment Matured 📈",
		`Your investment "${investmentName}" has matured. ₦${amount.toLocaleString()} has been added to your balance.`,
		"investment",
		{ investmentId, amount, investmentName },
		`/investments/${investmentId}`,
	);
}

export async function notifyAuctionWin(
	userId,
	auctionName,
	bidAmount,
	auctionId,
) {
	return createNotification(
		userId,
		"Auction Won 🏆",
		`Congratulations! You won the auction for "${auctionName}" with a bid of ₦${bidAmount.toLocaleString()}.`,
		"auction",
		{ auctionId, bidAmount, auctionName },
		`/auctions/${auctionId}`,
	);
}

export async function notifyWithdrawalProcessed(
	userId,
	amount,
	status,
	withdrawalId,
) {
	const title =
		status === "approved" ? "Withdrawal Approved 💸" : "Withdrawal Rejected ❌";
	const message =
		status === "approved"
			? `Your withdrawal of ₦${amount.toLocaleString()} has been processed successfully.`
			: `Your withdrawal request of ₦${amount.toLocaleString()} was rejected. Please contact support.`;

	return createNotification(
		userId,
		title,
		message,
		"withdrawal",
		{ withdrawalId, amount, status },
		`/withdrawals/${withdrawalId}`,
	);
}
