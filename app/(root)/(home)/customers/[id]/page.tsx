"use client";
import HeaderBox from "@/components/HeaderBox";
import Loader from "@/components/Loader";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Readers } from "@/config/columns";
import CustomerSalesTable from "@/config/customer-sales-columns";
import { IconEdit, IconTrash } from "@tabler/icons-react";
import axios from "axios";
import { getSession } from "next-auth/react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";

interface ApiResponse {
	data: Readers;
}

export type Staff = {
	id: string;
	name?: string;
	date: string;
	role: string;
	staff: string;
	status?: string;
	email: string;
	profile_pic?: string;
};

function CustomerDetails() {
	const { id } = useParams();
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [userData, setUserData] = useState<Readers | null>(null);
	const [isRestoreModalOpen, setRestoreModalOpen] = useState(false);
	const [isEditModalOpen, setEditModalOpen] = useState(false);
	const [editData, setEditData] = useState({
		id: "",
		firstName: "",
		lastName: "",
		email: "",
		staffId: "",
		role: "super_admin",
	});

	const closeRestoreModal = () => {
		setRestoreModalOpen(false);
	};

	const openEditModal = () => {
		setEditData({
			id: userData?.id ?? "",
			firstName: userData?.firstName?.split(" ")[0] || "",
			lastName: userData?.lastName?.split(" ")[1] || "",
			email: userData?.email ?? "",
			staffId: userData?.staff ?? "",
			role: userData?.role ?? "",
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

			console.log("User Data:", response.data);

			if (response.status === 200) {
				toast.success("Staff updated successfully.");
				closeEditModal();
			}
		} catch (error) {
			console.error("Error updating staff:", error);
			toast.error("Failed to update staff. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	const openRestoreModal = () => {
		setRestoreModalOpen(true);
	};

	const fetchReaders = useCallback(async () => {
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
				`https://api.comicscrolls.com/api/v1/user/${id}`,
				{
					headers: {
						Accept: "application/json",
						redirect: "follow",
						Authorization: `Bearer ${accessToken}`,
					},
				}
			);

			console.log("User Data:", response.data);

			setUserData(response?.data?.data);
		} catch (error: unknown) {
			if (axios.isAxiosError(error)) {
				console.log(
					"Error fetching post:",
					error.response?.data || error.message
				);
			} else {
				console.log("Unexpected error:", error);
			}
		} finally {
			setIsLoading(false);
		}
	}, [id]);

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

				toast.success("Staff suspended successfully.");
			}
		} catch (error) {
			console.error("Error suspending staff:", error);
			toast.error("Failed to suspend staff. Please try again.");
		}
	};

	useEffect(() => {
		fetchReaders();
	}, [fetchReaders]);

	if (isLoading) {
		return <Loader />;
	}

	return (
		<div>
			<HeaderBox title="Customer Details" />
			{isEditModalOpen && (
				<Modal
					isOpen={isEditModalOpen}
					onClose={closeEditModal}
					title="Edit Customer">
					<div className="bg-white p-0 rounded-lg transition-transform ease-in-out form">
						<div className="mt-3 border-t-[1px] border-[#E2E4E9] pt-2">
							<div className="flex flex-col gap-2">
								<p className="text-xs text-primary-6">Full Name</p>
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
								<p className="text-xs text-primary-6 mt-2">Phone number</p>
								<Input
									type="text"
									placeholder="Enter Phone Number"
									className="focus:border-none mt-2"
									value={editData.lastName}
									onChange={(e) =>
										setEditData({ ...editData, lastName: e.target.value })
									}
								/>
								<p className="text-xs text-primary-6 mt-2">Account number</p>
								<Input
									type="text"
									placeholder="Enter Account Number"
									className="focus:border-none mt-2"
									value={editData.lastName}
									onChange={(e) =>
										setEditData({ ...editData, lastName: e.target.value })
									}
								/>
								<p className="text-xs text-primary-6 mt-2">Bank</p>
								<Input
									type="text"
									placeholder="Enter Bank"
									className="focus:border-none mt-2"
									value={editData.lastName}
									onChange={(e) =>
										setEditData({ ...editData, lastName: e.target.value })
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
									{isLoading ? "Updating..." : "Update Staff"}
								</Button>
							</div>
						</div>
					</div>
				</Modal>
			)}

			{isRestoreModalOpen && (
				<Modal onClose={closeRestoreModal} isOpen={isRestoreModalOpen}>
					<p className="mt-4">
						Are you sure you want to suspend this user&apos;s {userData?.name}
						account?
					</p>
					<p className="text-sm text-primary-6">This can&apos;t be undone</p>
					<div className="flex flex-row justify-end items-center gap-3 font-inter mt-4">
						<Button
							className="border-[#E8E8E8] border-[1px] text-primary-6 text-xs"
							onClick={closeRestoreModal}>
							Cancel
						</Button>
						<Button
							className="bg-[#F04F4A] text-white font-inter text-xs modal-delete"
							onClick={async () => {
								if (userData?.id) {
									await suspendStaff(userData.id);
								} else {
									toast.error("Staff ID not found.");
								}
								closeRestoreModal();
							}}>
							Yes, Confirm
						</Button>
					</div>
				</Modal>
			)}
			<div className="w-full mx-auto p-6 bg-white rounded-lg shadow-sm">
				{/* Header Section */}
				<div className="mb-8">
					<p className="text-gray-500 text-sm mb-4">Created 10th May, 2023</p>

					<div className="flex justify-between items-start">
						<div className="flex flex-row justify-start items-center gap-2">
							<Image
								src={
									userData?.profile_pic
										? userData.profile_pic
										: "/images/use.png"
								}
								alt="avatar"
								width={80}
								height={80}
								className="w-15 h-15 rounded-full"
							/>
							<div>
								<h1 className="text-2xl font-semibold">Johnbosco Femi Jude</h1>
								<div className="flex items-center gap-4 mt-2">
									<span className="text-gray-600">johnbosco@gmail.com</span>
									<span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
										Active
									</span>
								</div>
							</div>
						</div>

						<div className="flex gap-3">
							<button
								className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 flex flex-row justify-between items-center gap-3"
								onClick={() => openEditModal()}>
								<IconEdit /> Edit
							</button>
							<button
								className="px-4 py-2 border border-red-300 text-red-600 rounded-md text-sm hover:bg-red-50 flex flex-row justify-between items-center gap-3"
								onClick={() => openRestoreModal()}>
								<IconTrash /> Deactivate
							</button>
						</div>
					</div>
				</div>

				{/* Details Sections */}
				<div className="space-y-8">
					{/* Personal Details */}
					<div>
						<h2 className="text-lg font-medium mb-4 pb-2 border-b border-gray-200">
							Personal details
						</h2>
						<div className="grid grid-cols-2 md:grid-cols-4 gap-6">
							<div>
								<h3 className="text-sm font-medium text-gray-500 mb-1">
									Email
								</h3>
								<p className="text-gray-800">Johnbosco@gmail.com</p>
							</div>
							<div>
								<h3 className="text-sm font-medium text-gray-500 mb-1">
									Phone number
								</h3>
								<p className="text-gray-800">+234 70 302 4563</p>
							</div>
							<div>
								<h3 className="text-sm font-medium text-gray-500 mb-1">
									Home address
								</h3>
								<p className="text-gray-800">123 close, Ikeja, Lagos</p>
							</div>
							<div>
								<h3 className="text-sm font-medium text-gray-500 mb-1">
									Wallet balance
								</h3>
								<p className="text-gray-800">$400</p>
							</div>
						</div>
					</div>

					{/* Account Details */}
					<div>
						<h2 className="text-lg font-medium mb-4 pb-2 border-b border-gray-200">
							Sales History
						</h2>

						<CustomerSalesTable />
					</div>
				</div>
			</div>
		</div>
	);
}

export default CustomerDetails;
