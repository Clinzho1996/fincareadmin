// app/admin/loans/page.jsx
"use client";

import Modal from "@/components/Modal";
import {
	CheckCircle,
	ChevronLeft,
	ChevronRight,
	DollarSign,
	Eye,
	FileText,
	Mail,
	MoreHorizontal,
	RefreshCw,
	Search,
	XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

const AdminLoansDashboard = () => {
	const [loans, setLoans] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [analytics, setAnalytics] = useState(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");
	const [processingFeeFilter, setProcessingFeeFilter] = useState("all");
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [selectedLoan, setSelectedLoan] = useState(null);
	const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
	const [error, setError] = useState("");
	const [actionDropdownOpen, setActionDropdownOpen] = useState(null);
	const [isProcessingAction, setIsProcessingAction] = useState(false);

	useEffect(() => {
		fetchLoans();
	}, [page, statusFilter, processingFeeFilter]);

	useEffect(() => {
		fetchAnalytics();
	}, []);

	const fetchAnalytics = async () => {
		try {
			const res = await fetch("/api/admin/analytics/loans?period=30d");
			if (!res.ok) throw new Error("Failed to fetch loan analytics");
			const data = await res.json();
			setAnalytics(data.data);
		} catch (err) {
			console.error("Analytics fetch error:", err);
		}
	};

	const fetchLoans = async () => {
		try {
			setIsLoading(true);
			setError("");

			let url = `/api/admin/loans?page=${page}&status=${statusFilter}&search=${searchTerm}`;
			if (processingFeeFilter !== "all") {
				url += `&processingFeePaid=${processingFeeFilter === "paid"}`;
			}

			const response = await fetch(url);

			if (response.status === 403) {
				setError("You don't have permission to access this page.");
				setIsLoading(false);
				return;
			}

			if (!response.ok) {
				throw new Error("Failed to fetch loans");
			}

			const data = await response.json();
			setLoans(data.loans || []);
			setTotalPages(data.pagination?.pages || 1);
		} catch (error) {
			console.error("Error fetching loans:", error);
			setError("Failed to load loans data");
		} finally {
			setIsLoading(false);
		}
	};

	const handleSearch = (e) => {
		if (e.key === "Enter") {
			setPage(1);
			fetchLoans();
		}
	};

	const handleStatusUpdate = async (loanId, newStatus) => {
		try {
			setIsProcessingAction(true);
			const response = await fetch(`/api/admin/loans`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ loanId, status: newStatus }),
			});

			if (!response.ok) {
				throw new Error("Failed to update loan status");
			}

			alert("Loan status updated successfully");
			fetchLoans();
			setActionDropdownOpen(null);
		} catch (error) {
			console.error("Error updating loan status:", error);
			alert("Failed to update loan status");
		} finally {
			setIsProcessingAction(false);
		}
	};

	const handleProcessingFeeUpdate = async (loanId, paid) => {
		try {
			setIsProcessingAction(true);
			const response = await fetch(`/api/admin/loans`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					loanId,
					action: "update-processing-fee",
					processingFeePaid: paid,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to update processing fee status");
			}

			alert(`Processing fee marked as ${paid ? "paid" : "unpaid"}`);
			fetchLoans();
			setActionDropdownOpen(null);
		} catch (error) {
			console.error("Error updating processing fee:", error);
			alert("Failed to update processing fee status");
		} finally {
			setIsProcessingAction(false);
		}
	};

	const handleLiquidation = async (loanId) => {
		try {
			setIsProcessingAction(true);
			const response = await fetch(`/api/admin/loans`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					loanId,
					action: "liquidate",
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to process liquidation");
			}

			const result = await response.json();
			alert(
				`Loan liquidated successfully. Credit amount: ${result.creditAmount}`
			);
			fetchLoans();
			setActionDropdownOpen(null);
		} catch (error) {
			console.error("Error processing liquidation:", error);
			alert(error.message || "Failed to process liquidation");
		} finally {
			setIsProcessingAction(false);
		}
	};

	const handleResendEmail = async (loanId) => {
		try {
			setIsProcessingAction(true);
			const response = await fetch(`/api/admin/loans`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					loanId,
					action: "resend-email",
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to resend email");
			}

			alert("Email resent successfully");
			setActionDropdownOpen(null);
		} catch (error) {
			console.error("Error resending email:", error);
			alert("Failed to resend email");
		} finally {
			setIsProcessingAction(false);
		}
	};

	const viewLoanDetails = (loan) => {
		setSelectedLoan(loan);
		setIsDetailModalOpen(true);
	};

	const getStatusBadge = (status) => {
		const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";

		switch (status) {
			case "approved":
				return (
					<span className={`${baseClasses} bg-green-100 text-green-800`}>
						Approved
					</span>
				);
			case "pending":
				return (
					<span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>
						Pending
					</span>
				);
			case "rejected":
				return (
					<span className={`${baseClasses} bg-red-100 text-red-800`}>
						Rejected
					</span>
				);
			case "active":
				return (
					<span className={`${baseClasses} bg-blue-100 text-blue-800`}>
						Active
					</span>
				);
			case "completed":
				return (
					<span className={`${baseClasses} bg-purple-100 text-purple-800`}>
						Completed
					</span>
				);
			case "liquidated":
				return (
					<span className={`${baseClasses} bg-gray-100 text-gray-800`}>
						Liquidated
					</span>
				);
			default:
				return (
					<span className={`${baseClasses} bg-gray-100 text-gray-800`}>
						{status}
					</span>
				);
		}
	};

	const getProcessingFeeBadge = (paid) => {
		const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";
		return paid ? (
			<span className={`${baseClasses} bg-green-100 text-green-800`}>Paid</span>
		) : (
			<span className={`${baseClasses} bg-red-100 text-red-800`}>Unpaid</span>
		);
	};

	// app/admin/loans/page.jsx
	// Update the fee display logic to handle both structures
	const formatCurrency = (amount) => {
		if (amount === undefined || amount === null) return "₦0.00";
		return new Intl.NumberFormat("en-NG", {
			style: "currency",
			currency: "NGN",
		}).format(amount);
	};

	// Add helper functions to get loan details safely
	const getLoanDetails = (loan) => {
		// For old loans without loanDetails, calculate on the fly
		if (!loan.loanDetails) {
			const LOAN_INTEREST_RATE = 0.1;
			const LOAN_PROCESSING_FEE_RATE = 0.01;

			const principalAmount = Number(loan.loanAmount);
			const duration = Number(loan.duration);

			const processingFee = principalAmount * LOAN_PROCESSING_FEE_RATE;
			const interestAmount =
				principalAmount * LOAN_INTEREST_RATE * (duration / 12);
			const totalLoanAmount = principalAmount + interestAmount;
			const monthlyInstallment = totalLoanAmount / duration;

			return {
				principalAmount,
				processingFee,
				interestRate: LOAN_INTEREST_RATE,
				interestAmount,
				totalLoanAmount,
				monthlyInstallment,
				remainingBalance: totalLoanAmount,
				paidAmount: 0,
				processingFeePaid: false,
			};
		}

		return loan.loanDetails;
	};


	const formatDate = (dateString) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const calculateLoanAge = (createdAt) => {
		const created = new Date(createdAt);
		const now = new Date();
		const months =
			(now.getFullYear() - created.getFullYear()) * 12 +
			(now.getMonth() - created.getMonth());
		return months;
	};

	if (error) {
		return (
			<div className="container mx-auto px-4 py-8">
				<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
					<strong className="font-bold">Error: </strong>
					<span className="block sm:inline">{error}</span>
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto px-4 py-8 mt-4 w-full">
			{/* Analytics Dashboard */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
				{/* Total Loans */}
				<div className="bg-white p-4 rounded-lg shadow border">
					<h3 className="text-sm font-medium text-gray-600">Total Loans</h3>
					<p className="text-2xl font-bold mt-1">
						{analytics ? analytics.summary.total : "—"}
					</p>
					<p className="text-xs text-gray-500 mt-1">Last 30 days</p>
				</div>

				{/* Pending Review */}
				<div className="bg-white p-4 rounded-lg shadow border">
					<h3 className="text-sm font-medium text-gray-600">Pending Review</h3>
					<p className="text-2xl font-bold mt-1">
						{analytics ? analytics.summary.pendingCount : "—"}
					</p>
					<p className="text-xs text-gray-500 mt-1">Requires action</p>
				</div>

				{/* Total Loan Value */}
				<div className="bg-white p-4 rounded-lg shadow border">
					<h3 className="text-sm font-medium text-gray-600">
						Total Loan Value
					</h3>
					<p className="text-2xl font-bold mt-1">
						{analytics
							? formatCurrency(analytics.summary.totalLoanAmount)
							: "—"}
					</p>
					<p className="text-xs text-gray-500 mt-1">All time</p>
				</div>

				{/* Pending Fees */}
				<div className="bg-white p-4 rounded-lg shadow border">
					<h3 className="text-sm font-medium text-gray-600">Pending Fees</h3>
					<p className="text-2xl font-bold mt-1">
						{analytics
							? formatCurrency(analytics.summary.pendingProcessingFees)
							: "—"}
					</p>
					<p className="text-xs text-gray-500 mt-1">Unpaid processing fees</p>
				</div>
			</div>

			{/* Main Content */}
			<div className="bg-white rounded-lg shadow border">
				<div className="p-6 border-b">
					<div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
						<div>
							<h2 className="text-xl font-semibold">Loan Management</h2>
							<p className="text-gray-600 mt-1">
								Manage loans, processing fees, and liquidations
							</p>
						</div>

						<div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
							<div className="relative">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
								<input
									placeholder="Search loans..."
									className="pl-10 pr-4 py-2 border rounded-md w-full md:w-64"
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									onKeyDown={handleSearch}
								/>
							</div>

							<select
								className="border rounded-md px-3 py-2 w-full md:w-32"
								value={statusFilter}
								onChange={(e) => setStatusFilter(e.target.value)}>
								<option value="all">All Status</option>
								<option value="pending">Pending</option>
								<option value="approved">Approved</option>
								<option value="rejected">Rejected</option>
								<option value="active">Active</option>
								<option value="completed">Completed</option>
								<option value="liquidated">Liquidated</option>
							</select>

							<select
								className="border rounded-md px-3 py-2 w-full md:w-32"
								value={processingFeeFilter}
								onChange={(e) => setProcessingFeeFilter(e.target.value)}>
								<option value="all">All Fees</option>
								<option value="paid">Fee Paid</option>
								<option value="unpaid">Fee Unpaid</option>
							</select>

							<button
								onClick={fetchLoans}
								className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2">
								<RefreshCw className="h-4 w-4" />
								Refresh
							</button>
						</div>
					</div>
				</div>

				<div className="p-6">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead>
								<tr>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Applicant
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Loan Details
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Fees & Interest
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Application Date
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Status
									</th>
									<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
										Actions
									</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{isLoading ? (
									Array.from({ length: 5 }).map((_, i) => (
										<tr key={i}>
											{Array.from({ length: 6 }).map((_, j) => (
												<td key={j} className="px-6 py-4 whitespace-nowrap">
													<div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
												</td>
											))}
										</tr>
									))
								) : loans.length === 0 ? (
									<tr>
										<td colSpan={6} className="px-6 py-4 text-center">
											No loans found.
										</td>
									</tr>
								) : (
									loans.map((loan) => (
										<tr key={loan._id} className="hover:bg-gray-50">
											<td className="px-6 py-4 whitespace-nowrap">
												<div className="font-medium text-gray-900">
													{loan.borrowerDetails?.fullName || "N/A"}
												</div>
												<div className="text-sm text-gray-500">
													{loan.borrowerDetails?.email}
												</div>
												<div className="text-sm text-gray-400">
													{loan.borrowerDetails?.phone}
												</div>
											</td>

											<td className="px-6 py-4 whitespace-nowrap">
												<div className="font-semibold">
													{formatCurrency(loan.loanAmount)}
												</div>
												<div className="text-sm text-gray-500">
													{loan.duration} months
												</div>
												<div className="text-sm text-gray-400">
													{loan.purpose}
												</div>
											</td>

											<td className="px-6 py-4 whitespace-nowrap">
												<div className="text-sm">
													<span className="font-medium">Fee: </span>
													{formatCurrency(loan.loanDetails?.processingFee)}
													{getProcessingFeeBadge(
														loan.loanDetails?.processingFeePaid
													)}
												</div>
												<div className="text-sm text-gray-500">
													<span className="font-medium">Interest: </span>
													{formatCurrency(loan.loanDetails?.interestAmount)}
												</div>
												<div className="text-sm text-gray-400">
													<span className="font-medium">Total: </span>
													{formatCurrency(loan.loanDetails?.totalLoanAmount)}
												</div>
											</td>

											<td className="px-6 py-4 whitespace-nowrap">
												<div className="text-sm">
													{formatDate(loan.createdAt)}
												</div>
												<div className="text-xs text-gray-400">
													{calculateLoanAge(loan.createdAt)} months ago
												</div>
											</td>

											<td className="px-6 py-4 whitespace-nowrap">
												{getStatusBadge(loan.status)}
											</td>

											<td className="px-6 py-4 whitespace-nowrap text-right">
												<div className="relative inline-block text-left">
													<button
														disabled={isProcessingAction}
														className="inline-flex justify-center items-center p-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
														onClick={() =>
															setActionDropdownOpen(
																actionDropdownOpen === loan._id
																	? null
																	: loan._id
															)
														}>
														<MoreHorizontal className="h-4 w-4" />
													</button>

													{actionDropdownOpen === loan._id && (
														<div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
															<div className="py-1">
																<button
																	onClick={() => viewLoanDetails(loan)}
																	className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left">
																	<Eye className="mr-2 h-4 w-4" />
																	View Details
																</button>

																{loan.status === "approved" &&
																	!loan.loanDetails?.processingFeePaid && (
																		<button
																			onClick={() =>
																				handleProcessingFeeUpdate(
																					loan._id,
																					true
																				)
																			}
																			className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left">
																			<DollarSign className="mr-2 h-4 w-4" />
																			Mark Fee as Paid
																		</button>
																	)}

																{loan.status === "approved" &&
																	loan.loanDetails?.processingFeePaid && (
																		<button
																			onClick={() =>
																				handleProcessingFeeUpdate(
																					loan._id,
																					false
																				)
																			}
																			className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left">
																			<DollarSign className="mr-2 h-4 w-4" />
																			Mark Fee as Unpaid
																		</button>
																	)}

																{loan.status === "approved" &&
																	calculateLoanAge(loan.createdAt) >= 6 && (
																		<button
																			onClick={() =>
																				handleLiquidation(loan._id)
																			}
																			className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left">
																			<FileText className="mr-2 h-4 w-4" />
																			Process Liquidation
																		</button>
																	)}

																<button
																	onClick={() => handleResendEmail(loan._id)}
																	className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left">
																	<Mail className="mr-2 h-4 w-4" />
																	Resend Email
																</button>

																{loan.status === "pending" && (
																	<>
																		<button
																			onClick={() =>
																				handleStatusUpdate(loan._id, "approved")
																			}
																			className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left">
																			<CheckCircle className="mr-2 h-4 w-4" />
																			Approve Loan
																		</button>
																		<button
																			onClick={() =>
																				handleStatusUpdate(loan._id, "rejected")
																			}
																			className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left">
																			<XCircle className="mr-2 h-4 w-4" />
																			Reject Loan
																		</button>
																	</>
																)}
															</div>
														</div>
													)}
												</div>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>

					{!isLoading && loans.length > 0 && (
						<div className="flex items-center justify-between mt-4">
							<div className="text-sm text-gray-700">
								Page {page} of {totalPages}
							</div>
							<div className="flex space-x-2">
								<button
									onClick={() => setPage(page - 1)}
									disabled={page === 1}
									className="px-3 py-1 border rounded-md text-sm disabled:opacity-50 flex items-center">
									<ChevronLeft className="h-4 w-4 mr-1" /> Previous
								</button>
								<button
									onClick={() => setPage(page + 1)}
									disabled={page === totalPages}
									className="px-3 py-1 border rounded-md text-sm disabled:opacity-50 flex items-center">
									Next <ChevronRight className="h-4 w-4 ml-1" />
								</button>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Loan Detail Modal */}
			<Modal
				title="Loan Application Details"
				isOpen={isDetailModalOpen}
				onClose={() => setIsDetailModalOpen(false)}
				className="max-w-4xl">
				{selectedLoan && (
					<div className="space-y-6">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							{/* Applicant Information */}
							<div className="bg-gray-50 p-4 rounded-lg">
								<h3 className="font-medium text-gray-700 text-lg mb-3">
									Applicant Information
								</h3>
								<div className="space-y-2">
									<p>
										<span className="font-semibold">Name:</span>{" "}
										{selectedLoan.borrowerDetails?.fullName}
									</p>
									<p>
										<span className="font-semibold">Email:</span>{" "}
										{selectedLoan.borrowerDetails?.email}
									</p>
									<p>
										<span className="font-semibold">Phone:</span>{" "}
										{selectedLoan.borrowerDetails?.phone}
									</p>
									<p>
										<span className="font-semibold">Gender:</span>{" "}
										{selectedLoan.borrowerDetails?.gender}
									</p>
								</div>
							</div>

							{/* Loan Information */}
							<div className="bg-gray-50 p-4 rounded-lg">
								<h3 className="font-medium text-gray-700 text-lg mb-3">
									Loan Information
								</h3>
								<div className="space-y-2">
									<p>
										<span className="font-semibold">Principal:</span>{" "}
										{formatCurrency(selectedLoan.loanAmount)}
									</p>
									<p>
										<span className="font-semibold">Interest (10%):</span>{" "}
										{formatCurrency(selectedLoan.loanDetails?.interestAmount)}
									</p>
									<p>
										<span className="font-semibold">Processing Fee (1%):</span>{" "}
										{formatCurrency(selectedLoan.loanDetails?.processingFee)}
									</p>
									<p>
										<span className="font-semibold">Total Amount:</span>{" "}
										{formatCurrency(selectedLoan.loanDetails?.totalLoanAmount)}
									</p>
									<p>
										<span className="font-semibold">Monthly Payment:</span>{" "}
										{formatCurrency(
											selectedLoan.loanDetails?.monthlyInstallment
										)}
									</p>
									<p>
										<span className="font-semibold">Remaining Balance:</span>{" "}
										{formatCurrency(selectedLoan.loanDetails?.remainingBalance)}
									</p>
									<p>
										<span className="font-semibold">Duration:</span>{" "}
										{selectedLoan.duration} months
									</p>
									<p>
										<span className="font-semibold">Purpose:</span>{" "}
										{selectedLoan.purpose}
									</p>
									<p>
										<span className="font-semibold">Processing Fee Paid:</span>{" "}
										{getProcessingFeeBadge(
											selectedLoan.loanDetails?.processingFeePaid
										)}
									</p>
								</div>
							</div>

							{/* Status & Dates */}
							<div className="bg-gray-50 p-4 rounded-lg">
								<h3 className="font-medium text-gray-700 text-lg mb-3">
									Status & Timeline
								</h3>
								<div className="space-y-2">
									<p>
										<span className="font-semibold">Status:</span>{" "}
										{getStatusBadge(selectedLoan.status)}
									</p>
									<p>
										<span className="font-semibold">Application Date:</span>{" "}
										{formatDate(selectedLoan.createdAt)}
									</p>
									<p>
										<span className="font-semibold">Last Updated:</span>{" "}
										{formatDate(selectedLoan.updatedAt)}
									</p>
									<p>
										<span className="font-semibold">Loan Age:</span>{" "}
										{calculateLoanAge(selectedLoan.createdAt)} months
									</p>
								</div>
							</div>

							{/* Guarantor Information */}
							{selectedLoan.guarantorDetails && (
								<div className="bg-gray-50 p-4 rounded-lg">
									<h3 className="font-medium text-gray-700 text-lg mb-3">
										Guarantor Information
									</h3>
									<div className="space-y-2">
										<p>
											<span className="font-semibold">Coverage:</span>{" "}
											{selectedLoan.guarantorDetails.coverage}%
										</p>
										<p>
											<span className="font-semibold">Profession:</span>{" "}
											{selectedLoan.guarantorDetails.profession}
										</p>
									</div>
								</div>
							)}
						</div>

						{/* Payment History */}
						{selectedLoan.payments && selectedLoan.payments.length > 0 && (
							<div className="bg-gray-50 p-4 rounded-lg">
								<h3 className="font-medium text-gray-700 text-lg mb-3">
									Payment History
								</h3>
								<div className="space-y-2">
									{selectedLoan.payments.map((payment, index) => (
										<div
											key={index}
											className="flex justify-between items-center border-b pb-2">
											<div>
												<p className="font-medium">{payment.type}</p>
												<p className="text-sm text-gray-500">
													{formatDate(payment.date)}
												</p>
												{payment.description && (
													<p className="text-sm text-gray-400">
														{payment.description}
													</p>
												)}
											</div>
											<div className="text-right">
												<p className="font-semibold">
													{formatCurrency(payment.amount)}
												</p>
											</div>
										</div>
									))}
								</div>
							</div>
						)}

						<div className="flex justify-end border-t pt-4 mt-4 gap-2">
							<button
								className="px-4 py-2 border rounded-md"
								onClick={() => setIsDetailModalOpen(false)}>
								Close
							</button>
							{selectedLoan.status === "pending" && (
								<>
									<button
										className="px-4 py-2 bg-green-600 text-white rounded-md"
										onClick={() => {
											handleStatusUpdate(selectedLoan._id, "approved");
											setIsDetailModalOpen(false);
										}}>
										Approve
									</button>
									<button
										className="px-4 py-2 bg-red-600 text-white rounded-md"
										onClick={() => {
											handleStatusUpdate(selectedLoan._id, "rejected");
											setIsDetailModalOpen(false);
										}}>
										Reject
									</button>
								</>
							)}
						</div>
					</div>
				)}
			</Modal>
		</div>
	);
};

export default AdminLoansDashboard;
