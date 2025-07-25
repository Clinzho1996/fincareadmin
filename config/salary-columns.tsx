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
import { IconEdit, IconTrash } from "@tabler/icons-react";
import axios from "axios";
import { getSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { SalaryDataTable } from "./salary-table";

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

const SalaryTable = () => {
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

	const handleEditStaff = async () => {
		try {
			setIsLoading(true);
			const session = await getSession();
			const accessToken = session?.accessToken;

			if (!accessToken) {
				console.error("No access token found.");
				return;
			}

			const response = await axios.post(
				`https://api.wowdev.com.ng/api/v1/user/${editData.id}`,
				{
					first_name: editData.firstName,
					last_name: editData.lastName,
					email: editData.email,
					staff_code: editData.staffId,
					role: editData.role,
				},
				{
					headers: {
						Accept: "application/json",
						Authorization: `Bearer ${accessToken}`,
					},
				}
			);

			if (response.status === 200) {
				toast.success("Staff updated successfully.");
				fetchStaffs(); // Refresh the table data
				closeEditModal();
			}
		} catch (error) {
			console.error("Error updating staff:", error);
			toast.error("Failed to update staff. Please try again.");
		} finally {
			setIsLoading(false);
		}
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
			accessorKey: "name",
			header: "Salary Head",
			cell: ({ row }) => {
				if (!row) return null; // or return a placeholder
				const name = row.getValue<string>("name") || "N/A";
				return (
					<span className="text-xs text-black capitalize t-data">{name}</span>
				);
			},
		},
		{
			accessorKey: "name",
			header: "Type",
			cell: ({ row }) => {
				if (!row) return null; // or return a placeholder
				const name = row.getValue<string>("email") || "Deductible";
				return (
					<span className="text-xs text-black capitalize t-data">{name}</span>
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
								onClick={() => openEditModal(row)}>
								<IconEdit />
								<p className="text-xs font-inter">Edit</p>
							</DropdownMenuItem>

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
				<SalaryDataTable columns={columns} data={tableData} />
			)}
			{isEditModalOpen && (
				<Modal
					isOpen={isEditModalOpen}
					onClose={closeEditModal}
					title="Edit Grade Level">
					<div className="bg-white p-0 rounded-lg  transition-transform ease-in-out form">
						<div className="mt-3 border-t-[1px] border-[#E2E4E9] pt-2">
							<div className="flex flex-col gap-2">
								<p className="text-xs text-primary-6">New grade level</p>
								<Input
									type="text"
									className="focus:border-none mt-2"
									value={editData.firstName}
									onChange={(e) =>
										setEditData({ ...editData, firstName: e.target.value })
									}
								/>
								<p className="text-xs text-primary-6 mt-2">Salary Head</p>
								<Input
									type="text"
									className="focus:border-none mt-2"
									value={editData.lastName}
									onChange={(e) =>
										setEditData({ ...editData, lastName: e.target.value })
									}
								/>
								<p className="text-xs text-primary-6 mt-2">Amount</p>
								<Input
									type="text"
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
									onClick={handleEditStaff}
									disabled={isLoading}>
									{isLoading ? "Updating..." : "Update Grade Level"}
								</Button>
							</div>
						</div>
					</div>
				</Modal>
			)}

			{isDeleteModalOpen && (
				<Modal onClose={closeDeleteModal} isOpen={isDeleteModalOpen}>
					<p>
						Are you sure you want to delete {selectedRow?.name}'s as a salary
						head?
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

export default SalaryTable;
