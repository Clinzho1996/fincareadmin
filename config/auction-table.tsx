"use client";

import {
	ColumnDef,
	ColumnFiltersState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	SortingState,
	useReactTable,
	VisibilityState,
} from "@tanstack/react-table";

import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { IconPlus } from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "react-toastify";
import { Auction } from "./auction-column";

interface AuctionDataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
}

export function AuctionDataTable<TData, TValue>({
	columns,
	data,
}: AuctionDataTableProps<TData, TValue>) {
	const { data: session } = useSession();
	const accessToken = session?.accessToken;

	const [sorting, setSorting] = useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
	const [rowSelection, setRowSelection] = useState({});
	const [tableData, setTableData] = useState<Auction[]>([]);
	const [globalFilter, setGlobalFilter] = useState("");
	const [isCreateModalOpen, setCreateModalOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	// Form state
	const [formData, setFormData] = useState({
		name: "",
		amount: "",
		unitPrice: "",
		interestRate: "",
		maturityDate: "",
		image: "",
		auctionName: "",
		description: "",
		reservePrice: "",
		duration: "7", // default 7 days
	});

	const handleInputChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
	) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleSelectChange = (name: string, value: string) => {
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const fetchAuctions = async () => {
		if (!accessToken) return;

		try {
			setIsLoading(true);
			const response = await fetch("/api/admin/auctions", {
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			});

			const result = await response.json();

			if (result.auctions) {
				setTableData(result.auctions);
			}
		} catch (error) {
			console.error("Error fetching auctions:", error);
			toast.error("Failed to fetch auctions.");
		} finally {
			setIsLoading(false);
		}
	};

	const handleCreateAuction = async () => {
		if (!accessToken) {
			toast.error("Authentication required");
			return;
		}

		// Validate required fields
		if (
			!formData.name ||
			!formData.amount ||
			!formData.unitPrice ||
			!formData.interestRate ||
			!formData.maturityDate ||
			!formData.auctionName ||
			!formData.reservePrice ||
			!formData.duration
		) {
			toast.error("Please fill in all required fields");
			return;
		}

		setIsLoading(true);
		try {
			const response = await fetch("/api/admin/auctions", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${accessToken}`,
				},
				body: JSON.stringify({
					name: formData.name,
					amount: parseFloat(formData.amount),
					unitPrice: parseFloat(formData.unitPrice),
					interestRate: parseFloat(formData.interestRate),
					maturityDate: formData.maturityDate,
					image: formData.image || null,
					auctionName: formData.auctionName,
					description: formData.description || "",
					reservePrice: parseFloat(formData.reservePrice),
					duration: parseInt(formData.duration),
				}),
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || "Failed to create auction");
			}

			toast.success("Auction created successfully!");
			setCreateModalOpen(false);
			await fetchAuctions();
			resetForm();
		} catch (error: any) {
			console.error("Error creating auction:", error);
			toast.error(error.message || "Failed to create auction");
		} finally {
			setIsLoading(false);
		}
	};

	const resetForm = () => {
		setFormData({
			name: "",
			amount: "",
			unitPrice: "",
			interestRate: "",
			maturityDate: "",
			image: "",
			auctionName: "",
			description: "",
			reservePrice: "",
			duration: "7",
		});
	};

	const table = useReactTable({
		data,
		columns,
		state: {
			sorting,
			columnFilters,
			columnVisibility,
			rowSelection,
			globalFilter,
		},
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		onColumnVisibilityChange: setColumnVisibility,
		onRowSelectionChange: setRowSelection,
		onGlobalFilterChange: setGlobalFilter,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
	});

	return (
		<>
			<div className="rounded-lg border-[1px] py-0">
				<div className="p-3 flex flex-row justify-between border-b-[1px] border-[#E2E4E9] bg-white items-center gap-20 max-w-full rounded-lg">
					<div className="p-3 flex flex-row justify-start items-center gap-3 w-full">
						<Input
							placeholder="Search auctions..."
							value={globalFilter}
							onChange={(e) => setGlobalFilter(e.target.value)}
							className="focus:border-none bg-[#F9FAFB] w-full"
						/>
					</div>
					<Button
						className="bg-primary-1 text-white font-inter"
						onClick={() => setCreateModalOpen(true)}
						disabled={isLoading}>
						<IconPlus /> Create Auction
					</Button>
				</div>

				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id} className="bg-primary-3">
								{headerGroup.headers.map((header) => {
									return (
										<TableHead key={header.id} className="bg-primary-3 text-xs">
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
					<TableBody className="bg-white">
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
									className="h-24 text-left text-xs text-primary-6">
									No auctions found.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>

				<div className="flex items-center justify-between bg-white rounded-lg py-3 px-2 border-t-[1px] border-gray-300 mt-2">
					<div className="flex-1 text-xs text-primary-6 text-muted-foreground">
						{table.getFilteredSelectedRowModel().rows.length} of{" "}
						{table.getFilteredRowModel().rows.length} row(s) selected.
					</div>
					<div className="flex items-center space-x-10 lg:space-x-10 gap-3">
						<div className="flex items-center space-x-4 gap-2">
							<p className="text-xs text-primary-6 font-medium">
								Rows per page
							</p>
							<Select
								value={`${table.getState().pagination.pageSize}`}
								onValueChange={(value) => {
									table.setPageSize(Number(value));
								}}>
								<SelectTrigger className="h-8 w-[70px] bg-white z-10">
									<SelectValue
										placeholder={table.getState().pagination.pageSize}
									/>
								</SelectTrigger>
								<SelectContent side="top" className="bg-white">
									{[5, 10, 20, 30, 40, 50].map((pageSize) => (
										<SelectItem key={pageSize} value={`${pageSize}`}>
											{pageSize}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="flex w-[100px] items-center justify-center font-medium text-xs text-primary-6">
							Page {table.getState().pagination.pageIndex + 1} of{" "}
							{table.getPageCount()}
						</div>
						<div className="flex items-center space-x-5 gap-2">
							<Button
								variant="outline"
								className="hidden h-8 w-8 p-0 lg:flex"
								onClick={() => table.setPageIndex(0)}
								disabled={!table.getCanPreviousPage()}>
								<span className="sr-only">Go to first page</span>
								{"<<"}
							</Button>
							<Button
								variant="outline"
								className="h-8 w-8 p-0"
								onClick={() => table.previousPage()}
								disabled={!table.getCanPreviousPage()}>
								<span className="sr-only">Go to previous page</span>
								{"<"}
							</Button>
							<Button
								variant="outline"
								className="h-8 w-8 p-0"
								onClick={() => table.nextPage()}
								disabled={!table.getCanNextPage()}>
								<span className="sr-only">Go to next page</span>
								{">"}
							</Button>
							<Button
								variant="outline"
								className="hidden h-8 w-8 p-0 lg:flex"
								onClick={() => table.setPageIndex(table.getPageCount() - 1)}
								disabled={!table.getCanNextPage()}>
								<span className="sr-only">Go to last page</span>
								{">>"}
							</Button>
						</div>
					</div>
				</div>
			</div>

			{/* Create Auction Modal */}
			<Modal
				isOpen={isCreateModalOpen}
				onClose={() => {
					setCreateModalOpen(false);
					resetForm();
				}}
				title="Create New Auction">
				<div className="bg-white p-0 rounded-lg transition-transform ease-in-out form">
					<div className="mt-3 pt-2">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{/* Investment Details */}
							<div className="space-y-4">
								<h3 className="text-sm font-medium text-primary-6 border-b pb-2">
									Investment Details
								</h3>

								<div>
									<p className="text-xs text-primary-6">Investment Name *</p>
									<Input
										name="name"
										type="text"
										placeholder="Enter investment name"
										className="focus:border-none mt-1"
										value={formData.name}
										onChange={handleInputChange}
									/>
								</div>

								<div>
									<p className="text-xs text-primary-6">Total Amount (₦) *</p>
									<Input
										name="amount"
										type="number"
										placeholder="Enter total amount"
										className="focus:border-none mt-1"
										value={formData.amount}
										onChange={handleInputChange}
									/>
								</div>

								<div>
									<p className="text-xs text-primary-6">Unit Price (₦) *</p>
									<Input
										name="unitPrice"
										type="number"
										step="0.01"
										placeholder="Enter unit price"
										className="focus:border-none mt-1"
										value={formData.unitPrice}
										onChange={handleInputChange}
									/>
								</div>

								<div>
									<p className="text-xs text-primary-6">Interest Rate (%) *</p>
									<Input
										name="interestRate"
										type="number"
										step="0.01"
										placeholder="Enter interest rate"
										className="focus:border-none mt-1"
										value={formData.interestRate}
										onChange={handleInputChange}
									/>
								</div>

								<div>
									<p className="text-xs text-primary-6">Maturity Date *</p>
									<Input
										name="maturityDate"
										type="date"
										className="focus:border-none mt-1"
										value={formData.maturityDate}
										onChange={handleInputChange}
									/>
								</div>

								<div>
									<p className="text-xs text-primary-6">Image URL (Optional)</p>
									<Input
										name="image"
										type="url"
										placeholder="Enter image URL"
										className="focus:border-none mt-1"
										value={formData.image}
										onChange={handleInputChange}
									/>
								</div>
							</div>

							{/* Auction Details */}
							<div className="space-y-4">
								<h3 className="text-sm font-medium text-primary-6 border-b pb-2">
									Auction Details
								</h3>

								<div>
									<p className="text-xs text-primary-6">Auction Name *</p>
									<Input
										name="auctionName"
										type="text"
										placeholder="Enter auction name"
										className="focus:border-none mt-1"
										value={formData.auctionName}
										onChange={handleInputChange}
									/>
								</div>

								<div>
									<p className="text-xs text-primary-6">
										Description (Optional)
									</p>
									<textarea
										name="description"
										placeholder="Enter auction description"
										className="w-full p-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary-1 mt-1"
										rows={3}
										value={formData.description}
										onChange={handleInputChange}
									/>
								</div>

								<div>
									<p className="text-xs text-primary-6">Reserve Price (₦) *</p>
									<Input
										name="reservePrice"
										type="number"
										step="0.01"
										placeholder="Enter reserve price"
										className="focus:border-none mt-1"
										value={formData.reservePrice}
										onChange={handleInputChange}
									/>
								</div>

								<div>
									<p className="text-xs text-primary-6">Duration (Days) *</p>
									<Select
										value={formData.duration}
										onValueChange={(value) =>
											handleSelectChange("duration", value)
										}>
										<SelectTrigger className="w-full mt-1">
											<SelectValue placeholder="Select duration" />
										</SelectTrigger>
										<SelectContent className="bg-white select">
											<SelectItem value="1">1 Day</SelectItem>
											<SelectItem value="3">3 Days</SelectItem>
											<SelectItem value="7">7 Days</SelectItem>
											<SelectItem value="14">14 Days</SelectItem>
											<SelectItem value="30">30 Days</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>
						</div>

						<hr className="mt-4 mb-4 text-[#9F9E9E40]" color="#9F9E9E40" />
						<div className="flex flex-row justify-end items-center gap-3 font-inter">
							<Button
								className="border-[#E8E8E8] border-[1px] text-primary-6 text-xs"
								onClick={() => {
									setCreateModalOpen(false);
									resetForm();
								}}
								disabled={isLoading}>
								Cancel
							</Button>
							<Button
								className="bg-primary-1 text-white font-inter text-xs"
								onClick={handleCreateAuction}
								disabled={isLoading}>
								{isLoading ? "Creating..." : "Create Auction"}
							</Button>
						</div>
					</div>
				</div>
			</Modal>
		</>
	);
}
