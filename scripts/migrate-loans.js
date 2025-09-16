import "dotenv/config";
import { connectToDatabase } from "../lib/mongodb.js";

const migrateLoans = async () => {
	try {
		const { db } = await connectToDatabase();
		const loans = await db.collection("loans").find({}).toArray();

		for (const loan of loans) {
			if (loan.loanDetails) continue;

			const LOAN_INTEREST_RATE = 0.1;
			const LOAN_PROCESSING_FEE_RATE = 0.01;

			const principalAmount = Number(loan.loanAmount);
			const duration = Number(loan.duration);

			const processingFee = principalAmount * LOAN_PROCESSING_FEE_RATE;
			const interestAmount =
				principalAmount * LOAN_INTEREST_RATE * (duration / 12);
			const totalLoanAmount = principalAmount + interestAmount;
			const monthlyInstallment = totalLoanAmount / duration;

			await db.collection("loans").updateOne(
				{ _id: loan._id },
				{
					$set: {
						loanDetails: {
							principalAmount,
							processingFee,
							interestRate: LOAN_INTEREST_RATE,
							interestAmount,
							totalLoanAmount,
							monthlyInstallment,
							remainingBalance: totalLoanAmount,
							paidAmount: 0,
							processingFeePaid: false,
						},
					},
				}
			);

			console.log(`Migrated loan ${loan._id}`);
		}

		console.log("Migration completed!");
		process.exit(0);
	} catch (error) {
		console.error("Migration error:", error);
		process.exit(1);
	}
};

migrateLoans();
