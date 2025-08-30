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
import { Input } from "@/components/ui/input";
import {
	IconEdit,
	IconEye,
	IconRestore,
	IconTrash,
	IconUserPause,
} from "@tabler/icons-react";
import axios from "axios";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { StaffDataTable } from "./staff-table";

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

const StaffTable = () => {
	const [isRestoreModalOpen, setRestoreModalOpen] = useState(false);
	const [isReactivateModalOpen, setReactivateModalOpen] = useState(false);
	const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
	const [selectedRow, setSelectedRow] = useState<any>(null);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [tableData, setTableData] = useState<Staff[]>([]);
	const [isEditModalOpen, setEditModalOpen] = useState(false);
	const [editData, setEditData] = useState({
		id: "",
		firstName: "",
		lastName: "",
		email: "",
		staffId: "",
		role: "super_admin",
	});

	const openEditModal = (row: any) => {
		const staff = row.original;
		setEditData({
			id: staff.id,
			firstName: staff.name?.split(" ")[0] || "",
			lastName: staff.name?.split(" ")[1] || "",
			email: staff.email,
			staffId: staff.staff,
			role: staff.role,
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

	const fetchStaffs = async () => {
		try {
			setIsLoading(true);
			const response = await fetch("/api/admin/users");
			const result = await response.json();

			if (result.status === "success") {
				const formattedData = result.data.map((admin: any) => ({
					id: admin._id,
					name: admin.name,
					email: admin.email,
					role: admin.role,
					staff: admin.staff_code || "N/A",
					status: admin.isActive ? "active" : "inactive",
					date: admin.createdAt,
				}));
				setTableData(formattedData);
			}
		} catch (error) {
			console.error("Error fetching admins:", error);
			toast.error("Failed to fetch staff.");
		} finally {
			setIsLoading(false);
		}
	};

	const handleEditStaff = async () => {
		try {
			setIsLoading(true);
			await axios.put(`/api/admin/users/${editData.id}`, {
				name: `${editData.firstName} ${editData.lastName}`,
				email: editData.email,
				role: editData.role,
				staff_code: editData.staffId,
			});
			toast.success("Staff updated successfully.");
			fetchStaffs();
			closeEditModal();
		} catch (error) {
			console.error("Error updating staff:", error);
			toast.error("Failed to update staff.");
		} finally {
			setIsLoading(false);
		}
	};

	const deleteStaff = async (id: string) => {
		try {
			await axios.delete(`/api/admin/users/${id}`);
			setTableData((prev) => prev.filter((staff) => staff.id !== id));
			toast.success("Staff deleted successfully.");
		} catch (error) {
			console.error("Error deleting staff:", error);
			toast.error("Failed to delete staff.");
		}
	};

	const suspendStaff = async (id: string) => {
		try {
			await axios.patch(`/api/admin/users/${id}`, { action: "suspend" });
			setTableData((prev) =>
				prev.map((staff) =>
					staff.id === id ? { ...staff, status: "inactive" } : staff
				)
			);
			toast.success("Staff suspended successfully.");
		} catch (error) {
			console.error("Error suspending staff:", error);
			toast.error("Failed to suspend staff.");
		}
	};

	const reactivateStaff = async (id: string) => {
		try {
			await axios.patch(`/api/admin/users/${id}`, { action: "reactivate" });
			setTableData((prev) =>
				prev.map((staff) =>
					staff.id === id ? { ...staff, status: "active" } : staff
				)
			);
			toast.success("Staff reactivated successfully.");
		} catch (error) {
			console.error("Error reactivating staff:", error);
			toast.error("Failed to reactivate staff.");
		}
	};

	useEffect(() => {
		fetchStaffs();
	}, []);

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
			id: "user", // custom id since we are showing multiple fields
			header: "User",
			cell: ({ row }) => {
				const { name, email } = row.original; // grab full user object
				return (
					<div className="flex flex-row justify-start items-center gap-2">
						<Image
							src="/images/avatar.png"
							alt={name || "User"}
							width={40}
							height={40}
							className="w-10 h-10 rounded-full"
						/>
						<div className="flex flex-col">
							<span className="text-xs text-primary-6">{name || "N/A"}</span>
							<span className="text-xs text-primary-6">{email || "N/A"}</span>
						</div>
					</div>
				);
			},
		},

		{
			accessorKey: "id",
			header: "Staff Code",
			cell: ({ row }) => {
				const staff = row.getValue<string>("id") || "FIN0001";

				return <span className="text-xs text-primary-6">{staff}</span>;
			},
		},
		{
			accessorKey: "role",
			header: "Role (s)",
			cell: ({ row }) => {
				const staff = row.getValue<string>("role");

				return <span className="text-xs text-primary-6">{staff}</span>;
			},
		},
		{
			accessorKey: "date",
			header: "Registration Date",
			cell: ({ row }) => {
				const rawDate = row.original.date;
				const date = new Date(rawDate); // ✅ Convert it to a Date object

				return (
					<span className="text-xs text-primary-6">{formatDate(date)}</span>
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
							<Link href={`/staff-management/${actions.id}`}>
								<DropdownMenuItem className="action cursor-pointer hover:bg-secondary-3">
									<IconEye />
									<p className="text-xs font-inter">View</p>
								</DropdownMenuItem>
							</Link>
							<DropdownMenuItem
								className="action cursor-pointer hover:bg-blue-100"
								onClick={() => openEditModal(row)}>
								<IconEdit />
								<p className="text-xs font-inter">Edit</p>
							</DropdownMenuItem>
							{actions.status === "active" ? (
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
									<p className="text-xs font-inter">Reactivate</p>
								</DropdownMenuItem>
							)}
							<DropdownMenuItem
								className="action cursor-pointer hover:bg-red-500"
								onClick={() => openDeleteModal(row)}>
								<IconTrash color="#F43F5E" />
								<p className="text-[#F43F5E] delete text-xs font-inter">
									Delete
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
				<StaffDataTable columns={columns} data={tableData} />
			)}
			{isEditModalOpen && (
				<Modal
					isOpen={isEditModalOpen}
					onClose={closeEditModal}
					title="Edit Staff">
					<div className="bg-white p-0 rounded-lg  transition-transform ease-in-out form">
						<div className="mt-3  pt-2">
							<div className="flex flex-col gap-2">
								<p className="text-xs text-primary-6">First Name</p>
								<Input
									type="text"
									placeholder="Enter Full Name"
									className="focus:border-none mt-2"
									value={editData.firstName}
									onChange={(e) =>
										setEditData({ ...editData, firstName: e.target.value })
									}
								/>

								<p className="text-xs text-primary-6">Last Name</p>
								<Input
									type="text"
									placeholder="Enter Full Name"
									className="focus:border-none mt-2"
									value={editData.lastName}
									onChange={(e) =>
										setEditData({ ...editData, lastName: e.target.value })
									}
								/>
								<p className="text-xs text-primary-6 mt-2">Email Address</p>
								<Input
									type="text"
									placeholder="Enter Email Address"
									className="focus:border-none mt-2"
									value={editData.email}
									onChange={(e) =>
										setEditData({ ...editData, email: e.target.value })
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
									disabled={isLoading}>
									{isLoading ? "Updating Staff..." : "Update Staff"}
								</Button>
							</div>
						</div>
					</div>
				</Modal>
			)}

			{isRestoreModalOpen && (
				<Modal onClose={closeRestoreModal} isOpen={isRestoreModalOpen}>
					<p className="mt-4">
						Are you sure you want to suspend {selectedRow?.name}'s account?
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
								await suspendStaff(selectedRow.id);
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
					<p>Are you sure you want to delete {selectedRow?.name}'s account?</p>

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

export default StaffTable;
