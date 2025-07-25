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
	IconCalendar,
	IconCaretLeftRight,
	IconEye,
	IconLogout,
} from "@tabler/icons-react";
import axios from "axios";
import { getSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { AttendanceDataTable } from "./attendance-table";

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

const AttendanceTable = () => {
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [tableData, setTableData] = useState<Staff[]>([]);
	const [isScheduleModalOpen, setScheduleModalOpen] = useState(false);
	const [isTimestampModalOpen, setTimestampModalOpen] = useState(false);
	const [isModalOpen, setModalOpen] = useState(false);
	const openModal = () => setModalOpen(true);
	const closeModal = () => setModalOpen(false);

	const openScheduleModal = () => setScheduleModalOpen(true);
	const closeScheduleModal = () => setScheduleModalOpen(false);

	const openTimestampModal = () => setTimestampModalOpen(true);
	const closeTimestampModal = () => setTimestampModalOpen(false);

	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [email, setEmail] = useState("");
	const [staffId, setStaffId] = useState("");
	const [role, setRole] = useState("super_admin");

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
			accessorKey: "status",
			header: "Status",
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
			accessorKey: "name",
			header: "Schedule",
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
			header: "Time in",
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
			header: "Time out",
			cell: ({ row }) => {
				if (!row) return null; // or return a placeholder
				const name = row.getValue<string>("name") || "N/A";
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
							<Link href={`/staff-management/${actions.id}`}>
								<DropdownMenuItem className="action cursor-pointer hover:bg-blue-100">
									<IconEye />
									<p className="text-xs font-inter">View Staff</p>
								</DropdownMenuItem>
							</Link>
							<DropdownMenuItem
								className="action cursor-pointer hover:bg-blue-100"
								onClick={openScheduleModal}>
								<IconCalendar />
								<p className="text-xs font-inter">Schedule attendance</p>
							</DropdownMenuItem>

							<DropdownMenuItem
								className="action cursor-pointer hover:bg-blue-100"
								onClick={openModal}>
								<IconLogout />
								<p className="text-xs font-inter">Capture attendance</p>
							</DropdownMenuItem>

							<DropdownMenuItem
								className="action cursor-pointer hover:bg-blue-100"
								onClick={openTimestampModal}>
								<IconCaretLeftRight />
								<p className="text-xs font-inter">Override timestamps</p>
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
				<AttendanceDataTable columns={columns} data={tableData} />
			)}
			<Modal
				isOpen={isModalOpen}
				onClose={closeModal}
				title="Capture Attendance">
				<div className="bg-white p-0 rounded-lg w-[600px] transition-transform ease-in-out form">
					<div className="mt-3  pt-2">
						<div className="flex flex-col gap-2">
							<p className="text-xs text-primary-6">
								Enter staff&apos;s time in and time out to capture attendance.
							</p>
							<p className="text-xs text-primary-6 font-bold">Staff Number</p>
							<Input
								type="text"
								placeholder="Enter Staff Number"
								className="focus:border-none mt-2"
								value={firstName}
								onChange={(e) => setFirstName(e.target.value)}
							/>
							<div className="flex flex-row gap-2 justify-between w-full">
								<div className="w-full">
									<p className="text-xs text-primary-6 mt-2">Time In</p>
									<Input
										type="time"
										placeholder="Select Time In"
										className="focus:border-none mt-2 w-full"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
									/>
								</div>
								<div className="w-full">
									<p className="text-xs text-primary-6 mt-2">Time Out</p>
									<Input
										type="time"
										placeholder="Enter Time Out"
										className="focus:border-none mt-2 w-full"
										value={lastName}
										onChange={(e) => setLastName(e.target.value)}
									/>
								</div>
							</div>
						</div>
						<hr className="mt-4 mb-4 text-[#9F9E9E40]" color="#9F9E9E40" />
						<div className="flex flex-row justify-end items-center gap-3 font-inter">
							<Button
								className="border-[#E8E8E8] border-[1px] text-primary-6 text-xs"
								onClick={closeModal}>
								Cancel
							</Button>
							<Button
								className="bg-primary-1 text-white font-inter text-xs"
								disabled={isLoading}>
								{isLoading ? "Setting..." : "Set Attendance"}
							</Button>
						</div>
					</div>
				</div>
			</Modal>
			<Modal
				isOpen={isScheduleModalOpen}
				onClose={closeScheduleModal}
				title="Schedule Attendance">
				<div className="bg-white p-0 rounded-lg w-[600px] transition-transform ease-in-out form">
					<div className="mt-3  pt-2">
						<div className="flex flex-col gap-2">
							<p className="text-xs text-primary-6">
								Enter staff&apos;s time in and time out to capture attendance.
							</p>
							<p className="text-xs text-primary-6 font-semibold">
								Select Staff
							</p>
							<Input
								type="text"
								placeholder="Enter Staff Number"
								className="focus:border-none mt-2"
								value={firstName}
								onChange={(e) => setFirstName(e.target.value)}
							/>

							<div className="flex flex-row gap-2 justify-between w-full items-center">
								<p className="text-xs text-primary-6 mt-2 font-semibold">
									Days Active
								</p>
								<p className="text-primary-1 text-sm">Schedule all</p>
							</div>
							<div className="flex flex-row gap-2 justify-between w-full">
								<div className="w-full">
									<p className="text-xs text-primary-6 px-3 py-2 border-[1px] rounded-lg">
										Mon
									</p>
								</div>
								<div className="w-full">
									<p className="text-xs text-primary-6 px-3 py-2 border-[1px] rounded-lg">
										Tue
									</p>
								</div>
								<div className="w-full">
									<p className="text-xs text-primary-6 px-3 py-2 border-[1px] rounded-lg">
										Wed
									</p>
								</div>
								<div className="w-full">
									<p className="text-xs text-primary-6 px-3 py-2 border-[1px] rounded-lg">
										Thu
									</p>
								</div>
								<div className="w-full">
									<p className="text-xs text-primary-6 px-3 py-2 border-[1px] rounded-lg">
										Fri
									</p>
								</div>
							</div>
							<div className="flex flex-row gap-2 justify-between w-full">
								<div className="w-full">
									<p className="text-xs text-primary-6 mt-2">Time In</p>
									<Input
										type="time"
										placeholder="Select Time In"
										className="focus:border-none mt-2 w-full"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
									/>
								</div>
								<div className="w-full">
									<p className="text-xs text-primary-6 mt-2">Time Out</p>
									<Input
										type="time"
										placeholder="Enter Time Out"
										className="focus:border-none mt-2 w-full"
										value={lastName}
										onChange={(e) => setLastName(e.target.value)}
									/>
								</div>
							</div>
						</div>
						<hr className="mt-4 mb-4 text-[#9F9E9E40]" color="#9F9E9E40" />
						<div className="flex flex-row justify-end items-center gap-3 font-inter">
							<Button
								className="border-[#E8E8E8] border-[1px] text-primary-6 text-xs"
								onClick={closeScheduleModal}>
								Cancel
							</Button>
							<Button
								className="bg-primary-1 text-white font-inter text-xs"
								disabled={isLoading}>
								{isLoading ? "Scheduling..." : "Schedule Attendance"}
							</Button>
						</div>
					</div>
				</div>
			</Modal>

			<Modal
				isOpen={isTimestampModalOpen}
				onClose={closeTimestampModal}
				title="Override Timestamps">
				<div className="bg-white p-0 rounded-lg w-[600px] transition-transform ease-in-out form">
					<div className="mt-3  pt-2">
						<div className="flex flex-col gap-2">
							<p className="text-xs text-primary-6">
								Select the timestamps you want to override
							</p>
							<p className="text-xs text-primary-6 font-semibold">
								Select Staff
							</p>
							<Input
								type="text"
								placeholder="Enter Staff Number"
								className="focus:border-none mt-2"
								value={firstName}
								onChange={(e) => setFirstName(e.target.value)}
							/>

							<p className="text-xs text-primary-6 font-semibold mt-2">
								Select Timestamps
							</p>
							<Input
								type="text"
								placeholder="Enter Timestamp"
								className="focus:border-none mt-2"
								value={firstName}
								onChange={(e) => setFirstName(e.target.value)}
							/>
						</div>
						<hr className="mt-4 mb-4 text-[#9F9E9E40]" color="#9F9E9E40" />
						<div className="flex flex-row justify-end items-center gap-3 font-inter">
							<Button
								className="border-[#E8E8E8] border-[1px] text-primary-6 text-xs"
								onClick={closeTimestampModal}>
								Cancel
							</Button>
							<Button
								className="bg-primary-1 text-white font-inter text-xs"
								disabled={isLoading}>
								{isLoading ? "Overriding..." : "Override Timestamps"}
							</Button>
						</div>
					</div>
				</div>
			</Modal>
		</>
	);
};

export default AttendanceTable;
