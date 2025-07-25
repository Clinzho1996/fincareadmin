"use client";

import { ColumnDef } from "@tanstack/react-table";

import Loader from "@/components/Loader";
import { Checkbox } from "@/components/ui/checkbox";
import axios from "axios";
import { getSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { ReportsDataTable } from "./reports-table";

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

const ReportsTable = () => {
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [tableData, setTableData] = useState<Staff[]>([]);

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
			accessorKey: "staff",
			header: "ID",
			cell: ({ row }) => {
				const staff = row.getValue<string>("staff") || "CW203847";

				return <span className="text-xs text-primary-6">{staff}</span>;
			},
		},
		{
			accessorKey: "email",
			header: "Service Type",
			cell: ({ row }) => {
				const email = row.getValue<string>("Net") || "Wash and Dry";

				return <span className="text-xs text-primary-6 t-data">{email}</span>;
			},
		},
		{
			accessorKey: "email",
			header: "Net",
			cell: ({ row }) => {
				const email = row.getValue<string>("Net") || "3000";

				return <span className="text-xs text-primary-6 t-data">{email}</span>;
			},
		},
		{
			accessorKey: "email",
			header: "Tax",
			cell: ({ row }) => {
				const email = row.getValue<string>("Net") || "300";

				return <span className="text-xs text-primary-6 t-data">{email}</span>;
			},
		},
		{
			accessorKey: "email",
			header: "Total",
			cell: ({ row }) => {
				const email = row.getValue<string>("Net") || "3300";

				return <span className="text-xs text-primary-6 t-data">{email}</span>;
			},
		},
	];

	return (
		<>
			{isLoading ? (
				<Loader />
			) : (
				<ReportsDataTable columns={columns} data={tableData} />
			)}
		</>
	);
};

export default ReportsTable;
