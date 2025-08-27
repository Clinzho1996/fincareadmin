"use client";

import {
	ColumnDef,
	ColumnFiltersState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	RowSelectionState,
	SortingState,
	useReactTable,
	VisibilityState,
} from "@tanstack/react-table";

import Modal from "@/components/Modal";
import TabCard from "@/components/TabCard";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
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
import { IconPlus, IconTrash } from "@tabler/icons-react";
import {
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
} from "lucide-react";
import { getSession } from "next-auth/react";
import React, { useState } from "react";
import { DateRange } from "react-day-picker";
import { toast } from "react-toastify";

interface Investment {
	id: string;
	name: string;
	image: string;
	amount: number;
	currentBid: number;
	deadline: string;
	status: "active" | "completed" | "upcoming";
	category: string;
}

const defaultData: Investment[] = [
	{
		id: "1",
		name: "Luxury Apartment Complex",
		image: "/images/house.jpeg",
		amount: 5000000,
		currentBid: 4200000,
		deadline: "2023-12-15",
		status: "active",
		category: "Real Estate",
	},
	{
		id: "2",
		name: "Tech Startup Equity",
		image: "/images/house1.jpeg",
		amount: 2000000,
		currentBid: 1800000,
		deadline: "2023-11-30",
		status: "active",
		category: "Startups",
	},
	{
		id: "3",
		name: "Agricultural Land",
		image: "/images/house2.jpeg",
		amount: 1500000,
		currentBid: 1350000,
		deadline: "2023-10-25",
		status: "completed",
		category: "Agriculture",
	},
	{
		id: "4",
		name: "Renewable Energy Project",
		image: "/images/house3.jpeg",
		amount: 3000000,
		currentBid: 0,
		deadline: "2024-01-10",
		status: "upcoming",
		category: "Energy",
	},
];

