"use client";

import Loader from "@/components/Loader";
import { Checkbox } from "@/components/ui/checkbox";
import { ColumnDef } from "@tanstack/react-table";
import axios from "axios";
import { getSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { UserSubscriptionDataTable } from "./user-sub-table";

interface ApiResponse {
	status: "success" | "error";
	message: string;
	data: {
		data: Subscription[];
	};
}

export type Subscription = {
	id: string;
	user_id: string;
	transaction_id: string;
	amount: string;
	duration: string;
	start_date: string;
	end_date: string;
	status?: string;
	created_at: string;
	updated_at: string;
	subscription_plan?: {
		subscription_plan_name?: string;
	};
};

const UserSubscriptionTable = () => {
	const [isLoading, setIsLoading] = useState(true);
	const [tableData, setTableData] = useState<Subscription[]>([]);
	const [error, setError] = useState<string | null>(null);

	const fetchTransactionData = async () => {
		try {
			const session = await getSession();
			const accessToken = session?.accessToken;

			if (!accessToken) {
				setError("Authentication required. Please log in.");
				return;
			}

			const response = await axios.get<ApiResponse>(
				`https://api.kuditrak.ng/api/v1/subscription`,
				{
					headers: {
						Accept: "application/json",
						Authorization: `Bearer ${accessToken}`,
					},
				}
			);

			if (response.data.status === "success") {
				setTableData(response.data.data.data || []);
			} else {
				setError(response.data.message || "Failed to fetch subscription data");
			}
		} catch (error) {
			console.error("Error fetching transaction data:", error);
			setError("An error occurred while fetching data");
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchTransactionData();
	}, []);

	const columns: ColumnDef<Subscription>[] = [
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
			accessorKey: "transaction_id",
			header: "Transaction ID",
			cell: ({ row }) => (
				<span className="text-xs text-dark-1">
					{row.getValue("transaction_id") || "N/A"}
				</span>
			),
		},
		{
			accessorKey: "subscription_plan.subscription_plan_name",
			header: "Plan",
			cell: ({ row }) => (
				<span className="text-xs text-dark-1">
					{row.original.subscription_plan?.subscription_plan_name || "N/A"}
				</span>
			),
		},
		{
			accessorKey: "duration",
			header: "Duration",
			cell: ({ row }) => (
				<span className="text-xs text-dark-1 capitalize">
					{row.getValue("duration") ? `${row.getValue("duration")}ly` : "N/A"}
				</span>
			),
		},
		{
			accessorKey: "amount",
			header: "Amount",
			cell: ({ row }) => (
				<span className="text-xs text-dark-1">
					{row.getValue("amount") ? `₦${row.getValue("amount")}` : "N/A"}
				</span>
			),
		},
		{
			accessorKey: "start_date",
			header: "Start Date",
			cell: ({ row }) => {
				const date = row.getValue("start_date");
				return (
					<span className="text-xs text-dark-1">
						{date ? new Date(date as string).toLocaleString() : "N/A"}
					</span>
				);
			},
		},
		{
			accessorKey: "end_date",
			header: "End Date",
			cell: ({ row }) => {
				const date = row.getValue("end_date");
				return (
					<span className="text-xs text-dark-1">
						{date ? new Date(date as string).toLocaleString() : "N/A"}
					</span>
				);
			},
		},
	];

	if (isLoading) {
		return <Loader />;
	}

	if (error) {
		return (
			<div className="p-4 text-center text-red-500">
				{error}
				<button
					onClick={fetchTransactionData}
					className="ml-2 text-blue-500 hover:underline">
					Retry
				</button>
			</div>
		);
	}

	return (
		<div className="w-full">
			{tableData.length > 0 ? (
				<UserSubscriptionDataTable columns={columns} data={tableData} />
			) : (
				<div className="p-4 text-center text-gray-500">
					No subscription data available
				</div>
			)}
		</div>
	);
};

export default UserSubscriptionTable;
