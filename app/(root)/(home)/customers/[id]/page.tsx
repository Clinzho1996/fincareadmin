"use client";

import HeaderBox from "@/components/HeaderBox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";
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

export default function CustomerDetailsPage() {
	const { id } = useParams();
	const { data: session } = useSession();
	const accessToken = session?.accessToken;
	const [customer, setCustomer] = useState<Customer | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!id) return;
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
			} finally {
				setLoading(false);
			}
		};
		fetchCustomer();
	}, [id]);

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
				{/* Personal Info */}
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
			</div>
		</>
	);
}
