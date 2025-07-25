"use client";

import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { ColumnDef } from "@tanstack/react-table";
import axios from "axios";
import { getSession } from "next-auth/react";
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { CategoriesDataTable } from "./categories-table";

// This type is used to define the shape of our data.
export type Categories = {
	id: string;
	image: string;
	name: string;
	created_at: string;
};

interface ApiResponse {
	status: string;
	data: {
		id: string;
		name: string;
		image: string;
		created_at: string;
		updated_at: string;
	}[];
}

const CategoriesTable = () => {
	const [isModalOpen, setModalOpen] = useState(false);
	const [featuredImage, setFeaturedImage] = useState<File | null>(null);
	const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
	const [selectedRow, setSelectedRow] = useState<Categories | null>(null);
	const [previewImage, setPreviewImage] = useState<string | null>(null);
	const [tableData, setTableData] = useState<Categories[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [editedName, setEditedName] = useState("");

	const fetchCategories = useCallback(async () => {
		setIsLoading(true);
		try {
			const session = await getSession();
			const accessToken = session?.accessToken;

			if (!accessToken) {
				console.error("No access token found.");
				setIsLoading(false);
				return;
			}

			const response = await axios.get<ApiResponse>(
				`https://api.comicscrolls.com/api/v1/genre`,
				{
					headers: {
						Accept: "application/json",
						Authorization: `Bearer ${accessToken}`,
					},
				}
			);

			if (response.data.status === "success") {
				const formattedData = response.data.data.map((item) => ({
					id: item.id,
					name: item.name,
					image: item.image,
					created_at: formatDate(item.created_at),
				}));
				setTableData(formattedData);
			}
		} catch (error: unknown) {
			if (axios.isAxiosError(error)) {
				console.error(
					"Error fetching categories:",
					error.response?.data || error.message
				);
			} else {
				console.error("Unexpected error fetching categories:", error);
			}
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchCategories();
	}, [fetchCategories]);

	const openModal = (row: any) => {
		setSelectedRow(row.original);
		setEditedName(row.original.name);
		setPreviewImage(row.original.image);
		setModalOpen(true);
	};

	const closeModal = () => setModalOpen(false);

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0] || null;
		setFeaturedImage(file);

		if (file) {
			const reader = new FileReader();
			reader.onloadend = () => {
				setPreviewImage(reader.result as string);
			};
			reader.readAsDataURL(file);
		} else {
			setPreviewImage(null);
		}
	};
	const openDeleteModal = (row: any) => {
		setSelectedRow(row.original);
		setDeleteModalOpen(true);
	};

	const closeDeleteModal = () => {
		setDeleteModalOpen(false);
	};

	const formatDate = (rawDate?: string | Date) => {
		if (!rawDate) return "Unknown"; // Handle undefined case
		const options: Intl.DateTimeFormatOptions = {
			year: "numeric",
			month: "long",
			day: "numeric",
		};
		const parsedDate =
			typeof rawDate === "string" ? new Date(rawDate) : rawDate;
		return new Intl.DateTimeFormat("en-US", options).format(parsedDate);
	};

	const handleEdit = async () => {
		setIsLoading(true);
		try {
			const session = await getSession();
			const accessToken = session?.accessToken;

			if (!accessToken) {
				console.error("No access token found.");
				toast.error("Authentication failed.");
				setIsLoading(false);
				return;
			}

			const formData = new FormData();
			formData.append("name", editedName);
			if (featuredImage) {
				formData.append("image", featuredImage);
			}

			await axios.post(
				`https://api.comicscrolls.com/api/v1/genre/${selectedRow?.id}`,
				formData,
				{
					headers: {
						Accept: "application/json",
						Authorization: `Bearer ${accessToken}`,
						"Content-Type": "multipart/form-data",
					},
				}
			);

			toast.success("Category updated successfully.");
			await fetchCategories();
			closeModal();
		} catch (error: unknown) {
			if (axios.isAxiosError(error)) {
				console.error(
					"Error updating category:",
					error.response?.data || error.message
				);
				toast.error(`Failed to update category: ${error.message}`);
			} else {
				console.error("Unexpected error updating category:", error);
				toast.error("An unexpected error occurred.");
			}
		} finally {
			setIsLoading(false);
		}
	};

	const columns: ColumnDef<Categories>[] = [
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
			accessorKey: "id",
			header: "S/N",
			cell: ({ row }) => {
				const sn = row.getValue<string>("id");
				return <span className="text-xs text-dark-1">{sn}</span>;
			},
		},
		{
			accessorKey: "name",
			header: "Category name",
			cell: ({ row }) => {
				const category = row.getValue<string>("name");
				return (
					<span className="text-xs text-dark-1 capitalize">{category}</span>
				);
			},
		},
		{
			accessorKey: "created_at",
			header: "Date Added",
			cell: ({ row }) => {
				const date = row.getValue<string>("created_at");
				return <span className="text-xs text-dark-1">{date}</span>;
			},
		},
		{
			id: "actions",
			header: "Action",
			cell: ({ row }) => {
				return (
					<div className="flex flex-row justify-start items-center gap-5">
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

	const handleDelete = async () => {
		setIsLoading(true);
		try {
			const session = await getSession();
			const accessToken = session?.accessToken;

			if (!accessToken) {
				console.error("No access token found.");
				toast.error("Authentication failed.");
				setIsLoading(false);
				return;
			}

			await axios.delete(
				`https://api.comicscrolls.com/api/v1/genre/${selectedRow?.id}`,
				{
					headers: {
						Accept: "application/json",
						Authorization: `Bearer ${accessToken}`,
					},
				}
			);

			toast.success("Category deleted successfully.");
			await fetchCategories();
			closeDeleteModal();
		} catch (error: unknown) {
			if (axios.isAxiosError(error)) {
				console.error(
					"Error deleting category:",
					error.response?.data || error.message
				);
				toast.error(`Failed to delete category: ${error.message}`);
			} else {
				console.error("Unexpected error deleting category:", error);
				toast.error("An unexpected error occurred.");
			}
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<>
			<CategoriesDataTable columns={columns} data={tableData} />

			{isModalOpen && (
				<Modal
					isOpen={isModalOpen}
					className="category"
					onClose={closeModal}
					title="Edit Category">
					<div className="bg-white py-1 rounded-lg transition-transform ease-in-out max-h[70vh]">
						<div className="mt-3 border-t-[1px] border-[#E2E4E9] pt-2">
							<div className="mb-4">
								<p className="text-xs text-dark-1 font-inter">Name of Genre</p>
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
									Update Category
								</Button>
							</div>
						</div>
					</div>
				</Modal>
			)}

			{isDeleteModalOpen && (
				<Modal onClose={closeDeleteModal} isOpen={isDeleteModalOpen}>
					<p>Are you sure you want to delete {selectedRow?.name} category?</p>

					<p className="text-sm text-dark-1">This can't be undone</p>
					<div className="flex flex-row justify-end items-center gap-3 font-inter mt-4">
						<Button
							className="border-[#E8E8E8] border-[1px] text-dark-1 text-xs"
							onClick={closeDeleteModal}>
							Cancel
						</Button>
						<Button
							className="bg-[#F04F4A] text-white font-inter text-xs modal-delete"
							onClick={() => {
								handleDelete();
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

export default CategoriesTable;
