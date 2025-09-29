// app/api/loans/repayment/route.js - Updated POST method
export async function POST(request) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}

		const { db } = await connectToDatabase();

		// Parse JSON body instead of FormData
		const { loanId, amount, proofImage, fileName } = await request.json();

		console.log("Received repayment data:", {
			loanId,
			amount,
			hasProof: !!proofImage,
			proofLength: proofImage ? proofImage.length : 0,
			authUserId: authResult.userId,
			authUserIdType: typeof authResult.userId,
		});

		if (!loanId || !amount) {
			return NextResponse.json(
				{ error: "Loan ID and amount are required" },
				{ status: 400 }
			);
		}

		// Debug: Check what loans exist for this user
		const userLoans = await db
			.collection("loans")
			.find({
				userId: new ObjectId(authResult.userId),
			})
			.toArray();

		console.log("User loans found:", userLoans.length);
		userLoans.forEach((loan) => {
			console.log(
				`Loan: ${loan._id}, Status: ${loan.status}, UserId: ${loan.userId}`
			);
		});

		// Find the specific loan
		const loan = await db.collection("loans").findOne({
			_id: new ObjectId(loanId),
			userId: new ObjectId(authResult.userId),
		});

		console.log("Loan query result:", loan ? "FOUND" : "NOT FOUND");
		console.log("Searching for loanId:", loanId);
		console.log("Searching for userId:", authResult.userId);

		if (!loan) {
			// Let's check if the loan exists at all, regardless of user
			const anyLoan = await db.collection("loans").findOne({
				_id: new ObjectId(loanId),
			});

			console.log("Loan exists in database:", anyLoan ? "YES" : "NO");
			if (anyLoan) {
				console.log("Loan found but userId mismatch:");
				console.log("Loan userId:", anyLoan.userId);
				console.log("Auth userId:", authResult.userId);
				console.log(
					"UserIds match:",
					anyLoan.userId.toString() === authResult.userId
				);
			}

			return NextResponse.json({ error: "Loan not found" }, { status: 404 });
		}

		if (loan.status !== "active" && loan.status !== "approved") {
			return NextResponse.json(
				{ error: "Only active or approved loans can receive payments" },
				{ status: 400 }
			);
		}

		// Handle base64 image - store it directly or upload to cloud storage
		let proofUrl = null;
		if (proofImage) {
			// For now, we'll store the base64 string directly
			// In production, you might want to upload to cloud storage
			proofUrl = `data:image/jpeg;base64,${proofImage}`;
			console.log("Proof image received, length:", proofImage.length);
		}

		// Create repayment record
		const repaymentData = {
			loanId: new ObjectId(loanId),
			userId: new ObjectId(authResult.userId),
			amount: parseFloat(amount),
			proofImage: proofUrl,
			fileName: fileName || "payment-proof.jpg",
			status: "pending_review",
			submittedAt: new Date(),
			createdAt: new Date(),
		};

		const repaymentResult = await db
			.collection("loan_repayments")
			.insertOne(repaymentData);

		// Update loan status to indicate payment is pending review
		await db.collection("loans").updateOne(
			{ _id: new ObjectId(loanId) },
			{
				$set: {
					status: "payment_pending",
					updatedAt: new Date(),
				},
			}
		);

		console.log("Repayment record created:", repaymentResult.insertedId);

		return NextResponse.json({
			status: "success",
			message: "Payment proof submitted successfully. Awaiting admin approval.",
			repaymentId: repaymentResult.insertedId,
		});
	} catch (error) {
		console.error("POST /api/loans/repayment error:", error);
		console.error("Error stack:", error.stack);
		return NextResponse.json(
			{ error: "Internal server error: " + error.message },
			{ status: 500 }
		);
	}
}

// GET - Get user's loan repayments
export async function GET(request) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}

		const { searchParams } = new URL(request.url);
		const loanId = searchParams.get("loanId");
		const status = searchParams.get("status");

		const { db } = await connectToDatabase();

		// Build query
		const query = { userId: authResult.userId };
		if (loanId) query.loanId = new ObjectId(loanId);
		if (status) query.status = status;

		const repayments = await db
			.collection("loan_repayments")
			.find(query)
			.sort({ submittedAt: -1 })
			.toArray();

		return NextResponse.json({ repayments });
	} catch (error) {
		console.error("GET repayments error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
