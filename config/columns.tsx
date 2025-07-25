"use client";

import { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";

import Loader from "@/components/Loader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { MoreHorizontal } from "lucide-react";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconEye } from "@tabler/icons-react";
import axios from "axios";
import { getSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DataTable } from "./data-table";

// Define the expected API response type

export type Readers = {
	id: string;
	name: string;
	date: string;
	firstName?: string;
	lastName?: string;
	role?: string;
	staff?: string;
	bookRead: number;
	subStatus: "free" | "subscribed";
	status: "Completed" | "In Progress" | "Cancelled" | "inactive" | "active";
	email: string;
	profile_pic?: string;
};

declare module "next-auth" {
	interface Session {
		accessToken?: string;
	}
}

const Table = () => {
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
	const [isCloseModalOpen, setCloseModalOpen] = useState(false);
	const [selectedRow, setSelectedRow] = useState<Readers | null>(null);
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
	const [tableData, setTableData] = useState<Readers[]>([]);
	const [progress, setProgress] = useState(0);

	const openDeleteModal = (row: { original: Readers }) => {
		setSelectedRow(row.original);
		setDeleteModalOpen(true);
	};

	const openCloseModal = (row: { original: Readers }) => {
		setSelectedRow(row.original);
		setCloseModalOpen(true);
	};

	const closeDeleteModal = () => setDeleteModalOpen(false);
	const closeCloseModal = () => setCloseModalOpen(false);

	const fetchBudgetData = async () => {
		try {
			setIsLoading(true);
			const session = await getSession();

			if (!session?.accessToken) {
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
			console.error("Error fetching budget data:", error);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchBudgetData();
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

	const formatCurrency = (amount: string) => {
		return new Intl.NumberFormat("en-NG", {
			style: "currency",
			currency: "NGN",
			minimumFractionDigits: 2,
		}).format(parseFloat(amount));
	};

	// Define table columns
	const columns: ColumnDef<Readers>[] = [
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
			header: "Order ID",
			cell: ({ row }) => {
				if (!row) return null; // or return a placeholder
				const name = row.getValue<string>("name") || "N/A";
				return (
					<span className="text-xs text-black capitalize t-data">{name}</span>
				);
			},
		},
		{
			accessorKey: "staff",
			header: "Customer Name",
			cell: ({ row }) => {
				const staff = row.getValue<string>("staff");

				return <span className="text-xs text-primary-6">{staff}</span>;
			},
		},

		{
			accessorKey: "date",
			header: "Date",
			cell: ({ row }) => {
				const rawDate = row.original.date;
				const date = new Date(rawDate); // ✅ Convert it to a Date object

				return (
					<span className="text-xs text-primary-6">{formatDate(date)}</span>
				);
			},
		},
		{
			accessorKey: "staff",
			header: "Order Type",
			cell: ({ row }) => {
				const staff = row.getValue<string>("staff");

				return <span className="text-xs text-primary-6">{staff}</span>;
			},
		},
		{
			accessorKey: "date",
			header: "Service Type",
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
							<Link href={`/orders/${actions.id}`}>
								<DropdownMenuItem className="action cursor-pointer hover:bg-secondary-3">
									<IconEye />
									<p className="text-xs font-inter">View Order</p>
								</DropdownMenuItem>
							</Link>
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
				<DataTable columns={columns} data={tableData} />
			)}
		</>
	);
};

export default Table;
