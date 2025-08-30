"use client";

import {
	ColumnDef,
	ColumnFiltersState,
	RowSelectionState,
	SortingState,
	VisibilityState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, Download, Eye, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useSession } from "next-auth/react";
import React, { useEffect, useState } from "react";

export type Transaction = {
	_id: string;
	userId: string;
	user: {
		firstName: string;
		lastName: string;
		email: string;
	};
	type: string;
	amount: number;
	status: "pending" | "completed" | "failed" | "processing";
	description: string;
	reference: string;
	createdAt: string;
	updatedAt: string;
};

declare module "next-auth" {
	interface Session {
		accessToken?: string;
	}
}

const TransactionsTable = () => {
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [tableData, setTableData] = useState<Transaction[]>([]);
	const [selectedTransaction, setSelectedTransaction] =
		useState<Transaction | null>(null);
	const [isDetailModalOpen, setDetailModalOpen] = useState(false);
	const { data: session } = useSession();

	const [sorting, setSorting] = React.useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
		[]
	);
	const [columnVisibility, setColumnVisibility] =
		React.useState<VisibilityState>({});
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
	const [globalFilter, setGlobalFilter] = useState("");

	const fetchTransactions = async () => {
		try {
			setIsLoading(true);

			if (!session?.accessToken) {
				console.error("No access token found.");
				setIsLoading(false);
				return;
			}

			const response = await fetch("/api/admin/transactions", {
				headers: {
					Authorization: `Bearer ${session.accessToken}`,
				},
			});

			if (!response.ok) {
				throw new Error("Failed to fetch transactions");
			}

			const data = await response.json();

			if (data.status === "success") {
				setTableData(data.data);
			}
		} catch (error) {
			console.error("Error fetching transactions:", error);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		if (session) {
			fetchTransactions();
		}
	}, [session]);

	const formatDate = (rawDate: string) => {
		const options: Intl.DateTimeFormatOptions = {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		};
		const parsedDate = new Date(rawDate);
		return new Intl.DateTimeFormat("en-US", options).format(parsedDate);
	};

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("en-NG", {
			style: "currency",
			currency: "NGN",
		}).format(amount);
	};

	const handleViewDetails = (transaction: Transaction) => {
		setSelectedTransaction(transaction);
		setDetailModalOpen(true);
	};

	const handleExport = () => {
		// Export selected rows or all rows
		const selectedRowIds = Object.keys(rowSelection);
		const dataToExport =
			selectedRowIds.length > 0
				? tableData.filter((row) => selectedRowIds.includes(row._id))
				: tableData;

		const csvContent = [
			[
				"ID",
				"User",
				"Type",
				"Amount",
				"Status",
				"Description",
				"Reference",
				"Created At",
			],
			...dataToExport.map((transaction) => [
				transaction._id,
				`${transaction.user.firstName} ${transaction.user.lastName}`,
				transaction.type,
				transaction.amount,
				transaction.status,
				transaction.description,
				transaction.reference,
				formatDate(transaction.createdAt),
			]),
		]
			.map((row) => row.join(","))
			.join("\n");

		const blob = new Blob([csvContent], { type: "text/csv" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `transactions-${
			new Date().toISOString().split("T")[0]
		}.csv`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	const handleStatusUpdate = async (
		transactionId: string,
		newStatus: Transaction["status"]
	) => {
		try {
			if (!session?.accessToken) {
				console.error("No access token found.");
				return;
			}

			const response = await fetch(`/api/admin/transactions/${transactionId}`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session.accessToken}`,
				},
				body: JSON.stringify({ status: newStatus }),
			});

			if (response.ok) {
				// Update local state
				setTableData((prev) =>
					prev.map((t) =>
						t._id === transactionId ? { ...t, status: newStatus } : t
					)
				);
			}
		} catch (error) {
			console.error("Error updating transaction status:", error);
		}
	};

	const columns: ColumnDef<Transaction>[] = [
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
			accessorKey: "user",
			header: "User",
			cell: ({ row }) => {
				const user = row.original.user;
				return (
					<div className="flex flex-col">
						<span className="text-sm font-medium">
							{user.firstName} {user.lastName}
						</span>
						<span className="text-xs text-gray-500">{user.email}</span>
					</div>
				);
			},
		},
		{
			accessorKey: "type",
			header: "Type",
			cell: ({ row }) => {
				const type = row.getValue("type") as string;
				return <span className="text-sm capitalize">{type}</span>;
			},
		},
		{
			accessorKey: "amount",
			header: ({ column }) => {
				return (
					<Button
						variant="ghost"
						onClick={() =>
							column.toggleSorting(column.getIsSorted() === "asc")
						}>
						Amount
						<ArrowUpDown className="ml-2 h-4 w-4" />
					</Button>
				);
			},
			cell: ({ row }) => {
				const amount = row.getValue("amount") as number;
				return (
					<span className="text-sm font-medium">{formatCurrency(amount)}</span>
				);
			},
		},
		{
			accessorKey: "status",
			header: "Status",
			cell: ({ row }) => {
				const status = row.getValue("status") as string;
				const statusColors = {
					completed: "bg-green-100 text-green-800",
					pending: "bg-yellow-100 text-yellow-800",
					processing: "bg-blue-100 text-blue-800",
					failed: "bg-red-100 text-red-800",
				};

				return (
					<span
						className={`px-2 py-1 rounded-full text-xs capitalize ${
							statusColors[status as keyof typeof statusColors] || ""
						}`}>
						{status}
					</span>
				);
			},
		},
		{
			accessorKey: "description",
			header: "Description",
			cell: ({ row }) => {
				const description = row.getValue("description") as string;
				return <span className="text-sm">{description}</span>;
			},
		},
		{
			accessorKey: "reference",
			header: "Reference",
			cell: ({ row }) => {
				const reference = row.getValue("reference") as string;
				return <span className="text-sm font-mono">{reference}</span>;
			},
		},
		{
			accessorKey: "createdAt",
			header: "Date",
			cell: ({ row }) => {
				const createdAt = row.getValue("createdAt") as string;
				return <span className="text-sm">{formatDate(createdAt)}</span>;
			},
		},
		{
			id: "actions",
			header: "Actions",
			cell: ({ row }) => {
				const transaction = row.original;

				return (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" className="h-8 w-8 p-0">
								<span className="sr-only">Open menu</span>
								<MoreHorizontal className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuLabel>Actions</DropdownMenuLabel>
							<DropdownMenuItem onClick={() => handleViewDetails(transaction)}>
								<Eye className="mr-2 h-4 w-4" />
								View Details
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onClick={() => navigator.clipboard.writeText(transaction._id)}>
								Copy ID
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() =>
									navigator.clipboard.writeText(transaction.reference)
								}>
								Copy Reference
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onClick={() =>
									handleStatusUpdate(transaction._id, "completed")
								}>
								Mark as Completed
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() => handleStatusUpdate(transaction._id, "failed")}>
								Mark as Failed
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				);
			},
		},
	];

	const table = useReactTable({
		data: tableData,
		columns,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		onColumnVisibilityChange: setColumnVisibility,
		onRowSelectionChange: setRowSelection,
		onGlobalFilterChange: setGlobalFilter,
		state: {
			sorting,
			columnFilters,
			columnVisibility,
			rowSelection,
			globalFilter,
		},
	});

	return (
		<div className="rounded-lg border-[1px] p-5">
			<div className="flex items-center justify-between py-4 gap-4">
				<Input
					placeholder="Search transactions..."
					value={globalFilter}
					onChange={(event) => setGlobalFilter(event.target.value)}
					className="max-w-sm"
				/>
				<div className="flex items-center gap-2">
					<Button
						onClick={handleExport}
						variant="outline"
						className="bg-primary-1 text-white border border-[#FFFFFF00]">
						<Download className="mr-2 h-4 w-4" />
						Export
					</Button>
				</div>
			</div>

			<div className="rounded-md border">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => {
									return (
										<TableHead key={header.id}>
											{header.isPlaceholder
												? null
												: flexRender(
														header.column.columnDef.header,
														header.getContext()
												  )}
										</TableHead>
									);
								})}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow
									key={row.id}
									data-state={row.getIsSelected() && "selected"}>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id}>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext()
											)}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="h-24 text-center">
									{isLoading
										? "Loading transactions..."
										: "No transactions found."}
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			<div className="flex items-center justify-end space-x-2 py-4">
				<div className="flex-1 text-sm text-muted-foreground">
					{table.getFilteredSelectedRowModel().rows.length} of{" "}
					{table.getFilteredRowModel().rows.length} row(s) selected.
				</div>
				<div className="space-x-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => table.previousPage()}
						disabled={!table.getCanPreviousPage()}>
						Previous
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => table.nextPage()}
						disabled={!table.getCanNextPage()}>
						Next
					</Button>
				</div>
			</div>

			{/* Transaction Detail Modal */}
			{isDetailModalOpen && selectedTransaction && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg p-6 w-full max-w-2xl">
						<h2 className="text-xl font-bold mb-4">Transaction Details</h2>

						<div className="grid grid-cols-2 gap-4 mb-4">
							<div>
								<p className="text-sm text-gray-500">Transaction ID</p>
								<p className="font-medium">{selectedTransaction._id}</p>
							</div>
							<div>
								<p className="text-sm text-gray-500">Reference</p>
								<p className="font-medium">{selectedTransaction.reference}</p>
							</div>
							<div>
								<p className="text-sm text-gray-500">User</p>
								<p className="font-medium">
									{selectedTransaction.user.firstName}{" "}
									{selectedTransaction.user.lastName}
								</p>
								<p className="text-sm text-gray-500">
									{selectedTransaction.user.email}
								</p>
							</div>
							<div>
								<p className="text-sm text-gray-500">Amount</p>
								<p className="font-medium">
									{formatCurrency(selectedTransaction.amount)}
								</p>
							</div>
							<div>
								<p className="text-sm text-gray-500">Type</p>
								<p className="font-medium capitalize">
									{selectedTransaction.type}
								</p>
							</div>
							<div>
								<p className="text-sm text-gray-500">Status</p>
								<p className="font-medium capitalize">
									{selectedTransaction.status}
								</p>
							</div>
							<div>
								<p className="text-sm text-gray-500">Created At</p>
								<p className="font-medium">
									{formatDate(selectedTransaction.createdAt)}
								</p>
							</div>
							<div>
								<p className="text-sm text-gray-500">Updated At</p>
								<p className="font-medium">
									{formatDate(selectedTransaction.updatedAt)}
								</p>
							</div>
						</div>

						<div className="mb-4">
							<p className="text-sm text-gray-500">Description</p>
							<p className="font-medium">{selectedTransaction.description}</p>
						</div>

						<div className="flex justify-end gap-2">
							<Button
								variant="outline"
								onClick={() => setDetailModalOpen(false)}>
								Close
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default TransactionsTable;
