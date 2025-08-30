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
import { IconEdit, IconEye, IconTrash } from "@tabler/icons-react";
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
	accountNumber?: string;
	bank?: string;
};

declare module "next-auth" {
	interface Session {
		accessToken?: string;
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
	const [editData, setEditData] = useState({
		id: "",
		firstName: "",
		lastName: "",
		email: "",
		phone: "",
		address: "",
		gender: "",
		accountNumber: "",
		bank: "",
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
			accountNumber: customer.accountNumber || "",
			bank: customer.bank || "",
		});
		setEditModalOpen(true);
	};

	const closeEditModal = () => {
		setEditModalOpen(false);
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

	// -------------- Fetch Customers --------------
	const fetchCustomers = async () => {
		if (!accessToken) return;

		try {
			setIsLoading(true);
			const response = await fetch("/api/admin/customers", {
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			});

			const result = await response.json();

			if (result.status === "success") {
				setTableData(result.customers);
			}
		} catch (error) {
			console.error("Error fetching customers:", error);
			toast.error("Failed to fetch customers.");
		} finally {
			setIsLoading(false);
		}
	};

	// -------------- Edit Customer --------------
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
					accountNumber: editData.accountNumber,
					bank: editData.bank,
				},
				{
					headers: { Authorization: `Bearer ${accessToken}` },
				}
			);
			toast.success("Customer updated successfully.");
			fetchCustomers();
			setEditModalOpen(false);
		} catch (error) {
			console.error("Error updating customer:", error);
			toast.error("Failed to update customer.");
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

	const formatDate = (rawDate: string | Date) => {
		const options: Intl.DateTimeFormatOptions = {
			year: "numeric",
			month: "long",
			day: "numeric",
		};
		const parsedDate =
			typeof rawDate === "string" ? new Date(rawDate) : rawDate;
		return new Intl.DateTimeFormat("en-US", options).format(parsedDate);
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
			accessorKey: "address",
			header: "Home Address",
			cell: ({ row }) => {
				const address = row.original.address || "Not provided";
				return <span className="text-xs text-primary-6">{address}</span>;
			},
		},
		{
			accessorKey: "totalSavings",
			header: "Total Savings",
			cell: ({ row }) => {
				const savings = row.original.totalSavings || 0;
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
				<CustomerDataTable columns={columns} data={tableData} />
			)}
			{isEditModalOpen && (
				<Modal
					isOpen={isEditModalOpen}
					onClose={closeEditModal}
					title="Edit Customer">
					<div className="bg-white p-0 rounded-lg  transition-transform ease-in-out form">
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
									<SelectContent className="bg-white z-10 select text-gray-300">
										<SelectItem value="male">Male</SelectItem>
										<SelectItem value="female">Female</SelectItem>
									</SelectContent>
								</Select>
								<p className="text-xs text-primary-6 mt-2">Account Number</p>
								<Input
									type="text"
									placeholder="Enter Account Number"
									className="focus:border-none mt-2"
									value={editData.accountNumber}
									onChange={(e) =>
										setEditData({ ...editData, accountNumber: e.target.value })
									}
								/>
								<p className="text-xs text-primary-6 mt-2">Bank</p>
								<Select
									value={editData.bank}
									onValueChange={(value) =>
										setEditData({ ...editData, bank: value })
									}>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Select Bank" />
									</SelectTrigger>
									<SelectContent className="bg-white z-10 select text-gray-300">
										<SelectItem value="FCMB">FCMB</SelectItem>
										<SelectItem value="UBA">UBA</SelectItem>
										<SelectItem value="Fidelity">Fidelity</SelectItem>
									</SelectContent>
								</Select>
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
