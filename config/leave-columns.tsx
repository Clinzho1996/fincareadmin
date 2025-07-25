"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";

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
import { IconCheck, IconX } from "@tabler/icons-react";
import axios from "axios";
import { getSession } from "next-auth/react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { LeaveDataTable } from "./leave-table";

// This type is used to define the shape of our data.
export type Staff = {
	id: string;
	name?: string;
	date: string;
	role: string;
	staff: string;
	status?: string;
	email: string;
};

interface ApiResponse {
	id: string;
	first_name: string;
	last_name: string;
	email: string;
	picture: string | null;
	staff_code: string;
	role: string;
	is_active: boolean;
	last_logged_in: string | null;
	created_at: string;
	updated_at: string;
	status?: string;
}

declare module "next-auth" {
	interface Session {
		accessToken?: string;
	}
}

const LeaveTable = () => {
	const [isRestoreModalOpen, setRestoreModalOpen] = useState(false);
	const [isReactivateModalOpen, setReactivateModalOpen] = useState(false);
	const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
	const [selectedRow, setSelectedRow] = useState<any>(null);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [tableData, setTableData] = useState<Staff[]>([]);

	const openRestoreModal = (row: any) => {
		setSelectedRow(row.original);
		setRestoreModalOpen(true);
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

	const fetchStaffs = async () => {
		try {
			setIsLoading(true);
			const session = await getSession();

			console.log("session", session);

			const accessToken = session?.accessToken;
			if (!accessToken) {
				console.error("No access token found.");
				setIsLoading(false);
				return;
			}

			const response = await axios.get(
				"https://api.comicscrolls.com/api/v1/user/role?type=reader",
				{
					headers: {
						Accept: "application/json",
						Authorization: `Bearer ${session?.accessToken}`,
					},
				}
			);

			if (response.data.status === "success") {
				// Map the API response to match the `Readers` type
				const formattedData = response.data.data.map((reader: any) => ({
					id: reader.id,
					name: reader.full_name,
					date: reader.created_at,
					bookRead: reader.books_read,
					subStatus: reader.is_premium ? "subscribed" : "free",
					status: reader.is_blocked ? "inactive" : "active",
					email: reader.email,
				}));

				setTableData(formattedData);

				console.log("Readers Data:", formattedData);
			}
		} catch (error) {
			console.error("Error fetching user data:", error);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchStaffs();
	}, []);

	const deleteStaff = async (id: string) => {
		try {
			const session = await getSession();
			const accessToken = session?.accessToken;

			if (!accessToken) {
				console.error("No access token found.");
				return;
			}

			const response = await axios.delete(
				`https://api.wowdev.com.ng/api/v1/user/${id}`,
				{
					headers: {
						Accept: "application/json",
						Authorization: `Bearer ${accessToken}`,
					},
				}
			);

			if (response.status === 200) {
				// Remove the deleted staff from the table
				setTableData((prevData) => prevData.filter((staff) => staff.id !== id));

				toast.success("Staff deleted successfully.");
			}
		} catch (error) {
			console.error("Error deleting staff:", error);
		}
	};

	const suspendStaff = async (id: string) => {
		try {
			const session = await getSession();
			const accessToken = session?.accessToken;

			if (!accessToken) {
				console.error("No access token found.");
				return;
			}

			const response = await axios.put(
				`https://api.wowdev.com.ng/api/v1/user/suspend/${id}`,
				{},
				{
					headers: {
						Accept: "application/json",
						Authorization: `Bearer ${accessToken}`,
					},
				}
			);

			if (response.status === 200) {
				// Update the staff status in the table
				setTableData((prevData) =>
					prevData.map((staff) =>
						staff.id === id ? { ...staff, status: "inactive" } : staff
					)
				);

				toast.success("Staff suspended successfully.");
			}
		} catch (error) {
			console.error("Error suspending staff:", error);
			toast.error("Failed to suspend staff. Please try again.");
		}
	};

	const reactivateStaff = async (id: string) => {
		try {
			const session = await getSession();
			const accessToken = session?.accessToken;

			if (!accessToken) {
				console.error("No access token found.");
				return;
			}

			const response = await axios.put(
				`https://api.wowdev.com.ng/api/v1/user/reactivate/${id}`,
				{},
				{
					headers: {
						Accept: "application/json",
						Authorization: `Bearer ${accessToken}`,
					},
				}
			);

			if (response.status === 200) {
				// Update the staff status in the table
				setTableData((prevData) =>
					prevData.map((staff) =>
						staff.id === id ? { ...staff, status: "active" } : staff
					)
				);

				toast.success("Staff reactivated successfully.");
			}
		} catch (error) {
			console.error("Error suspending staff:", error);
			toast.error("Failed to reactivate staff. Please try again.");
		}
	};

	const columns: ColumnDef<Staff>[] = [
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
			header: "Staff",
			cell: ({ row }) => {
				if (!row) return null; // or return a placeholder
				const name = row.getValue<string>("name") || "N/A";
				const email = row.getValue<string>("email") || "N/A";
				return (
					<div className="flex flex-row justify-start items-center gap-2">
						<Image
							src="/images/avatar.png"
							alt={name}
							width={40}
							height={40}
							className="w-10 h-10 rounded-full"
						/>
						<div className="flex flex-col">
							<span className="text-xs text-primary-6">{name}</span>
							<span className="text-xs text-primary-6">{email}</span>
						</div>
					</div>
				);
			},
		},
		{
			accessorKey: "staff",
			header: "Leave Type",
			cell: () => {
				// const staff = row.getValue<string>("staff");

				return <span className="text-xs text-primary-6">Sick Leave</span>;
			},
		},
		{
			accessorKey: "staff",
			header: "Days Requested",
			cell: ({ row }) => {
				const staff = row.getValue<string>("staff") || "12 of 15 days";

				return (
					<div className="flex flex-col">
						<span className="text-xs text-dark-1 font-bold">{staff}</span>
						<span className="text-xs text-primary-6">
							Starting Mon 12 Feb, 2024
						</span>
					</div>
				);
			},
		},
		{
			accessorKey: "status",
			header: ({ column }) => {
				return (
					<Button
						variant="ghost"
						className="text-[13px] text-start items-start"
						onClick={() =>
							column.toggleSorting(column.getIsSorted() === "asc")
						}>
						Status
						<ArrowUpDown className="ml-2 h-4 w-4" />
					</Button>
				);
			},
			cell: ({ row }) => {
				const status = row.getValue<string>("status");
				return (
					<div className={`status ${status === "active" ? "green" : "red"}`}>
						{status}
					</div>
				);
			},
		},
		{
			id: "actions",
			header: "Action",
			cell: ({ row }) => {
				const actions = row.original;

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
							<DropdownMenuItem
								className="action cursor-pointer hover:bg-blue-100"
								onClick={() => openRestoreModal(row)}>
								<IconCheck />
								<p className="text-xs font-inter">Approve Request</p>
							</DropdownMenuItem>

							<DropdownMenuItem
								className="action cursor-pointer hover:bg-red-500"
								onClick={() => openDeleteModal(row)}>
								<IconX color="#F43F5E" />
								<p className="text-[#F43F5E] delete text-xs font-inter">
									Reject Request
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
				<LeaveDataTable columns={columns} data={tableData} />
			)}

			{isRestoreModalOpen && (
				<Modal onClose={closeRestoreModal} isOpen={isRestoreModalOpen}>
					<p className="mt-4">
						Are you sure you want to approve {selectedRow?.name}'s leave
						request?
					</p>
					<p className="text-sm text-primary-6">This can't be undone</p>
					<div className="flex flex-row justify-end items-center gap-3 font-inter mt-4">
						<Button
							className="border-[#E8E8E8] border-[1px] text-primary-6 text-xs"
							onClick={closeRestoreModal}>
							Cancel
						</Button>
						<Button
							className="bg-primary-1 text-white font-inter text-xs modal-delete"
							onClick={async () => {
								await suspendStaff(selectedRow.id);
								closeRestoreModal();
							}}>
							Yes, Approve
						</Button>
					</div>
				</Modal>
			)}

			{isReactivateModalOpen && (
				<Modal onClose={closeReactivateModal} isOpen={isReactivateModalOpen}>
					<p className="mt-4">
						Are you sure you want to reactivate {selectedRow?.name}'s account?
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
								await reactivateStaff(selectedRow.id);
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
						Are you sure you want to reject {selectedRow?.name}'s leave request?
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
								await deleteStaff(selectedRow.id);
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

export default LeaveTable;
