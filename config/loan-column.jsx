// app/admin/loans/page.jsx
"use client";

import Modal from "@/components/Modal"; // Import your Modal component
import {
	CheckCircle,
	ChevronLeft,
	ChevronRight,
	Clock,
	Eye,
	MoreHorizontal,
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
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [selectedLoan, setSelectedLoan] = useState(null);
	const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
	const [error, setError] = useState("");
	const [actionDropdownOpen, setActionDropdownOpen] = useState(null);

	useEffect(() => {
		fetchLoans();
	}, [page, statusFilter]);

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

			const response = await fetch(
				`/api/admin/loans?page=${page}&status=${statusFilter}&search=${searchTerm}`
			);

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
			fetchLoans(); // Refresh the data
			setActionDropdownOpen(null);
		} catch (error) {
			console.error("Error updating loan status:", error);
			alert("Failed to update loan status");
		}
	};

	const viewLoanDetails = (loan) => {
		setSelectedLoan(loan);
		setIsDetailModalOpen(true);
	};

	const getStatusBadge = (status) => {
		switch (status) {
			case "approved":
				return <span className="status green">Approved</span>;
			case "pending":
				return (
					<span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
						Pending
					</span>
				);
			case "rejected":
				return <span className="status red">Rejected</span>;
			case "active":
				return <span className="status blue">Active</span>;
			case "completed":
				return (
					<span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
						Completed
					</span>
				);
			default:
				return (
					<span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-full">
						{status}
					</span>
				);
		}
	};

	const formatCurrency = (amount) => {
		return new Intl.NumberFormat("en-NG", {
			style: "currency",
			currency: "NGN",
		}).format(amount);
	};

	const formatDate = (dateString) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
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
		<div className=" mx-auto px-4 py-8 mt-4 w-full">
			<div className="flex flex-row justify-between items-center mb-2 gap-3">
				<div className="bg-white p-4 rounded-lg shadow border w-full">
					<h3 className="text-sm font-medium text-gray-600">Total Loans</h3>
					<p className="text-2xl font-bold mt-1">
						{analytics ? analytics.summary.total : "—"}
					</p>
					<p className="text-xs text-gray-500 mt-1">Last 30 days</p>
				</div>
				<div className="bg-white p-4 rounded-lg shadow border w-full">
					<h3 className="text-sm font-medium text-gray-600">Pending Review</h3>
					<p className="text-2xl font-bold mt-1">
						{analytics
							? analytics.loans.find((l) => l._id.status === "pending")
									?.count || 0
							: "—"}
					</p>
					<p className="text-xs text-gray-500 mt-1">Requires action</p>
				</div>
				<div className="bg-white p-4 rounded-lg shadow border w-full">
					<h3 className="text-sm font-medium text-gray-600">Approved Loans</h3>
					<p className="text-2xl font-bold mt-1">
						{analytics
							? analytics.loans.find((l) => l._id.status === "approved")
									?.count || 0
							: "—"}
					</p>
					<p className="text-xs text-gray-500 mt-1">
						{analytics
							? `${Math.round(
									((analytics.loans.find((l) => l._id.status === "approved")
										?.count || 0) /
										analytics.summary.total) *
										100
							  )}% approval rate`
							: "—"}
					</p>
				</div>
				<div className="bg-white p-4 rounded-lg shadow border w-full">
					<h3 className="text-sm font-medium text-gray-600">Total Value</h3>
					<p className="text-2xl font-bold mt-1">
						{analytics
							? new Intl.NumberFormat("en-NG", {
									style: "currency",
									currency: "NGN",
							  }).format(analytics.summary.totalAmount)
							: "—"}
					</p>
					<p className="text-xs text-gray-500 mt-1">Last 30 days</p>
				</div>
			</div>

			<div className="bg-white rounded-lg shadow border">
				<div className="p-6 border-b">
					<div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
						<div>
							<h2 className="text-xl font-semibold">Loan Applications</h2>
							<p className="text-gray-600 mt-1">
								Manage and review all loan applications
							</p>
						</div>
						<div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
							<div className="relative flex flex-row justify-between items-center">
								<Search className="absolute  h-4 w-4 text-gray-500 left-3" />
								<input
									placeholder="Search loans..."
									className="pl-8 pr-4 py-2 border rounded-md w-full md:w-64"
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									onKeyDown={handleSearch}
								/>
							</div>
							<select
								className="border rounded-md px-3 py-2 w-full md:w-40"
								value={statusFilter}
								onChange={(e) => setStatusFilter(e.target.value)}>
								<option value="all">All Statuses</option>
								<option value="pending">Pending</option>
								<option value="approved">Approved</option>
								<option value="rejected">Rejected</option>
								<option value="active">Active</option>
								<option value="completed">Completed</option>
							</select>
							<button
								onClick={fetchLoans}
								className="px-4 py-2 bg-primary-1 text-white rounded-md hover:bg-blue-700">
								Apply Filters
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
										Loan Amount
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Purpose
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Duration
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
											<td className="px-6 py-4 whitespace-nowrap">
												<div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												<div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												<div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												<div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse"></div>
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												<div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												<div className="h-6 bg-gray-200 rounded w-16 animate-pulse"></div>
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-right">
												<div className="h-8 bg-gray-200 rounded w-16 animate-pulse ml-auto"></div>
											</td>
										</tr>
									))
								) : loans.length === 0 ? (
									<tr>
										<td colSpan={7} className="px-6 py-4 text-center">
											No loans found.
										</td>
									</tr>
								) : (
									loans.map((loan) => (
										<tr key={loan._id}>
											<td className="px-6 py-4 whitespace-nowrap">
												<div className="font-medium text-gray-900">
													{loan.borrowerDetails?.fullName || "N/A"}
												</div>
												<div className="text-sm text-gray-500">
													{loan.borrowerDetails?.email}
												</div>
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												{formatCurrency(loan.loanAmount)}
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												{loan.purpose}
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												{loan.duration}
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												{formatDate(loan.createdAt)}
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												{getStatusBadge(loan.status)}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-right">
												<div className="relative inline-block text-left">
													<button
														className="inline-flex justify-center items-center p-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
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
														<div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
															<div className="py-1">
																<button
																	onClick={() => viewLoanDetails(loan)}
																	className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left">
																	<Eye className="mr-2 h-4 w-4" />
																	View Details
																</button>
																{loan.status === "pending" && (
																	<>
																		<button
																			onClick={() =>
																				handleStatusUpdate(loan._id, "approved")
																			}
																			className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left">
																			<CheckCircle className="mr-2 h-4 w-4" />
																			Approve
																		</button>
																		<button
																			onClick={() =>
																				handleStatusUpdate(loan._id, "rejected")
																			}
																			className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left">
																			<XCircle className="mr-2 h-4 w-4" />
																			Reject
																		</button>
																	</>
																)}
																{loan.status === "approved" && (
																	<button
																		onClick={() =>
																			handleStatusUpdate(loan._id, "active")
																		}
																		className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left">
																		<Clock className="mr-2 h-4 w-4" />
																		Mark as Active
																	</button>
																)}
																{loan.status === "active" && (
																	<button
																		onClick={() =>
																			handleStatusUpdate(loan._id, "completed")
																		}
																		className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left">
																		<CheckCircle className="mr-2 h-4 w-4" />
																		Mark as Completed
																	</button>
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
									className="px-3 py-1 border rounded-md text-sm disabled:opacity-50">
									<ChevronLeft className="h-4 w-4 inline" /> Previous
								</button>
								<button
									onClick={() => setPage(page + 1)}
									disabled={page === totalPages}
									className="px-3 py-1 border rounded-md text-sm disabled:opacity-50">
									Next <ChevronRight className="h-4 w-4 inline" />
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
				className="max-w-2xl">
				{selectedLoan && (
					<div className="space-y-6">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="flex flex-col gap-1">
								<h3 className="font-medium text-gray-700">
									Applicant Information
								</h3>
								<p className="mt-2">
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
							<div className="flex flex-col gap-1">
								<h3 className="font-medium text-gray-700">Loan Information</h3>
								<p className="mt-2">
									<span className="font-semibold">Amount:</span>{" "}
									{formatCurrency(selectedLoan.loanAmount)}
								</p>
								<p>
									<span className="font-semibold">Purpose:</span>{" "}
									{selectedLoan.purpose}
								</p>
								<p>
									<span className="font-semibold">Duration:</span>{" "}
									{selectedLoan.duration}
								</p>
								<p>
									<span className="font-semibold">Status:</span>{" "}
									{getStatusBadge(selectedLoan.status)}
								</p>
								<p>
									<span className="font-semibold">Application Date:</span>{" "}
									{formatDate(selectedLoan.createdAt)}
								</p>
							</div>
						</div>

						{selectedLoan.guarantorDetails && (
							<div className="flex flex-col gap-1">
								<h3 className="font-medium text-gray-700">
									Guarantor Information
								</h3>
								<p className="mt-2">
									<span className="font-semibold">Coverage:</span>{" "}
									{selectedLoan.guarantorDetails.coverage}%
								</p>
								<p>
									<span className="font-semibold">Profession:</span>{" "}
									{selectedLoan.guarantorDetails.profession}
								</p>
							</div>
						)}

						{selectedLoan.governmentId && (
							<div className="flex flex-col gap-1">
								<h3 className="font-medium text-gray-700">Government ID</h3>
								<p>{selectedLoan.governmentId}</p>
							</div>
						)}

						{selectedLoan.activeInvestments && (
							<div className="flex flex-col gap-1">
								<h3 className="font-medium text-gray-700">
									Active Investments
								</h3>
								<div className="mt-2 p-3 bg-gray-50 rounded-md gap-1 flex flex-col">
									<p>
										<span className="font-semibold">Investment ID:</span>{" "}
										{selectedLoan.activeInvestments.investmentId}
									</p>
									<p>
										<span className="font-semibold">Name:</span>{" "}
										{selectedLoan.activeInvestments.investmentName}
									</p>
									<p>
										<span className="font-semibold">Percentage:</span>{" "}
										{selectedLoan.activeInvestments.percentage}
									</p>
									<p>
										<span className="font-semibold">Status:</span>{" "}
										{selectedLoan.activeInvestments.status}
									</p>
								</div>
							</div>
						)}

						<div className="flex justify-end border-t pt-4 mt-4">
							<button
								className="mr-2 px-4 py-2 border rounded-md mt-4"
								onClick={() => setIsDetailModalOpen(false)}>
								Close
							</button>
							{selectedLoan.status === "pending" && (
								<>
									<button
										className="mr-2 px-4 py-2 bg-green-600 text-white rounded-md"
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
