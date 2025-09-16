// app/admin/customers/[id]/page.jsx
"use client";

import HeaderBox from "@/components/HeaderBox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Calendar,
	CheckCircle,
	DollarSign,
	Eye,
	Loader2,
	Plus,
	RefreshCw,
	XCircle,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface Customer {
	_id: string;
	firstName: string;
	lastName: string;
	otherName: string;
	phone: string;
	email: string;
	isEmailVerified: boolean;
	savingsBalance: number;
	totalInvestment: number;
	totalLoans: number;
	totalAuctions: number;
	createdAt: string;
	updatedAt: string;
	bvn: string;
	dob: string;
	gender: string;
	kycCompleted: boolean;
	membershipApplicationDate: string;
	membershipApprovalDate: string;
	membershipLevel: string;
	membershipStatus: string;
	profession: string;
	source_of_income: string;
	accountNumber: string;
	address: string;
	bank: string;
}

interface Saving {
	_id: string;
	amount: number;
	currentBalance: number;
	reason: string;
	type: string;
	status: string;
	createdAt: string;
	verifiedAt?: string;
	rejectedAt?: string;
	notes?: string;
	rejectionReason?: string;
	targetAmount?: number;
}

export default function CustomerDetailsPage() {
	const { id } = useParams();
	const { data: session } = useSession();
	const accessToken = session?.accessToken;
	const [customer, setCustomer] = useState<Customer | null>(null);
	const [savings, setSavings] = useState<Saving[]>([]);
	const [loading, setLoading] = useState(true);
	const [savingsLoading, setSavingsLoading] = useState(false);
	const [showAddSavings, setShowAddSavings] = useState(false);
	const [newSavings, setNewSavings] = useState({
		amount: "",
		reason: "",
		notes: "",
	});
	const [refreshing, setRefreshing] = useState(false);

	useEffect(() => {
		if (!id) return;
		fetchCustomer();
		fetchSavings();
	}, [id]);

	const fetchCustomer = async () => {
		try {
			const res = await fetch(`/api/admin/customers/${id}`, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${accessToken}`,
				},
			});
			const data = await res.json();
			setCustomer(data.data);
		} catch (err) {
			console.error("Error fetching customer:", err);
		}
	};

	const fetchSavings = async () => {
		try {
			setSavingsLoading(true);
			const res = await fetch(`/api/admin/savings?userId=${id}&status=all`, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${accessToken}`,
				},
			});

			if (!res.ok) {
				throw new Error(`HTTP error! status: ${res.status}`);
			}

			const data = await res.json();
			console.log("Savings API response:", data); // Debug log

			if (data.status === "success") {
				setSavings(data.data.savings || []);
			} else {
				console.error("API returned error:", data.error);
				setSavings([]);
			}
		} catch (err) {
			console.error("Error fetching savings:", err);
			setSavings([]);
		} finally {
			setSavingsLoading(false);
			setLoading(false);
			setRefreshing(false);
		}
	};

	const handleRefresh = async () => {
		setRefreshing(true);
		await Promise.all([fetchCustomer(), fetchSavings()]);
	};

	const handleVerifySaving = async (savingId: string) => {
		try {
			const res = await fetch(`/api/admin/savings`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${accessToken}`,
				},
				body: JSON.stringify({
					savingId,
					action: "verify",
				}),
			});

			const data = await res.json();
			if (data.status === "success") {
				alert("Savings verified successfully");
				handleRefresh();
			} else {
				alert(data.error || "Failed to verify savings");
			}
		} catch (err) {
			console.error("Error verifying savings:", err);
			alert("Failed to verify savings");
		}
	};

	const handleRejectSaving = async (savingId: string) => {
		const reason = prompt("Enter rejection reason:");
		if (!reason) return;

		try {
			const res = await fetch(`/api/admin/savings`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${accessToken}`,
				},
				body: JSON.stringify({
					savingId,
					action: "reject",
					notes: reason,
				}),
			});

			const data = await res.json();
			if (data.status === "success") {
				alert("Savings rejected successfully");
				handleRefresh();
			} else {
				alert(data.error || "Failed to reject savings");
			}
		} catch (err) {
			console.error("Error rejecting savings:", err);
			alert("Failed to reject savings");
		}
	};

	const handleAddSavings = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newSavings.amount || parseFloat(newSavings.amount) <= 0) {
			alert("Please enter a valid amount");
			return;
		}

		try {
			const res = await fetch(`/api/admin/savings`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${accessToken}`,
				},
				body: JSON.stringify({
					userId: id,
					amount: parseFloat(newSavings.amount),
					reason: newSavings.reason || "Manual deposit",
					notes: newSavings.notes,
				}),
			});

			const data = await res.json();
			console.log("Add savings response:", data); // Debug log

			if (data.status === "success") {
				alert("Savings added successfully");
				setNewSavings({ amount: "", reason: "", notes: "" });
				setShowAddSavings(false);
				// Refresh both customer data and savings list
				handleRefresh();
			} else {
				alert(data.error || "Failed to add savings");
			}
		} catch (err) {
			console.error("Error adding savings:", err);
			alert("Failed to add savings");
		}
	};

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("en-NG", {
			style: "currency",
			currency: "NGN",
		}).format(amount);
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const getStatusBadge = (status: string) => {
		switch (status) {
			case "verified":
				return <Badge className="bg-green-100 text-green-800">Verified</Badge>;
			case "pending":
				return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
			case "rejected":
				return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
			default:
				return <Badge>{status}</Badge>;
		}
	};

	if (loading) {
		return (
			<div className="flex justify-center items-center h-64">
				<Loader2 className="h-6 w-6 animate-spin" />
			</div>
		);
	}

	if (!customer) {
		return <div className="p-6">Customer not found.</div>;
	}

	return (
		<>
			<HeaderBox title="Customer Details" />
			<div className="p-6 space-y-6">
				<Card>
					<CardHeader>
						<CardTitle>Personal Information</CardTitle>
					</CardHeader>
					<CardContent>
						<Table>
							<TableBody>
								<TableRow>
									<TableCell className="font-medium">Full Name</TableCell>
									<TableCell>
										{customer.firstName} {customer.otherName}{" "}
										{customer.lastName}
									</TableCell>
								</TableRow>
								<TableRow>
									<TableCell className="font-medium">Phone</TableCell>
									<TableCell>{customer.phone}</TableCell>
								</TableRow>
								<TableRow>
									<TableCell className="font-medium">Email</TableCell>
									<TableCell>{customer.email}</TableCell>
								</TableRow>
								<TableRow>
									<TableCell className="font-medium">Gender</TableCell>
									<TableCell>{customer.gender}</TableCell>
								</TableRow>
								<TableRow>
									<TableCell className="font-medium">Date of Birth</TableCell>
									<TableCell>
										{new Date(customer.dob).toLocaleDateString()}
									</TableCell>
								</TableRow>
								<TableRow>
									<TableCell className="font-medium">Address</TableCell>
									<TableCell>{customer.address}</TableCell>
								</TableRow>
								<TableRow>
									<TableCell className="font-medium">BVN</TableCell>
									<TableCell>{customer.bvn}</TableCell>
								</TableRow>
								<TableRow>
									<TableCell className="font-medium">Profession</TableCell>
									<TableCell>{customer.profession}</TableCell>
								</TableRow>
								<TableRow>
									<TableCell className="font-medium">
										Source of Income
									</TableCell>
									<TableCell>{customer.source_of_income}</TableCell>
								</TableRow>
							</TableBody>
						</Table>
					</CardContent>
				</Card>

				{/* Membership Info */}
				<Card>
					<CardHeader>
						<CardTitle>Membership Details</CardTitle>
					</CardHeader>
					<CardContent>
						<Table>
							<TableBody>
								<TableRow>
									<TableCell className="font-medium">
										Membership Level
									</TableCell>
									<TableCell>{customer.membershipLevel}</TableCell>
								</TableRow>
								<TableRow>
									<TableCell className="font-medium">
										Membership Status
									</TableCell>
									<TableCell
										className={`${
											customer.membershipStatus === "approved"
												? "text-green-600"
												: customer.membershipStatus === "suspended"
												? "text-red-600"
												: "text-yellow-600"
										}`}>
										{customer.membershipStatus}
									</TableCell>
								</TableRow>
								<TableRow>
									<TableCell className="font-medium">
										Application Date
									</TableCell>
									<TableCell>
										{new Date(
											customer.membershipApplicationDate
										).toLocaleDateString()}
									</TableCell>
								</TableRow>
								<TableRow>
									<TableCell className="font-medium">Approval Date</TableCell>
									<TableCell>
										{new Date(
											customer.membershipApprovalDate
										).toLocaleDateString()}
									</TableCell>
								</TableRow>
								<TableRow>
									<TableCell className="font-medium">KYC Completed</TableCell>
									<TableCell>{customer.kycCompleted ? "Yes" : "No"}</TableCell>
								</TableRow>
							</TableBody>
						</Table>
					</CardContent>
				</Card>

				{/* Account Info */}
				<Card>
					<CardHeader>
						<CardTitle>Bank Details</CardTitle>
					</CardHeader>
					<CardContent>
						<Table>
							<TableBody>
								<TableRow>
									<TableCell className="font-medium">Bank</TableCell>
									<TableCell>{customer.bank}</TableCell>
								</TableRow>
								<TableRow>
									<TableCell className="font-medium">Account Number</TableCell>
									<TableCell>{customer.accountNumber}</TableCell>
								</TableRow>
							</TableBody>
						</Table>
					</CardContent>
				</Card>

				{/* Financial Info */}
				<Card>
					<CardHeader>
						<CardTitle>Financial Summary</CardTitle>
					</CardHeader>
					<CardContent>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Savings</TableHead>
									<TableHead>Investments</TableHead>
									<TableHead>Loans</TableHead>
									<TableHead>Auctions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								<TableRow>
									<TableCell>₦{customer?.savingsBalance}</TableCell>
									<TableCell>₦{customer?.totalInvestment}</TableCell>
									<TableCell>₦{customer?.totalLoans}</TableCell>
									<TableCell>{customer?.totalAuctions}</TableCell>
								</TableRow>
							</TableBody>
						</Table>
					</CardContent>
				</Card>

				{/* System Info */}
				<Card>
					<CardHeader>
						<CardTitle>System Info</CardTitle>
					</CardHeader>
					<CardContent>
						<Table>
							<TableBody>
								<TableRow>
									<TableCell className="font-medium">Email Verified</TableCell>
									<TableCell>
										{customer.isEmailVerified ? "Yes" : "No"}
									</TableCell>
								</TableRow>
								<TableRow>
									<TableCell className="font-medium">Created At</TableCell>
									<TableCell>
										{new Date(customer.createdAt).toLocaleString()}
									</TableCell>
								</TableRow>
								<TableRow>
									<TableCell className="font-medium">Updated At</TableCell>
									<TableCell>
										{new Date(customer.updatedAt).toLocaleString()}
									</TableCell>
								</TableRow>
							</TableBody>
						</Table>
					</CardContent>
				</Card>
				{/* Savings Management */}
				<Card>
					<CardHeader className="flex flex-row items-center justify-between">
						<div>
							<CardTitle>Savings Management</CardTitle>
							<p className="text-sm text-gray-500 mt-1">
								Current Balance: {formatCurrency(customer.savingsBalance)}
							</p>
						</div>
						<div className="flex gap-2">
							<Button
								variant="outline"
								onClick={handleRefresh}
								disabled={refreshing}>
								<RefreshCw
									className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
								/>
								Refresh
							</Button>
							<Button onClick={() => setShowAddSavings(!showAddSavings)}>
								<Plus className="h-4 w-4 mr-2" />
								Add Savings
							</Button>
						</div>
					</CardHeader>
					<CardContent>
						{showAddSavings && (
							<div className="mb-6 p-4 border rounded-lg bg-gray-50">
								<h3 className="font-semibold mb-3">Add Manual Savings</h3>
								<form onSubmit={handleAddSavings} className="space-y-3">
									<div>
										<label className="block text-sm font-medium mb-1">
											Amount (₦)
										</label>
										<input
											type="number"
											step="0.01"
											min="0"
											value={newSavings.amount}
											onChange={(e) =>
												setNewSavings({
													...newSavings,
													amount: e.target.value,
												})
											}
											className="w-full p-2 border rounded-md"
											placeholder="Enter amount"
											required
										/>
									</div>
									<div>
										<label className="block text-sm font-medium mb-1">
											Reason
										</label>
										<input
											type="text"
											value={newSavings.reason}
											onChange={(e) =>
												setNewSavings({
													...newSavings,
													reason: e.target.value,
												})
											}
											className="w-full p-2 border rounded-md"
											placeholder="Enter reason"
										/>
									</div>
									<div>
										<label className="block text-sm font-medium mb-1">
											Notes
										</label>
										<textarea
											value={newSavings.notes}
											onChange={(e) =>
												setNewSavings({
													...newSavings,
													notes: e.target.value,
												})
											}
											className="w-full p-2 border rounded-md"
											placeholder="Additional notes"
											rows={2}
										/>
									</div>
									<div className="flex gap-2">
										<Button type="submit">
											<DollarSign className="h-4 w-4 mr-2" />
											Add Savings
										</Button>
										<Button
											type="button"
											variant="outline"
											onClick={() => setShowAddSavings(false)}>
											Cancel
										</Button>
									</div>
								</form>
							</div>
						)}

						<div className="mb-4">
							<h4 className="font-semibold mb-2">Savings History</h4>
							{savingsLoading ? (
								<div className="flex justify-center py-4">
									<Loader2 className="h-5 w-5 animate-spin" />
								</div>
							) : savings.length === 0 ? (
								<p className="text-gray-500 text-center py-4">
									No savings records found
								</p>
							) : (
								<div className="border rounded-lg overflow-hidden">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Amount</TableHead>
												<TableHead>Reason</TableHead>
												<TableHead>Date</TableHead>
												<TableHead>Status</TableHead>
												<TableHead>Actions</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{savings.map((saving) => (
												<TableRow key={saving._id}>
													<TableCell className="font-semibold">
														{formatCurrency(
															saving.amount || saving.targetAmount || 0
														)}
													</TableCell>
													<TableCell>{saving.reason}</TableCell>
													<TableCell>
														<div className="flex items-center">
															<Calendar className="h-4 w-4 mr-1" />
															{formatDate(saving.createdAt)}
														</div>
													</TableCell>
													<TableCell>{getStatusBadge(saving.status)}</TableCell>
													<TableCell>
														{saving.status === "pending" && (
															<div className="flex gap-2">
																<Button
																	size="sm"
																	onClick={() => handleVerifySaving(saving._id)}
																	className="h-8 px-2">
																	<CheckCircle className="h-4 w-4" />
																</Button>
																<Button
																	size="sm"
																	variant="destructive"
																	onClick={() => handleRejectSaving(saving._id)}
																	className="h-8 px-2">
																	<XCircle className="h-4 w-4" />
																</Button>
															</div>
														)}
														{saving.status !== "pending" && (
															<Button
																size="sm"
																variant="outline"
																className="h-8 px-2">
																<Eye className="h-4 w-4" />
															</Button>
														)}
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							)}
						</div>
					</CardContent>
				</Card>
			</div>
		</>
	);
}