export function InvestmentDataTable() {
	const [sorting, setSorting] = React.useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
		[]
	);
	const [columnVisibility, setColumnVisibility] =
		React.useState<VisibilityState>({});
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
	const [selectedStatus, setSelectedStatus] = useState<string>("View All");
	const [globalFilter, setGlobalFilter] = useState("");
	const [isModalOpen, setModalOpen] = useState(false);
	const [tableData, setTableData] = useState<Investment[]>(defaultData);
	const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
	const [previewImage, setPreviewImage] = useState<string | null>(null);

	// Form state
	const [name, setName] = useState("");
	const [amount, setAmount] = useState("");
	const [currentBid, setCurrentBid] = useState("");
	const [deadline, setDeadline] = useState("");
	const [category, setCategory] = useState("Real Estate");
	const [imageFile, setImageFile] = useState<File | null>(null);

	const columns: ColumnDef<Investment>[] = [
		{
			accessorKey: "name",
			header: "Investment",
			cell: ({ row }) => (
				<div className="flex items-center gap-3">
					<img
						src={row.original.image}
						alt={row.original.name}
						className="w-10 h-10 rounded-md object-cover"
					/>
					<span className="text-sm font-medium">{row.getValue("name")}</span>
				</div>
			),
		},
		{
			accessorKey: "amount",
			header: "Amount",
			cell: ({ row }) => (
				<span className="text-sm">
					₦{(row.getValue("amount") as number).toLocaleString()}
				</span>
			),
		},
		{
			accessorKey: "currentBid",
			header: "Current Bid",
			cell: ({ row }) => (
				<span className="text-sm">
					{row.getValue("currentBid")
						? `₦${(row.getValue("currentBid") as number).toLocaleString()}`
						: "No bids"}
				</span>
			),
		},
		{
			accessorKey: "deadline",
			header: "Deadline",
			cell: ({ row }) => (
				<span className="text-sm">
					{new Date(row.getValue("deadline")).toLocaleDateString()}
				</span>
			),
		},
		{
			accessorKey: "status",
			header: "Status",
			cell: ({ row }) => {
				const status = row.getValue("status");
				let statusClass = "";
				switch (status) {
					case "active":
						statusClass = "bg-green-100 text-green-800 status green";
						break;
					case "completed":
						statusClass = "bg-blue-100 text-blue-800 status blue";
						break;
					case "upcoming":
						statusClass = "bg-yellow-100 text-yellow-800 status yellow";
						break;
					default:
						statusClass = "bg-gray-100 text-gray-800";
				}
				return (
					<span className={`px-2 py-1 rounded-full text-xs ${statusClass}`}>
						{String(row.getValue("status")).charAt(0).toUpperCase() +
							String(row.getValue("status")).slice(1)}
					</span>
				);
			},
		},
		{
			accessorKey: "category",
			header: "Category",
			cell: ({ row }) => (
				<span className="text-sm">{row.getValue("category")}</span>
			),
		},
	];

	const openModal = () => setModalOpen(true);
	const closeModal = () => {
		setModalOpen(false);
		setName("");
		setAmount("");
		setCurrentBid("");
		setDeadline("");
		setCategory("Real Estate");
		setImageFile(null);
		setPreviewImage(null);
	};

	const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			setImageFile(file);
			const reader = new FileReader();
			reader.onloadend = () => {
				setPreviewImage(reader.result as string);
			};
			reader.readAsDataURL(file);
		}
	};

	const handleAddInvestment = async () => {
		if (!name || !amount || !deadline || !category) {
			toast.error("Please fill all required fields");
			return;
		}

		try {
			const session = await getSession();
			const accessToken = session?.accessToken;

			if (!accessToken) {
				console.error("No access token found.");
				return;
			}

			const res = await fetch("/api/investments", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${accessToken}`,
				},
				body: JSON.stringify({
					amount: Number(amount),
					units: currentBid ? Number(currentBid) : undefined,
				}),
			});

			const data = await res.json();

			if (!res.ok) {
				toast.error(data.error || "Failed to create investment");
				return;
			}

			// Append returned investment to UI
			const newInvestment: Investment = {
				id: data.investmentId, // from API response
				name,
				image: previewImage || "/images/default-investment.jpg",
				amount: Number(amount),
				currentBid: currentBid ? Number(currentBid) : 0,
				deadline,
				status: "active",
				category,
			};

			setTableData([...tableData, newInvestment]);
			toast.success("Investment created successfully!");
			closeModal();
		} catch (error) {
			console.error("Error creating investment:", error);
			toast.error("Something went wrong. Try again.");
		}
	};

	const bulkDeleteInvestments = () => {
		const selectedIds = Object.keys(rowSelection).map(
			(index) => tableData[parseInt(index)].id
		);

		if (selectedIds.length === 0) {
			toast.warn("No investments selected for deletion.");
			return;
		}

		setTableData(tableData.filter((item) => !selectedIds.includes(item.id)));
		setRowSelection({});
		toast.success("Selected investments deleted successfully!");
	};

	const filterDataByDateRange = () => {
		if (!dateRange?.from || !dateRange?.to) {
			setTableData(defaultData);
			return;
		}

		const filteredData = defaultData.filter((item) => {
			const deadlineDate = new Date(item.deadline);
			return deadlineDate >= dateRange.from! && deadlineDate <= dateRange.to!;
		});

		setTableData(filteredData);
	};

	const handleStatusFilter = (status: string) => {
		setSelectedStatus(status);

		if (status === "View All") {
			setTableData(defaultData);
		} else {
			const filteredData = defaultData.filter(
				(item) => item.status.toLowerCase() === status.toLowerCase()
			);
			setTableData(filteredData);
		}
	};

	const table = useReactTable({
		data: tableData,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		onSortingChange: setSorting,
		getSortedRowModel: getSortedRowModel(),
		onColumnFiltersChange: setColumnFilters,
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
		<div className="rounded-lg border-[1px] py-0">
			<Modal isOpen={isModalOpen} onClose={closeModal} title="Add Investment">
				<div className="bg-white p-0 rounded-lg w-[600px] transition-transform ease-in-out form">
					<div className="mt-3 border-t-[1px] border-[#E2E4E9] pt-2">
						<div className="flex flex-col gap-4 mt-4">
							<div>
								<p className="text-xs text-primary-6 mb-2">Investment Image</p>
								<div className="flex items-center gap-4">
									{previewImage ? (
										<img
											src={previewImage}
											alt="Preview"
											className="w-20 h-20 rounded-md object-cover"
										/>
									) : (
										<div className="w-20 h-20 rounded-md bg-gray-100 flex items-center justify-center">
											<span className="text-xs text-gray-400">No image</span>
										</div>
									)}
									<label className="cursor-pointer">
										<span className="text-xs bg-primary-1 text-white px-3 py-2 rounded">
											Upload Image
										</span>
										<input
											type="file"
											className="hidden"
											accept="image/*"
											onChange={handleImageUpload}
										/>
									</label>
								</div>
							</div>

							<div>
								<p className="text-xs text-primary-6">Investment Name</p>
								<Input
									type="text"
									placeholder="Enter investment name"
									className="focus:border-none mt-2"
									value={name}
									onChange={(e) => setName(e.target.value)}
								/>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<p className="text-xs text-primary-6">Amount (₦)</p>
									<Input
										type="number"
										placeholder="Enter amount"
										className="focus:border-none mt-2"
										value={amount}
										onChange={(e) => setAmount(e.target.value)}
									/>
								</div>
								<div>
									<p className="text-xs text-primary-6">Current Bid (₦)</p>
									<Input
										type="number"
										placeholder="Enter current bid"
										className="focus:border-none mt-2"
										value={currentBid}
										onChange={(e) => setCurrentBid(e.target.value)}
									/>
								</div>
							</div>

							<div>
								<p className="text-xs text-primary-6">Bidding Deadline</p>
								<Input
									type="date"
									className="focus:border-none mt-2"
									value={deadline}
									onChange={(e) => setDeadline(e.target.value)}
								/>
							</div>

							<div>
								<p className="text-xs text-primary-6">Category</p>
								<Select
									value={category}
									onValueChange={(value) => setCategory(value)}>
									<SelectTrigger className="w-full mt-2">
										<SelectValue placeholder="Select category" />
									</SelectTrigger>
									<SelectContent className="bg-white z-100 select">
										<SelectItem value="Real Estate">Real Estate</SelectItem>
										<SelectItem value="Startups">Fixed Investment</SelectItem>
									</SelectContent>
								</Select>
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
								onClick={handleAddInvestment}>
								Add Investment
							</Button>
						</div>
					</div>
				</div>
			</Modal>

			<div
				className="bg-white flex flex-row border-b-[1px] border-[#E2E4E9] justify-between items-center p-3"
				style={{
					borderTopLeftRadius: "0.5rem",
					borderTopRightRadius: "0.5rem",
				}}>
				<div className="flex flex-row justify-start items-center gap-3">
					<TabCard
						title="Total Investments"
						value={tableData.length}
						icon="/images/salesicon.png"
					/>
					<TabCard
						title="Active Investments"
						value={tableData.filter((i) => i.status === "active").length}
						icon="/images/salesicon.png"
					/>
					<TabCard
						title="Completed Inv."
						value={tableData.filter((i) => i.status === "completed").length}
						icon="/images/salesicon.png"
					/>
				</div>
				<div className="flex flex-row justify-start items-center gap-3 font-inter">
					<Button
						className="bg-primary-1 text-white font-inter"
						onClick={openModal}>
						<IconPlus /> Add Investment
					</Button>
				</div>
			</div>

			<div className="p-3 flex flex-row justify-between border-b-[1px] border-[#E2E4E9] bg-white items-center gap-20 max-w-full">
				<div className="flex flex-row justify-start bg-white items-center rounded-lg mx-auto special-btn-farmer pr-2">
					{["View All", "Active", "Completed", "Upcoming"].map(
						(status, index, arr) => (
							<p
								key={status}
								className={`px-4 py-2 text-center text-sm cursor-pointer border border-[#E2E4E9] overflow-hidden ${
									selectedStatus === status
										? "bg-primary-5 text-dark-1"
										: "text-dark-1"
								} 
              ${index === 0 ? "rounded-l-lg firstRound" : ""} 
              ${index === arr.length - 1 ? "rounded-r-lg lastRound" : ""}`}
								onClick={() => handleStatusFilter(status)}>
								{status}
							</p>
						)
					)}
				</div>
				<div className="p-3 flex flex-row justify-start items-center gap-3 w-full">
					<Input
						placeholder="Search investments..."
						value={globalFilter}
						onChange={(e) => setGlobalFilter(e.target.value)}
						className="focus:border-none bg-[#F9FAFB]"
					/>
					<Button
						className="border-[#E8E8E8] border-[1px] bg-white"
						onClick={bulkDeleteInvestments}>
						<IconTrash /> Delete
					</Button>
					<div className="w-[250px]">
						<DateRangePicker dateRange={dateRange} onSelect={setDateRange} />
					</div>
				</div>
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
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</TableCell>
								))}
							</TableRow>
						))
					) : (
						<TableRow>
							<TableCell
								colSpan={columns.length}
								className="h-24 text-left text-xs text-primary-6">
								No results.
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
						<p className="text-xs text-primary-6 font-medium">Rows per page</p>
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
						{table.getState().pagination.pageIndex + 1} of{" "}
						{table.getPageCount()} pages
					</div>
					<div className="flex items-center space-x-5 gap-2">
						<Button
							variant="outline"
							className="hidden h-8 w-8 p-0 lg:flex"
							onClick={() => table.setPageIndex(0)}
							disabled={!table.getCanPreviousPage()}>
							<span className="sr-only">Go to first page</span>
							<ChevronsLeft />
						</Button>
						<Button
							variant="outline"
							className="h-8 w-8 p-0"
							onClick={() => table.previousPage()}
							disabled={!table.getCanPreviousPage()}>
							<span className="sr-only">Go to previous page</span>
							<ChevronLeft />
						</Button>
						<Button
							variant="outline"
							className="h-8 w-8 p-0"
							onClick={() => table.nextPage()}
							disabled={!table.getCanNextPage()}>
							<span className="sr-only">Go to next page</span>
							<ChevronRight />
						</Button>
						<Button
							variant="outline"
							className="hidden h-8 w-8 p-0 lg:flex"
							onClick={() => table.setPageIndex(table.getPageCount() - 1)}
							disabled={!table.getCanNextPage()}>
							<span className="sr-only">Go to last page</span>
							<ChevronsRight />
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
