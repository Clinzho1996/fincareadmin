"use client";

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
import { Textarea } from "@/components/ui/textarea";
import { IconEdit, IconEye, IconTrash } from "@tabler/icons-react";
import { ColumnDef } from "@tanstack/react-table";
import axios from "axios";
import { MoreHorizontal } from "lucide-react";
import { getSession } from "next-auth/react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { FineDataTable } from "./fine-table";

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
	staff_code: string;
	role: string;
	is_active: boolean;
	created_at: string;
}

const FineTable = () => {
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [tableData, setTableData] = useState<Staff[]>([]);
	const [isEditModalOpen, setEditModalOpen] = useState(false);
	const [isViewModalOpen, setViewModalOpen] = useState(false);
	const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
	const [selectedFine, setSelectedFine] = useState<any>(null);

	// Edit fine form state
	const [editData, setEditData] = useState({
		staff: "Johnbosco Femi Jude",
		fine: "Absconding from premises",
		amount: "2000",
		reason: "Give a short description of why the staff is being fined",
	});

	const openEditModal = (row: any) => {
		setSelectedFine(row.original);
		setEditModalOpen(true);
	};

	const openViewModal = (row: any) => {
		setSelectedFine(row.original);
		setViewModalOpen(true);
	};

	const openDeleteModal = (row: any) => {
		setSelectedFine(row.original);
		setDeleteModalOpen(true);
	};

	const closeEditModal = () => {
		setEditModalOpen(false);
	};

	const closeViewModal = () => {
		setViewModalOpen(false);
	};

	const closeDeleteModal = () => {
		setDeleteModalOpen(false);
	};

	const handleEditFine = async () => {
		try {
			setIsLoading(true);
			const session = await getSession();
			const accessToken = session?.accessToken;

			if (!accessToken) {
				console.error("No access token found.");
				return;
			}

			// API call to update fine would go here
			// await axios.put(`/api/fines/${selectedFine.id}`, editData, {
			//   headers: { Authorization: `Bearer ${accessToken}` }
			// });

			toast.success("Fine updated successfully.");
			closeEditModal();
		} catch (error) {
			console.error("Error updating fine:", error);
			toast.error("Failed to update fine. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	const fetchStaffs = async () => {
		try {
			setIsLoading(true);
			const session = await getSession();
			const accessToken = session?.accessToken;

			if (!accessToken) {
				console.error("No access token found.");
				setIsLoading(false);
				return;
			}

			// This would be replaced with your actual fines API endpoint
			const response = await axios.get(
				"https://api.comicscrolls.com/api/v1/user/role?type=reader",
				{
					headers: {
						Accept: "application/json",
						Authorization: `Bearer ${accessToken}`,
					},
				}
			);

			if (response.data.status === "success") {
				setTableData(response.data.data);
			}
		} catch (error) {
			console.error("Error fetching fines:", error);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchStaffs();
	}, []);

	const deleteFine = async (id: string) => {
		try {
			const session = await getSession();
			const accessToken = session?.accessToken;

			if (!accessToken) {
				console.error("No access token found.");
				return;
			}

			// API call to delete fine would go here
			// await axios.delete(`/api/fines/${id}`, {
			//   headers: { Authorization: `Bearer ${accessToken}` }
			// });

			setTableData((prevData) => prevData.filter((fine) => fine.id !== id));
			toast.success("Fine deleted successfully.");
		} catch (error) {
			console.error("Error deleting fine:", error);
			toast.error("Failed to delete fine. Please try again.");
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
				/>
			),
			cell: ({ row }) => (
				<Checkbox
					checked={row.getIsSelected()}
					onCheckedChange={(value) => row.toggleSelected(!!value)}
					aria-label="Select row"
				/>
			),
		},
		{
			accessorKey: "name",
			header: "Staff",
			cell: ({ row }) => {
				if (!row) return null; // or return a placeholder
				const name = row.getValue<string>("name") || "Johnson James";
				const email = row.getValue<string>("email") || "james@cs.com";
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
							<span className="text-xs text-primary-1">{name}</span>
							<span className="text-xs text-[#8D8E8E]">{email}</span>
						</div>
					</div>
				);
			},
		},
		{
			accessorKey: "fineType",
			header: "Fine Issued",
			cell: ({ row }) => (
				<span className="capitalize">
					{row.getValue("fineType") || "Absconding from premises"}
				</span>
			),
		},
		{
			accessorKey: "amount",
			header: "Amount (NGN)",
			cell: ({ row }) => <span>{row.getValue("amount") || "2000"}</span>,
		},
		{
			id: "actions",
			header: "Action",
			cell: ({ row }) => {
				return (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" className="h-8 w-8 p-0">
								<MoreHorizontal className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="bg-white">
							<DropdownMenuItem
								onClick={() => openViewModal(row)}
								className="action cursor-pointer hover:bg-blue-100">
								<IconEye className="mr-2 h-4 w-4" />
								View Fine
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() => openEditModal(row)}
								className="action cursor-pointer hover:bg-blue-100">
								<IconEdit className="mr-2 h-4 w-4" />
								Edit Fine
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() => openDeleteModal(row)}
								className="action cursor-pointer hover:bg-blue-100 text-red">
								<IconTrash className="mr-2 h-4 w-4" />
								Delete Fine
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
				<FineDataTable columns={columns} data={tableData} />
			)}

			{/* Edit Fine Modal */}
			{isEditModalOpen && (
				<Modal
					isOpen={isEditModalOpen}
					onClose={closeEditModal}
					title="Edit fine">
					<div className="space-y-4 form">
						<div>
							<label className="block text-sm font-medium mb-1">Staff</label>
							<div className="flex items-center justify-between p-2 border rounded">
								<span>{editData.staff}</span>
								<span className="text-green-500">✔</span>
							</div>
						</div>

						<div>
							<label className="block text-sm font-medium mb-1">Fine</label>
							<div className="flex items-center justify-between p-2 border rounded">
								<span>{editData.fine}</span>
								<span className="text-green-500">✔</span>
							</div>
						</div>

						<div>
							<label className="block text-sm font-medium mb-1">Amount</label>
							<Input
								value={editData.amount}
								onChange={(e) =>
									setEditData({ ...editData, amount: e.target.value })
								}
							/>
						</div>

						<div>
							<label className="block text-sm font-medium mb-1">Reason</label>
							<Textarea
								value={editData.reason}
								onChange={(e) =>
									setEditData({ ...editData, reason: e.target.value })
								}
								placeholder="Give a short description of why the staff is being fined"
							/>
						</div>

						<div className="flex justify-end gap-3 mt-6">
							<Button variant="outline" onClick={closeEditModal}>
								Cancel
							</Button>
							<Button
								onClick={handleEditFine}
								disabled={isLoading}
								className="bg-primary-1 text-white">
								{isLoading ? "Saving..." : "Save"}
							</Button>
						</div>
					</div>
				</Modal>
			)}

			{/* View Fine Modal */}
			{isViewModalOpen && (
				<Modal isOpen={isViewModalOpen} onClose={closeViewModal}>
					<div className="space-y-6">
						<div>
							<h2 className="text-lg font-semibold">
								Absconding from premises
							</h2>
							<span className="inline-block px-2 py-1 text-xs bg-gray-200 rounded mt-1">
								Fixed
							</span>
							<p className="text-sm text-primary-1 mt-2">
								To be deducted on next payday; Jun 12, 2024
							</p>
						</div>

						<hr className="border-gray-200" />

						<div className="flex flex-row justify-between items-center mt-2">
							<h3 className="font-medium mb-2 text-sm text-gray-500">
								Date Issued
							</h3>
							<p className="text-sm font-bold">12 Jun 2012</p>
						</div>

						<div>
							<h3 className="font-medium mb-2 text-sm text-gray-500">
								Staff issued
							</h3>
							<div className="flex flex-row justify-start items-center gap-2">
								<Image
									src="/images/use.png"
									alt="avatar"
									width={50}
									height={50}
									className="w-15 h-15 rounded-full"
								/>
								<div>
									<h1 className="text-lg font-semibold">Johnbosco Femi Jude</h1>
									<div className="flex items-center gap-4 mt-2">
										<span className="text-gray-600 text-sm">CW28373</span>
									</div>
								</div>
							</div>
						</div>

						<div>
							<h3 className="font-medium mb-2 mt-3 text-sm text-gray-500">
								Reason
							</h3>
							<p className="text-sm mb-3">He was not at his duty post.</p>
						</div>

						<hr className="border-gray-200" />

						<div className="flex justify-end gap-3 mt-4">
							<Button variant="outline" className="bg-primary-1 text-white">
								Undo fine
							</Button>
							<Button
								className="bg-primary-2"
								onClick={() => {
									closeViewModal();
									openEditModal({ original: selectedFine });
								}}>
								Edit
							</Button>
						</div>
					</div>
				</Modal>
			)}

			{/* Delete Fine Modal */}
			{isDeleteModalOpen && (
				<Modal isOpen={isDeleteModalOpen} onClose={closeDeleteModal}>
					<p className="mt-4">Are you sure you want to delete this fine?</p>
					<p className="text-sm text-gray-500">This can't be undone</p>
					<div className="flex justify-end gap-3 mt-6">
						<Button
							variant="outline"
							className="border-[#E8E8E8] border-[1px] text-primary-6 text-xs"
							onClick={closeDeleteModal}>
							Cancel
						</Button>
						<Button
							className="bg-[#F04F4A] text-white font-inter text-xs modal-delete"
							variant="destructive"
							onClick={() => {
								deleteFine(selectedFine.id);
								closeDeleteModal();
							}}>
							Delete
						</Button>
					</div>
				</Modal>
			)}
		</>
	);
};

export default FineTable;
