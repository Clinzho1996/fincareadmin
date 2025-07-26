"use client";

import HeaderBox from "@/components/HeaderBox";
import Loader from "@/components/Loader";
import Modal from "@/components/Modal";
import TabCard from "@/components/TabCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { IconEdit, IconTrash } from "@tabler/icons-react";
import axios from "axios";
import { getSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface Readers {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
	staffId: string;
	role: string;
}
interface ApiResponse {
	data: Readers;
}

function RoleDetails() {
	const { id } = useParams();
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [userData, setUserData] = useState<Readers | null>(null);
	const [permissions, setPermissions] = useState({
		manageDashboard: true,
		approvePayroll: true,
		addStaff: true,
	});

	const handlePermissionChange = (permission: keyof typeof permissions) => {
		setPermissions((prev) => ({
			...prev,
			[permission]: !prev[permission],
		}));
	};

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

	const closeEditModal = () => {
		setEditModalOpen(false);
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

	useEffect(() => {
		fetchReaders();
	}, [fetchReaders]);

	if (isLoading) {
		return <Loader />;
	}

	return (
		<div>
			<HeaderBox title="Role Details" />

			{isEditModalOpen && (
				<Modal
					isOpen={isEditModalOpen}
					onClose={closeEditModal}
					title="Edit Role">
					<div className="bg-white p-0 rounded-lg transition-transform ease-in-out form">
						<div className="border-t-[1px] border-[#E2E4E9] pt-2">
							<div className="flex flex-col gap-2">
								<p className="text-xs text-primary-6">Role Name</p>
								<Input
									type="text"
									placeholder="Enter Role Name"
									className="focus:border-none mt-2"
									value={editData.lastName}
									onChange={(e) =>
										setEditData({ ...editData, lastName: e.target.value })
									}
								/>
								<p className="text-xs text-primary-6 mt-2">Permissions</p>
								<Input
									type="text"
									placeholder="Assign Permissions"
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
									{isLoading ? "Updating..." : "Save Role"}
								</Button>
							</div>
						</div>
					</div>
				</Modal>
			)}

			{isRestoreModalOpen && (
				<Modal onClose={closeRestoreModal} isOpen={isRestoreModalOpen}>
					<p className="mt-4">
						Are you sure you want to delete this permission?
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
								closeRestoreModal();
							}}>
							Yes, Confirm
						</Button>
					</div>
				</Modal>
			)}

			<div className="bg-[#F6F8FA] flex flex-col px-6 py-4 gap-2 w-full max-w-[100vw]">
				<div className="flex flex-row justify-between items-center">
					<h2>Super Admin</h2>

					<div className="flex gap-3">
						<button
							className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 flex flex-row justify-between items-center gap-3"
							onClick={() => setEditModalOpen(true)}>
							<IconEdit /> Edit
						</button>
						<button
							className="px-4 py-2 border border-red-300 text-red-600 rounded-md text-sm hover:bg-red-50 flex flex-row justify-between items-center gap-3"
							onClick={() => setRestoreModalOpen(true)}>
							<IconTrash /> Delete
						</button>
					</div>
				</div>

				<TabCard
					title="Total number of users"
					value={13}
					icon="/images/all.png"
				/>

				<div className="mt-6 bg-white p-6 rounded-lg shadow-sm">
					<h3 className="text-xl font-semibold mb-6">
						Permissions for {userData?.firstName}
					</h3>

					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div>
								<Label
									htmlFor="manage-dashboard"
									className="text-base font-medium">
									Can manage dashboard
								</Label>
								<p className="text-sm text-gray-500">
									Allows access to dashboard analytics
								</p>
							</div>
							<Switch
								id="manage-dashboard"
								className="data-[state=checked]:bg-primary-1 text-primary-1 data-[state=unchecked]:bg-primary-2"
								checked={permissions.manageDashboard}
								onCheckedChange={() =>
									handlePermissionChange("manageDashboard")
								}
							/>
						</div>

						<div className="flex items-center justify-between">
							<div>
								<Label
									htmlFor="approve-payroll"
									className="text-base font-medium">
									Can approve loans
								</Label>
								<p className="text-sm text-gray-500">
									Allows approval of loan submissions
								</p>
							</div>
							<Switch
								id="approve-payroll"
								checked={permissions.approvePayroll}
								className="data-[state=checked]:bg-primary-1 text-primary-1 data-[state=unchecked]:bg-primary-2"
								onCheckedChange={() => handlePermissionChange("approvePayroll")}
							/>
						</div>

						<div className="flex items-center justify-between">
							<div>
								<Label htmlFor="add-staff" className="text-base font-medium">
									Can add staff
								</Label>
								<p className="text-sm text-gray-500">
									Allows creating new staff accounts
								</p>
							</div>
							<Switch
								id="add-staff"
								checked={permissions.addStaff}
								className="data-[state=checked]:bg-primary-1 text-primary-1 data-[state=unchecked]:bg-primary-2"
								color="red"
								onCheckedChange={() => handlePermissionChange("addStaff")}
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default RoleDetails;
