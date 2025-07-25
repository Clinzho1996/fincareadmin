"use client";

import Modal from "@/components/Modal";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Cloth } from "@/constants/cloth";
import { IconCloudDownload, IconEdit, IconTrash } from "@tabler/icons-react";

import axios from "axios";
import { MoreVertical } from "lucide-react";
import { getSession } from "next-auth/react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface Props {
	clothes: Cloth[];
}

const ITEMS_PER_PAGE = 15;

export type Categories = {
	id: string;
	image: string;
	name: string;
	created_at: string;
};

export default function ClothGrid({ clothes }: Props) {
	const [currentPage, setCurrentPage] = useState(1);
	const [isModalOpen, setModalOpen] = useState(false);
	const [featuredImage, setFeaturedImage] = useState<File | null>(null);
	const [previewImage, setPreviewImage] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [name, setName] = useState("");
	const [isEditModalOpen, setEditModalOpen] = useState(false);
	const [editingCloth, setEditingCloth] = useState<Cloth | null>(null);
	const [editName, setEditName] = useState("");
	const [editPreviewImage, setEditPreviewImage] = useState<string | null>(null);
	const [editFeaturedImage, setEditFeaturedImage] = useState<File | null>(null);
	const [isEditLoading, setIsEditLoading] = useState(false);
	const filteredClothes = clothes.filter((cloth) =>
		cloth.name.toLowerCase().includes(searchTerm.toLowerCase())
	);

	const totalPages = Math.ceil(filteredClothes.length / ITEMS_PER_PAGE);
	const paginated = filteredClothes.slice(
		(currentPage - 1) * ITEMS_PER_PAGE,
		currentPage * ITEMS_PER_PAGE
	);

	useEffect(() => {
		setCurrentPage(1);
	}, [searchTerm]);

	// Open edit modal and preload data
	const openEditModal = (cloth: Cloth) => {
		setEditingCloth(cloth);
		setEditName(cloth.name);
		setEditPreviewImage(cloth.imageUrl);
		setEditFeaturedImage(null); // Reset file input
		setEditModalOpen(true);
	};

	const closeEditModal = () => {
		setEditModalOpen(false);
		setEditingCloth(null);
		setEditName("");
		setEditPreviewImage(null);
		setEditFeaturedImage(null);
	};

	const openModal = () => setModalOpen(true);
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

	const handleEditFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0] || null;
		setEditFeaturedImage(file);

		if (file) {
			const reader = new FileReader();
			reader.onloadend = () => {
				setEditPreviewImage(reader.result as string);
			};
			reader.readAsDataURL(file);
		}
	};

	const handleUpdateCloth = async () => {
		setIsEditLoading(true);
		try {
			const session = await getSession();
			const accessToken = session?.accessToken;

			if (!accessToken || !editingCloth) {
				console.error("No access token or cloth selected.");
				toast.error("Authentication failed or no cloth selected.");
				setIsEditLoading(false);
				return;
			}

			const formData = new FormData();
			formData.append("name", editName);
			if (editFeaturedImage) {
				formData.append("image", editFeaturedImage);
			}

			const response = await axios.put(
				`https://api.comicscrolls.com/api/v1/cloth/${editingCloth.id}`,
				formData,
				{
					headers: {
						Accept: "application/json",
						Authorization: `Bearer ${accessToken}`,
						"Content-Type": "multipart/form-data",
					},
				}
			);

			if (response.data.status === "success") {
				toast.success("Cloth updated successfully.");
				closeEditModal();
				// You might want to refresh the data here
			} else {
				toast.error("Failed to update cloth.");
			}
		} catch (error: unknown) {
			if (axios.isAxiosError(error)) {
				console.error(
					"Error updating cloth:",
					error.response?.data || error.message
				);
				toast.error(`${error?.response?.data.message}`);
			} else {
				console.error("Unexpected error updating cloth:", error);
				toast.error("An unexpected error occurred.");
			}
		} finally {
			setIsEditLoading(false);
		}
	};

	const handleCreateGenre = async () => {
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
			formData.append("name", name);
			if (featuredImage) {
				formData.append("image", featuredImage);
			}

			const response = await axios.post(
				`https://api.comicscrolls.com/api/v1/genre`,
				formData,
				{
					headers: {
						Accept: "application/json",
						Authorization: `Bearer ${accessToken}`,
						"Content-Type": "multipart/form-data",
					},
				}
			);

			if (response.data.status === "success") {
				toast.success("Genre created successfully.");

				closeModal();
			} else {
				toast.error("Failed to create genre.");
			}
		} catch (error: unknown) {
			if (axios.isAxiosError(error)) {
				console.error(
					"Error creating genre:",
					error.response?.data || error.message
				);
				toast.error(`${error?.response?.data.message}`);
			} else {
				console.error("Unexpected error creating genre:", error);
				toast.error("An unexpected error occurred.");
			}
		} finally {
			setIsLoading(false);
		}
	};

	const handlePrev = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
	const handleNext = () =>
		setCurrentPage((prev) => Math.min(prev + 1, totalPages));

	return (
		<div className="p-6">
			<Modal
				isOpen={isModalOpen}
				className="category"
				onClose={closeModal}
				title="Create New Cloth">
				<div className="bg-white py-1 rounded-lg transition-transform ease-in-out max-h[70vh]">
					<div className="border-t-[1px] border-[#E2E4E9] pt-2">
						<div>
							<p className="text-xs text-dark-1 font-inter mt-3">
								Upload Cloth Image
							</p>
							<div className="flex flex-col justify-center items-center gap-3 p-3 border-dashed border rounded-lg mt-3 mb-4 !w-full">
								<div
									className="flex flex-row justify-center items-center gap-1 cursor-pointer py-4 w-fit"
									onClick={() => document.getElementById("fileInput")?.click()}>
									<IconCloudDownload size={14} color="#DCA418" />
									<p className="text-xs font-inter text-[#4B5563]">
										Choose a file
									</p>
								</div>
								<input
									type="file"
									accept="image/*"
									className="hidden"
									id="fileInput"
									onChange={handleFileChange}
								/>
								{previewImage && (
									<div className="mt-2 flex flex-row justify-start items-center gap-3">
										<Image
											src={previewImage}
											width={100}
											height={100}
											alt="Preview"
											className="w-[200px] h-[200px] object-cover rounded-md"
										/>
										<Button
											onClick={() => {
												setFeaturedImage(null);
												setPreviewImage(null);
											}}
											className="border text-xs p-2">
											Remove
										</Button>{" "}
									</div>
								)}
							</div>
						</div>
						<div className="mb-4">
							<p className="text-xs text-dark-1 font-inter">Name of Cloth</p>
							<Input
								value={name}
								placeholder="Enter cloth name"
								onChange={(e) => setName(e.target.value)}
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
								onClick={handleCreateGenre}
								disabled={isLoading}>
								{isLoading ? "Creating..." : "Create Cloth"}
							</Button>
						</div>
					</div>
				</div>
			</Modal>
			<Modal
				isOpen={isEditModalOpen}
				className="category"
				onClose={closeEditModal}
				title="Edit Cloth">
				<div className="bg-white py-1 rounded-lg transition-transform ease-in-out max-h[70vh]">
					<div className="border-t-[1px] border-[#E2E4E9] pt-2">
						<div>
							<p className="text-xs text-dark-1 font-inter mt-3">
								Update Cloth Image
							</p>
							<div className="flex flex-col justify-center items-center gap-3 p-3 border-dashed border rounded-lg mt-3 mb-4 !w-full">
								<div
									className="flex flex-row justify-center items-center gap-1 cursor-pointer py-4 w-fit"
									onClick={() =>
										document.getElementById("editFileInput")?.click()
									}>
									<IconCloudDownload size={14} color="#DCA418" />
									<p className="text-xs font-inter text-[#4B5563]">
										Choose a new file (optional)
									</p>
								</div>
								<input
									type="file"
									accept="image/*"
									className="hidden"
									id="editFileInput"
									onChange={handleEditFileChange}
								/>
								{editPreviewImage && (
									<div className="mt-2 flex flex-row justify-start items-center gap-3">
										<Image
											src={editPreviewImage}
											width={100}
											height={100}
											alt="Preview"
											className="w-[200px] h-[200px] object-cover rounded-md"
										/>
										<Button
											onClick={() => {
												setEditFeaturedImage(null);
												// Reset to original image if no new file selected
												if (editingCloth) {
													setEditPreviewImage(editingCloth.imageUrl);
												} else {
													setEditPreviewImage(null);
												}
											}}
											className="border text-xs p-2">
											Reset
										</Button>
									</div>
								)}
							</div>
						</div>
						<div className="mb-4">
							<p className="text-xs text-dark-1 font-inter">Name of Cloth</p>
							<Input
								value={editName}
								placeholder="Enter cloth name"
								onChange={(e) => setEditName(e.target.value)}
								type="text"
								className="focus:border-none mt-2 h-10 w-full"
							/>
						</div>
						<div className="flex flex-row justify-end items-center gap-3 font-inter mt-4">
							<Button
								className="border-[#E8E8E8] bg-[#6B728033] border-[1px] text-dark-1 text-xs px-4 py-1"
								onClick={closeEditModal}>
								Cancel
							</Button>
							<Button
								className="bg-primary-1 text-white font-inter text-xs px-4 py-1"
								onClick={handleUpdateCloth}
								disabled={isEditLoading}>
								{isEditLoading ? "Updating..." : "Update Cloth"}
							</Button>
						</div>
					</div>
				</div>
			</Modal>

			<div className="flex justify-between items-center mb-6">
				<input
					type="text"
					placeholder="Search Cloth"
					className="border rounded px-4 py-2 w-64"
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
				/>
				<Button className="bg-primary-1 text-white" onClick={openModal}>
					Add Cloth
				</Button>
			</div>

			{filteredClothes.length === 0 ? (
				<div className="text-center py-10">
					<p className="text-gray-500">
						No clothes found matching your search.
					</p>
				</div>
			) : (
				<>
					<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
						{paginated.map((item) => (
							<div
								key={item.id}
								className="bg-gray-100 p-4 rounded flex flex-col items-center">
								<div className="flex flex-row justify-between items-start w-full mb-2">
									<img
										src={item.imageUrl}
										alt={item.name}
										className="w-20 h-20 object-contain mb-2"
									/>

									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button
												variant="ghost"
												className="h-8 w-8 p-2 bg-white border-[1px] bborder-[#E8E8E8]">
												<span className="sr-only">Open menu</span>
												<MoreVertical className="h-4 w-4" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end" className="bg-white">
											<DropdownMenuItem
												className="action cursor-pointer hover:bg-blue-100"
												onClick={() => openEditModal(item)}>
												<IconEdit />
												<p className="text-xs font-inter">Edit</p>
											</DropdownMenuItem>

											<DropdownMenuItem
												className="action cursor-pointer hover:bg-red-500"
												onClick={() => {}}>
												<IconTrash color="#F43F5E" />
												<p className="text-[#F43F5E] delete text-xs font-inter">
													Delete
												</p>
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</div>
								<p className="text-sm font-medium">{item.name}</p>
							</div>
						))}
					</div>

					{totalPages > 1 && (
						<div className="flex justify-end items-center mt-6">
							<div className="flex space-x-2">
								<button
									onClick={handlePrev}
									disabled={currentPage === 1}
									className="px-3 py-1 border rounded disabled:opacity-50">
									&lt;
								</button>
								{Array.from({ length: totalPages }, (_, i) => (
									<button
										key={i}
										onClick={() => setCurrentPage(i + 1)}
										className={`px-3 py-1 border rounded ${
											currentPage === i + 1 ? "bg-gray-300" : ""
										}`}>
										{i + 1}
									</button>
								))}
								<button
									onClick={handleNext}
									disabled={currentPage === totalPages}
									className="px-3 py-1 border rounded disabled:opacity-50">
									&gt;
								</button>
							</div>
						</div>
					)}
				</>
			)}
		</div>
	);
}
