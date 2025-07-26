"use client";

import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useState } from "react";
import { toast } from "react-toastify";
import { RolesDataTable } from "./roles-table";

// This type is used to define the shape of our data.
export type Role = {
	id: string;
	name: string;
	assignees: number;
	created_at: string;
};

const RolesTable = () => {
	const [isModalOpen, setModalOpen] = useState(false);
	const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
	const [selectedRow, setSelectedRow] = useState<Role | null>(null);
	const [editedName, setEditedName] = useState("");

	// Static roles data
	const rolesData: Role[] = [
		{
			id: "1",
			name: "Super Admin",
			assignees: 1,
			created_at: "2023-01-15",
		},
		{
			id: "2",
			name: "Admin",
			assignees: 3,
			created_at: "2023-02-20",
		},
		{
			id: "3",
			name: "Content Manager",
			assignees: 5,
			created_at: "2023-03-10",
		},
		{
			id: "4",
			name: "Customer Support",
			assignees: 8,
			created_at: "2023-04-05",
		},
		{
			id: "5",
			name: "Moderator",
			assignees: 4,
			created_at: "2023-05-12",
		},
	];

	const [tableData, setTableData] = useState<Role[]>(rolesData);

	const openModal = (row: any) => {
		setSelectedRow(row.original);
		setEditedName(row.original.name);
		setModalOpen(true);
	};

	const closeModal = () => setModalOpen(false);

	const openDeleteModal = (row: any) => {
		setSelectedRow(row.original);
		setDeleteModalOpen(true);
	};

	const closeDeleteModal = () => {
		setDeleteModalOpen(false);
	};

	const formatDate = (dateString: string) => {
		const options: Intl.DateTimeFormatOptions = {
			year: "numeric",
			month: "short",
			day: "numeric",
		};
		return new Date(dateString).toLocaleDateString("en-US", options);
	};

	const handleEdit = () => {
		if (!selectedRow) return;

		setTableData((prevData) =>
			prevData.map((role) =>
				role.id === selectedRow.id ? { ...role, name: editedName } : role
			)
		);
		toast.success("Role updated successfully.");
		closeModal();
	};

	const columns: ColumnDef<Role>[] = [
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
			header: "Role (s)",
			cell: ({ row }) => {
				const role = row.getValue<string>("name");
				return <span className="text-xs text-dark-1 capitalize">{role}</span>;
			},
		},
		{
			accessorKey: "assignees",
			header: "Assignees",
			cell: ({ row }) => {
				const assignees = row.getValue<number>("assignees");
				return <span className="text-xs text-dark-1">{assignees} users</span>;
			},
		},
		{
			accessorKey: "created_at",
			header: "Created At",
			cell: ({ row }) => {
				const date = formatDate(row.getValue<string>("created_at"));
				return <span className="text-xs text-dark-1">{date}</span>;
			},
		},
		{
			id: "actions",
			header: "Action",
			cell: ({ row }) => {
				return (
					<div className="flex flex-row justify-start items-center gap-5">
						<Link href={`/staff-management/roles/${row.original.id}`}>
							<Button className="border-[#E8E8E8] border-[1px] text-xs font-medium text-[#6B7280] font-inter">
								View
							</Button>
						</Link>
						<Button
							className="border-[#E8E8E8] border-[1px] text-xs font-medium text-[#6B7280] font-inter"
							onClick={() => openModal(row)}>
							<IconPencil />
						</Button>
						<Button
							className="border-[#E8E8E8] border-[1px] text-xs font-medium text-[#6B7280] font-inter"
							onClick={() => openDeleteModal(row)}>
							<IconTrash />
						</Button>
					</div>
				);
			},
		},
	];

	const handleDelete = () => {
		if (!selectedRow) return;

		setTableData((prevData) =>
			prevData.filter((role) => role.id !== selectedRow.id)
		);
		toast.success("Role deleted successfully.");
		closeDeleteModal();
	};

	return (
		<>
			<RolesDataTable columns={columns} data={tableData} />

			{isModalOpen && (
				<Modal
					isOpen={isModalOpen}
					className="category"
					onClose={closeModal}
					title="Edit Role">
					<div className="bg-white py-1 rounded-lg transition-transform ease-in-out max-h[70vh]">
						<div className="mt-3 border-t-[1px] border-[#E2E4E9] pt-2">
							<div className="mb-4">
								<p className="text-xs text-dark-1 font-inter">Role Name</p>
								<Input
									value={editedName}
									onChange={(e) => setEditedName(e.target.value)}
									type="text"
									className="focus:border-none mt-2 h-10 w-full"
								/>
							</div>
							<div className="flex flex-row justify-end items-center gap-3 font-inter mt-4">
								<Button
									className="border-[#E8E8E8] bg-[#6B728033] border-[1px] text-dark-1 text-xs px-4 py-1"
									onClick={closeModal}>
									Cancel
								</Button>
								<Button
									className="bg-primary-1 text-white font-inter text-xs px-4 py-1"
									onClick={handleEdit}>
									Update Role
								</Button>
							</div>
						</div>
					</div>
				</Modal>
			)}

			{isDeleteModalOpen && (
				<Modal onClose={closeDeleteModal} isOpen={isDeleteModalOpen}>
					<p>Are you sure you want to delete the {selectedRow?.name} role?</p>
					<p className="text-sm text-dark-1">This can't be undone</p>
					<div className="flex flex-row justify-end items-center gap-3 font-inter mt-4">
						<Button
							className="border-[#E8E8E8] border-[1px] text-dark-1 text-xs"
							onClick={closeDeleteModal}>
							Cancel
						</Button>
						<Button
							className="bg-[#F04F4A] text-white font-inter text-xs modal-delete"
							onClick={handleDelete}>
							Yes, Confirm
						</Button>
					</div>
				</Modal>
			)}
		</>
	);
};

export default RolesTable;
