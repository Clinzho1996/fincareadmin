"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";

import Loader from "@/components/Loader";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	IconEdit,
	IconEye,
	IconRestore,
	IconTrash,
	IconUserPause,
} from "@tabler/icons-react";
import axios from "axios";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { CustomerDataTable } from "./customer-table";

// This type is used to define the shape of our data.
export type Customer = {
	_id: string;
	firstName: string;
	lastName: string;
	otherName?: string;
	email: string;
	phone: string;
	totalSavings: number;
	savingsBalance: number;
	totalInvestment: number;
	totalLoans: number;
	totalAuctions: number;
	membershipLevel: string;
	membershipStatus: string;
	isMember: string;
	createdAt: string;
	updatedAt: string;
	address?: string;
	gender?: string;
	account_number?: string;
	bank_name?: string;
	bvn?: string;
	profession?: string;
	source_of_income?: string;
	kycCompleted?: boolean;
	isExistingCustomer?: boolean;
};

declare module "next-auth" {
	interface Session {
		accessToken?: string;
		role?: string;
	}
}

const CustomerTable = () => {
	const { data: session } = useSession();
	const accessToken = session?.accessToken;

	const [isRestoreModalOpen, setRestoreModalOpen] = useState(false);
	const [isReactivateModalOpen, setReactivateModalOpen] = useState(false);
	const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
	const [selectedRow, setSelectedRow] = useState<any>(null);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [tableData, setTableData] = useState<Customer[]>([]);
	const [isEditModalOpen, setEditModalOpen] = useState(false);
	const [isAdvancedEditModalOpen, setAdvancedEditModalOpen] = useState(false);
	const [editData, setEditData] = useState({
		id: "",
		firstName: "",
		lastName: "",
		email: "",
		phone: "",
		address: "",
		gender: "",
		account_number: "",
		bank_name: "",
		bvn: "",
		profession: "",
		source_of_income: "",
		kycCompleted: false,
		membershipLevel: "none",
		membershipStatus: "none",
	});

	// Advanced edit state (for super admin only)
	const [advancedEditData, setAdvancedEditData] = useState({
		savings: [] as any[],
		loans: [] as any[],
		investments: [] as any[],
		auctions: [] as any[],
		savingsBalance: 0,
		totalInvestment: 0,
		totalLoans: 0,
		totalAuctions: 0,
		isExistingCustomer: false,
	});

	const openEditModal = (row: any) => {
		const customer = row.original;
		setEditData({
			id: customer._id,
			firstName: customer.firstName || "",
			lastName: customer.lastName || "",
			email: customer.email || "",
			phone: customer.phone || "",
			address: customer.address || "",
			gender: customer.gender || "",
			account_number: customer.account_number || "",
			bank_name: customer.bank_name || "",
			bvn: customer.bvn || "",
			profession: customer.profession || "",
			source_of_income: customer.source_of_income || "",
			kycCompleted: customer.kycCompleted || false,
			membershipLevel: customer.membershipLevel || "none",
			membershipStatus: customer.membershipStatus || "none",
		});
		setEditModalOpen(true);
	};

	const openAdvancedEditModal = async (row: any) => {
		const customer = row.original;

		// Set basic data
		setEditData({
			id: customer._id,
			firstName: customer.firstName || "",
			lastName: customer.lastName || "",
			email: customer.email || "",
			phone: customer.phone || "",
			address: customer.address || "",
			gender: customer.gender || "",
			account_number: customer.account_number || "",
			bank_name: customer.bank_name || "",
			bvn: customer.bvn || "",
			profession: customer.profession || "",
			source_of_income: customer.source_of_income || "",
			kycCompleted: customer.kycCompleted || false,
			membershipLevel: customer.membershipLevel || "none",
			membershipStatus: customer.membershipStatus || "none",
		});

		// Fetch financial data for advanced editing
		try {
			setIsLoading(true);
			// You might want to create an API endpoint to fetch customer financial details
			// For now, we'll set the summary data
			setAdvancedEditData({
				savings: [],
				loans: [],
				investments: [],
				auctions: [],
				savingsBalance: customer.savingsBalance || 0,
				totalInvestment: customer.totalInvestment || 0,
				totalLoans: customer.totalLoans || 0,
				totalAuctions: customer.totalAuctions || 0,
				isExistingCustomer: customer.isExistingCustomer || false,
			});

			setAdvancedEditModalOpen(true);
		} catch (error) {
			console.error("Error fetching customer financial data:", error);
			toast.error("Failed to load customer financial data");
		} finally {
			setIsLoading(false);
		}
	};

	const closeEditModal = () => {
		setEditModalOpen(false);
	};

	const closeAdvancedEditModal = () => {
		setAdvancedEditModalOpen(false);
	};

	const openRestoreModal = (row: any) => {
		setSelectedRow(row.original);
		setRestoreModalOpen(true);
	};

	const openReactivateModal = (row: any) => {
		setSelectedRow(row.original);
		setReactivateModalOpen(true);
	};

	const openDeleteModal = (row: any) => {
		setSelectedRow(row.original);
		setDeleteModalOpen(true);
	};

	const closeRestoreModal = () => {
		setRestoreModalOpen(false);
	};

	const closeReactivateModal = () => {
		setReactivateModalOpen(false);
	};

	const closeDeleteModal = () => {
		setDeleteModalOpen(false);
	};

	const refreshCustomerData = async () => {
		await fetchCustomers();
	};
	// -------------- Fetch Customers --------------
	// -------------- Fetch Customers --------------
	const fetchCustomers = async () => {
		if (!accessToken) return;

		try {
			setIsLoading(true);
			const response = await fetch("/api/admin/customers", {
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
				// Prevent caching
				cache: "no-store",
			});

			const result = await response.json();
			console.log("Fetched customers:", result); // Debug log

			if (result.status === "success") {
				setTableData(result.customers);
			} else {
				throw new Error(result.error || "Failed to fetch customers");
			}
		} catch (error) {
			console.error("Error fetching customers:", error);
			toast.error("Failed to fetch customers.");
		} finally {
			setIsLoading(false);
		}
	};

	const handleEditCustomer = async () => {
		if (!accessToken) return;

		try {
			setIsLoading(true);
			await axios.put(
				`/api/admin/customers/${editData.id}`,
				{
					firstName: editData.firstName,
					lastName: editData.lastName,
					email: editData.email,
					phone: editData.phone,
					address: editData.address,
					gender: editData.gender,
					account_number: editData.account_number,
					bank_name: editData.bank_name,
					bvn: editData.bvn,
					profession: editData.profession,
					source_of_income: editData.source_of_income,
					kycCompleted: editData.kycCompleted,
					membershipLevel: editData.membershipLevel,
					membershipStatus: editData.membershipStatus,
				},
				{
					headers: { Authorization: `Bearer ${accessToken}` },
				}
			);
			toast.success("Customer updated successfully.");
			fetchCustomers();
			setEditModalOpen(false);
		} catch (error: any) {
			console.error("Error updating customer:", error);
			const errorMessage =
				error.response?.data?.error ||
				error.response?.data?.message ||
				"Failed to update customer.";
			toast.error(errorMessage);
		} finally {
			setIsLoading(false);
		}
	};

	// -------------- Edit Customer (Advanced - Super Admin Only) --------------
	const handleAdvancedEditCustomer = async () => {
		if (!accessToken) return;

		try {
			setIsLoading(true);

			// Prepare payload with all financial fields
			const payload = {
				// Basic information
				firstName: editData.firstName,
				lastName: editData.lastName,
				email: editData.email,
				phone: editData.phone,
				address: editData.address,
				gender: editData.gender,
				account_number: editData.account_number,
				bank_name: editData.bank_name,
				bvn: editData.bvn,
				profession: editData.profession,
				source_of_income: editData.source_of_income,
				kycCompleted: editData.kycCompleted,
				membershipLevel: editData.membershipLevel,
				membershipStatus: editData.membershipStatus,

				// Financial data - ensure all are included as numbers
				savingsBalance: Number(advancedEditData.savingsBalance) || 0,
				totalInvestment: Number(advancedEditData.totalInvestment) || 0,
				totalLoans: Number(advancedEditData.totalLoans) || 0, // Make sure this is included
				totalAuctions: Number(advancedEditData.totalAuctions) || 0, // Make sure this is included
				isExistingCustomer: advancedEditData.isExistingCustomer,
			};

			console.log("🔄 Sending advanced update payload:", payload);

			const response = await axios.put(
				`/api/admin/customers/${editData.id}`,
				payload,
				{
					headers: { Authorization: `Bearer ${accessToken}` },
				}
			);

			console.log("✅ API Response:", response.data);

			if (response.data.status === "success") {
				toast.success("Customer and financial data updated successfully.");
				// Force refresh with a slight delay to ensure DB is updated
				setTimeout(() => {
					fetchCustomers();
				}, 500);
				setAdvancedEditModalOpen(false);
			} else {
				throw new Error(response.data.error || "Update failed");
			}
		} catch (error: any) {
			console.error("❌ Error updating customer:", error);
			console.error("Full error details:", error.response?.data);
			const errorMessage =
				error.response?.data?.error ||
				error.response?.data?.message ||
				error.message ||
				"Failed to update customer.";
			toast.error(errorMessage);
		} finally {
			setIsLoading(false);
		}
	};
	// -------------- Delete Customer --------------
	const deleteCustomer = async (id: string) => {
		if (!accessToken) return;

		try {
			await axios.delete(`/api/admin/customers/${id}`, {
				headers: { Authorization: `Bearer ${accessToken}` },
			});
			setTableData((prev) => prev.filter((customer) => customer._id !== id));
			toast.success("Customer deleted successfully.");
		} catch (error) {
			console.error("Error deleting customer:", error);
			toast.error("Failed to delete customer.");
		}
	};

	// -------------- Suspend Customer --------------
	const suspendCustomer = async (id: string) => {
		if (!accessToken) return;

		try {
			await axios.patch(
				`/api/admin/customers/${id}`,
				{ action: "suspend" },
				{
					headers: { Authorization: `Bearer ${accessToken}` },
				}
			);
			setTableData((prev) =>
				prev.map((customer) =>
					customer._id === id
						? { ...customer, membershipStatus: "suspended" }
						: customer
				)
			);
			toast.success("Customer suspended successfully.");
		} catch (error) {
			console.error("Error suspending customer:", error);
			toast.error("Failed to suspend customer.");
		}
	};

	// -------------- Reactivate Customer --------------
	const reactivateCustomer = async (id: string) => {
		if (!accessToken) return;

		try {
			await axios.patch(
				`/api/admin/customers/${id}`,
				{ action: "reactivate" },
				{
					headers: { Authorization: `Bearer ${accessToken}` },
				}
			);
			setTableData((prev) =>
				prev.map((customer) =>
					customer._id === id
						? { ...customer, membershipStatus: "approved" }
						: customer
				)
			);
			toast.success("Customer reactivated successfully.");
		} catch (error) {
			console.error("Error reactivating customer:", error);
			toast.error("Failed to reactivate customer.");
		}
	};

	useEffect(() => {
		if (accessToken) {
			fetchCustomers();
		}
	}, [accessToken]);

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("en-NG", {
			style: "currency",
			currency: "NGN",
		}).format(amount);
	};

	const columns: ColumnDef<Customer>[] = [
		{
			id: "select",
			header: ({ table }) => (
				<Checkbox
					checked={
						table.getIsAllPageRowsSelected() ||
						(table.getIsSomePageRowsSelected() && "indeterminate")
					}
					onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
					aria-label="Select all"
					className="check"
				/>
			),
			cell: ({ row }) => (
				<Checkbox
					checked={row.getIsSelected()}
					onCheckedChange={(value) => row.toggleSelected(!!value)}
					aria-label="Select row"
					className="check"
				/>
			),
		},
		{
			accessorKey: "name",
			header: "Customer Name",
			cell: ({ row }) => {
				const customer = row.original;
				const name = `${customer.firstName} ${customer.lastName}${
					customer.otherName ? ` ${customer.otherName}` : ""
				}`;
				return (
					<span className="text-xs text-black capitalize t-data">{name}</span>
				);
			},
		},
		{
			accessorKey: "totalLoans",
			header: "Total Loans",
			cell: ({ row }) => {
				const loans = row.original.totalLoans || 0;
				return (
					<span className="text-xs text-primary-6">
						{formatCurrency(loans)}
					</span>
				);
			},
		},
		{
			accessorKey: "savingsBalance",
			header: " Savings Balance",
			cell: ({ row }) => {
				const savings = row.original.savingsBalance || 0;
				return (
					<span className="text-xs text-primary-6">
						{formatCurrency(savings)}
					</span>
				);
			},
		},
		{
			accessorKey: "totalInvestment",
			header: "Total Investments",
			cell: ({ row }) => {
				const investment = row.original.totalInvestment || 0;
				return (
					<span className="text-xs text-primary-6">
						{formatCurrency(investment)}
					</span>
				);
			},
		},
		{
			accessorKey: "phone",
			header: "Phone No.",
			cell: ({ row }) => {
				const phone = row.original.phone || "Not provided";
				return <span className="text-xs text-primary-6">{phone}</span>;
			},
		},
		{
			accessorKey: "membershipStatus",
			header: "Membership Status",
			cell: ({ row }) => {
				const status = row.getValue<string>("membershipStatus");

				const statusColors: Record<string, string> = {
					approved: "status green",
					pending: "status yellow",
					suspended: "status red",
					rejected: "status red",
				};

				return (
					<span
						className={`px-2 py-1 rounded-full text-xs font-medium ${
							statusColors[status] || "bg-gray-100 text-gray-600"
						}`}>
						{status}
					</span>
				);
			},
		},

		{
			id: "actions",
			header: "Action",
			cell: ({ row }) => {
				const customer = row.original;

				return (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								className="h-8 w-8 p-2 bg-white border-[1px] bborder-[#E8E8E8]">
								<span className="sr-only">Open menu</span>
								<MoreHorizontal className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="bg-white">
							<Link href={`/customers/${customer._id}`}>
								<DropdownMenuItem className="action cursor-pointer hover:bg-secondary-3">
									<IconEye />
									<p className="text-xs font-inter">View Customer</p>
								</DropdownMenuItem>
							</Link>
							<DropdownMenuItem
								className="action cursor-pointer hover:bg-blue-100"
								onClick={() => openEditModal(row)}>
								<IconEdit />
								<p className="text-xs font-inter">Edit Customer</p>
							</DropdownMenuItem>

							<DropdownMenuItem
								className="action cursor-pointer hover:bg-green-100"
								onClick={() => openAdvancedEditModal(row)}>
								<IconEdit />
								<p className="text-xs font-inter text-green-600">
									Advanced Edit (Financial Data)
								</p>
							</DropdownMenuItem>

							{customer.membershipStatus === "approved" ? (
								<DropdownMenuItem
									className="action cursor-pointer hover:bg-yellow-300"
									onClick={() => openRestoreModal(row)}>
									<IconUserPause />
									<p className="text-xs font-inter">Suspend</p>
								</DropdownMenuItem>
							) : (
								<DropdownMenuItem
									className="action cursor-pointer hover:bg-yellow-300"
									onClick={() => openReactivateModal(row)}>
									<IconRestore />
									<p className="text-xs font-inter">Approve</p>
								</DropdownMenuItem>
							)}

							<DropdownMenuItem
								className="action cursor-pointer hover:bg-red-500"
								onClick={() => openDeleteModal(row)}>
								<IconTrash color="#F43F5E" />
								<p className="text-[#F43F5E] delete text-xs font-inter">
									Delete Customer
								</p>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				);
			},
		},
	];

	return (
		<>
			{isLoading ? (
				<Loader />
			) : (
				<CustomerDataTable
					columns={columns}
					data={tableData}
					onStaffAdded={refreshCustomerData}
				/>
			)}
			{isEditModalOpen && (
				<Modal
					isOpen={isEditModalOpen}
					onClose={closeEditModal}
					title="Edit Customer">
					<div className="bg-white p-0 rounded-lg  transition-transform ease-in-out overflow-y-auto w-full md:w-[500px] form">
						<div className="mt-3 border-t-[1px] border-[#E2E4E9] pt-2">
							<div className="flex flex-col gap-2">
								<p className="text-xs text-primary-6">First Name</p>
								<Input
									type="text"
									className="focus:border-none mt-2"
									value={editData.firstName}
									onChange={(e) =>
										setEditData({ ...editData, firstName: e.target.value })
									}
								/>
								<p className="text-xs text-primary-6 mt-2">Last Name</p>
								<Input
									type="text"
									className="focus:border-none mt-2"
									value={editData.lastName}
									onChange={(e) =>
										setEditData({ ...editData, lastName: e.target.value })
									}
								/>
								<p className="text-xs text-primary-6 mt-2">Email Address</p>
								<Input
									type="email"
									className="focus:border-none mt-2"
									value={editData.email}
									onChange={(e) =>
										setEditData({ ...editData, email: e.target.value })
									}
								/>
								<p className="text-xs text-primary-6 mt-2">Phone Number</p>
								<Input
									type="text"
									className="focus:border-none mt-2"
									value={editData.phone}
									onChange={(e) =>
										setEditData({ ...editData, phone: e.target.value })
									}
								/>

								<p className="text-xs text-primary-6 mt-2">Home Address</p>
								<Input
									type="text"
									className="focus:border-none mt-2"
									value={editData.address}
									onChange={(e) =>
										setEditData({ ...editData, address: e.target.value })
									}
								/>
								<p className="text-xs text-primary-6 mt-2">Gender</p>
								<Select
									value={editData.gender}
									onValueChange={(value) =>
										setEditData({ ...editData, gender: value })
									}>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Select Gender" />
									</SelectTrigger>
									<SelectContent className="bg-white option">
										<SelectItem value="male">Male</SelectItem>
										<SelectItem value="female">Female</SelectItem>
									</SelectContent>
								</Select>
								<p className="text-xs text-primary-6 mt-2">Account Number</p>
								<Input
									type="text"
									placeholder="Enter Account Number"
									className="focus:border-none mt-2"
									value={editData.account_number}
									onChange={(e) =>
										setEditData({ ...editData, account_number: e.target.value })
									}
								/>

								<p className="text-xs text-primary-6 mt-2">Bank</p>
								<Input
									type="text"
									placeholder="Enter Bank Name"
									className="focus:border-none mt-2"
									value={editData.bank_name}
									onChange={(e) =>
										setEditData({ ...editData, bank_name: e.target.value })
									}
								/>
							</div>
							<hr className="mt-4 mb-4 text-[#9F9E9E40]" color="#9F9E9E40" />
							<div className="flex flex-row justify-end items-center gap-3 font-inter">
								<Button
									className="border-[#E8E8E8] border-[1px] text-primary-6 text-xs"
									onClick={closeEditModal}>
									Cancel
								</Button>
								<Button
									className="bg-primary-1 text-white font-inter text-xs"
									onClick={handleEditCustomer}
									disabled={isLoading}>
									{isLoading ? "Updating..." : "Update Customer"}
								</Button>
							</div>
						</div>
					</div>
				</Modal>
			)}

			{isAdvancedEditModalOpen && (
				<Modal
					isOpen={isAdvancedEditModalOpen}
					onClose={closeAdvancedEditModal}
					title="Advanced Customer Edit">
					<div className="bg-white p-0 rounded-lg transition-transform ease-in-out overflow-y-auto max-h-[80vh] form">
						<div className="mt-3 border-t-[1px] border-[#E2E4E9] pt-2">
							<div className="flex flex-col gap-4">
								{/* Basic Information Section */}
								<div className="grid grid-cols-2 gap-4">
									<div>
										<p className="text-xs text-primary-6">First Name</p>
										<Input
											type="text"
											className="focus:border-none mt-1"
											value={editData.firstName}
											onChange={(e) =>
												setEditData({ ...editData, firstName: e.target.value })
											}
										/>
									</div>
									<div>
										<p className="text-xs text-primary-6">Last Name</p>
										<Input
											type="text"
											className="focus:border-none mt-1"
											value={editData.lastName}
											onChange={(e) =>
												setEditData({ ...editData, lastName: e.target.value })
											}
										/>
									</div>
								</div>

								{/* Financial Summary Section */}
								<div className="border rounded-lg p-4">
									<h3 className="text-sm font-semibold mb-3">
										Financial Summary
									</h3>
									<div className="grid grid-cols-2 gap-4">
										<div>
											<p className="text-xs text-primary-6">Savings Balance</p>
											<Input
												type="number"
												className="focus:border-none mt-1"
												value={advancedEditData.savingsBalance}
												onChange={(e) =>
													setAdvancedEditData({
														...advancedEditData,
														savingsBalance: parseFloat(e.target.value) || 0,
													})
												}
											/>
										</div>
										<div>
											<p className="text-xs text-primary-6">
												Total Investments
											</p>
											<Input
												type="number"
												className="focus:border-none mt-1"
												value={advancedEditData.totalInvestment}
												onChange={(e) =>
													setAdvancedEditData({
														...advancedEditData,
														totalInvestment: parseFloat(e.target.value) || 0,
													})
												}
											/>
										</div>
										<div>
											<p className="text-xs text-primary-6">Total Loans</p>
											<Input
												type="number"
												className="focus:border-none mt-1"
												value={advancedEditData.totalLoans}
												onChange={(e) =>
													setAdvancedEditData({
														...advancedEditData,
														totalLoans: parseFloat(e.target.value) || 0,
													})
												}
											/>
										</div>
										<div>
											<p className="text-xs text-primary-6">Total Auctions</p>
											<Input
												type="number"
												className="focus:border-none mt-1"
												value={advancedEditData.totalAuctions}
												onChange={(e) =>
													setAdvancedEditData({
														...advancedEditData,
														totalAuctions: parseFloat(e.target.value) || 0,
													})
												}
											/>
										</div>
									</div>
								</div>
							</div>

							<hr className="mt-4 mb-4 text-[#9F9E9E40]" color="#9F9E9E40" />
							<div className="flex flex-row justify-end items-center gap-3 font-inter">
								<Button
									className="border-[#E8E8E8] border-[1px] text-primary-6 text-xs"
									onClick={closeAdvancedEditModal}>
									Cancel
								</Button>
								<Button
									className="bg-primary-1 text-white font-inter text-xs"
									onClick={handleAdvancedEditCustomer}
									disabled={isLoading}>
									{isLoading ? "Updating..." : "Update Financial Data"}
								</Button>
							</div>
						</div>
					</div>
				</Modal>
			)}

			{isRestoreModalOpen && (
				<Modal onClose={closeRestoreModal} isOpen={isRestoreModalOpen}>
					<p className="mt-4">
						Are you sure you want to suspend {selectedRow?.firstName}{" "}
						{selectedRow?.lastName}'s account?
					</p>
					<p className="text-sm text-primary-6">This can't be undone</p>
					<div className="flex flex-row justify-end items-center gap-3 font-inter mt-4">
						<Button
							className="border-[#E8E8E8] border-[1px] text-primary-6 text-xs"
							onClick={closeRestoreModal}>
							Cancel
						</Button>
						<Button
							className="bg-[#F04F4A] text-white font-inter text-xs modal-delete"
							onClick={async () => {
								await suspendCustomer(selectedRow._id);
								closeRestoreModal();
							}}>
							Yes, Confirm
						</Button>
					</div>
				</Modal>
			)}

			{isReactivateModalOpen && (
				<Modal onClose={closeReactivateModal} isOpen={isReactivateModalOpen}>
					<p className="mt-4">
						Are you sure you want to reactivate {selectedRow?.firstName}{" "}
						{selectedRow?.lastName}'s account?
					</p>
					<p className="text-sm text-primary-6">This can't be undone</p>
					<div className="flex flex-row justify-end items-center gap-3 font-inter mt-4">
						<Button
							className="border-[#E8E8E8] border-[1px] text-primary-6 text-xs"
							onClick={closeReactivateModal}>
							Cancel
						</Button>
						<Button
							className="bg-[#F04F4A] text-white font-inter text-xs modal-delete"
							onClick={async () => {
								await reactivateCustomer(selectedRow._id);
								closeReactivateModal();
							}}>
							Yes, Confirm
						</Button>
					</div>
				</Modal>
			)}

			{isDeleteModalOpen && (
				<Modal onClose={closeDeleteModal} isOpen={isDeleteModalOpen}>
					<p>
						Are you sure you want to delete {selectedRow?.firstName}{" "}
						{selectedRow?.lastName}'s account?
					</p>

					<p className="text-sm text-primary-6">This can't be undone</p>
					<div className="flex flex-row justify-end items-center gap-3 font-inter mt-4">
						<Button
							className="border-[#E8E8E8] border-[1px] text-primary-6 text-xs"
							onClick={closeDeleteModal}>
							Cancel
						</Button>
						<Button
							className="bg-[#F04F4A] text-white font-inter text-xs modal-delete"
							onClick={async () => {
								await deleteCustomer(selectedRow._id);
								closeDeleteModal();
							}}>
							Yes, Confirm
						</Button>
					</div>
				</Modal>
			)}
		</>
	);
};

export default CustomerTable;
