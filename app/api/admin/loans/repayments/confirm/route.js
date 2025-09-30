export const dynamic = "force-dynamic";

import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

export async function POST(request) {
	try {
		// Authenticate admin user
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}

		// Check if user is admin (you'll need to implement this check)
		// const isAdmin = await checkAdmin(authResult.userId);
		// if (!isAdmin) {
		//   return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
		// }

		const { db } = await connectToDatabase();
		const { repaymentId, action } = await request.json(); // action: 'approve' or 'reject'

		if (!repaymentId || !action) {
			return NextResponse.json(
				{ error: "Repayment ID and action are required" },
				{ status: 400 }
			);
		}

		// Get the repayment record
		const repayment = await db.collection("loan_repayments").findOne({
			_id: new ObjectId(repaymentId),
		});

		if (!repayment) {
			return NextResponse.json(
				{ error: "Repayment not found" },
				{ status: 404 }
			);
		}

		if (action === "approve") {
			// Update repayment status
			await db.collection("loan_repayments").updateOne(
				{ _id: new ObjectId(repaymentId) },
				{
					$set: {
						status: "approved",
						approvedAt: new Date(),
						approvedBy: authResult.userId,
					},
				}
			);

			// Get the loan
			const loan = await db.collection("loans").findOne({
				_id: repayment.loanId,
			});

			if (loan) {
				// Calculate new loan details
				const currentPaidAmount = loan.paidAmount || 0;
				const newPaidAmount = currentPaidAmount + repayment.amount;
				const totalLoanAmount =
					loan.loanDetails?.totalLoanAmount ||
					loan.loanAmount + (loan.loanAmount * (loan.interestRate || 10)) / 100;

				const newRemainingBalance = Math.max(
					0,
					totalLoanAmount - newPaidAmount
				);

				// Check if loan is fully paid
				const isFullyPaid = newRemainingBalance <= 0;

				// Update loan with new payment
				await db.collection("loans").updateOne(
					{ _id: repayment.loanId },
					{
						$set: {
							paidAmount: newPaidAmount,
							"loanDetails.paidAmount": newPaidAmount,
							"loanDetails.remainingBalance": newRemainingBalance,
							status: isFullyPaid ? "completed" : "active",
							updatedAt: new Date(),
						},
						$push: {
							payments: {
								amount: repayment.amount,
								paymentDate: new Date(),
								repaymentId: repayment._id,
								status: "approved",
							},
						},
					}
				);

				return NextResponse.json({
					status: "success",
					message: `Payment approved successfully. ${
						isFullyPaid ? "Loan fully paid!" : ""
					}`,
					isFullyPaid,
					newRemainingBalance,
				});
			}
		} else if (action === "reject") {
			// Update repayment status to rejected
			await db.collection("loan_repayments").updateOne(
				{ _id: new ObjectId(repaymentId) },
				{
					$set: {
						status: "rejected",
						rejectedAt: new Date(),
						rejectedBy: authResult.userId,
						rejectionReason: "Proof of payment not valid", // You can make this dynamic
					},
				}
			);

			return NextResponse.json({
				status: "success",
				message: "Payment rejected successfully",
			});
		} else {
			return NextResponse.json(
				{ error: "Invalid action. Use 'approve' or 'reject'" },
				{ status: 400 }
			);
		}
	} catch (error) {
		console.error("POST /api/admin/repayments/confirm error:", error);
		return NextResponse.json(
			{ error: "Internal server error: " + error.message },
			{ status: 500 }
		);
	}
}

// GET all repayments for admin review
export async function GET(request) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}

		const { db } = await connectToDatabase();
		const { searchParams } = new URL(request.url);
		const status = searchParams.get("status") || "pending_review";

		const repayments = await db
			.collection("loan_repayments")
			.aggregate([
				{ $match: { status } },
				{
					$lookup: {
						from: "loans",
						localField: "loanId",
						foreignField: "_id",
						as: "loan",
					},
				},
				{
					$lookup: {
						from: "users",
						localField: "userId",
						foreignField: "_id",
						as: "user",
					},
				},
				{ $sort: { submittedAt: -1 } },
			])
			.toArray();

		return NextResponse.json({ repayments });
	} catch (error) {
		console.error("GET admin repayments error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
