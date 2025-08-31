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
import { Checkbox } from "@/components/ui/checkbox";
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
import { IconEdit, IconPlus, IconTrash } from "@tabler/icons-react";
import {
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
} from "lucide-react";
import { getSession } from "next-auth/react";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { DateRange } from "react-day-picker";
import { toast } from "react-toastify";

interface Investment {
	_id: string;
	name: string;
	unitPrice: number;
	interestRate: number;
	type: string;
	maturityDate: string;
	image?: string;
	createdAt: string;
	updatedAt: string;
}

export function InvestmentDataTable() {
	const [isSending, setIsSending] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [editingInvestment, setEditingInvestment] = useState<Investment | null>(
		null
	);

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
	const [tableData, setTableData] = useState<Investment[]>([]);
	const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
	const [previewImage, setPreviewImage] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	// Form state
	const [name, setName] = useState("");
	const [unitPrice, setUnitPrice] = useState("");
	const [interestRate, setInterestRate] = useState("");
	const [type, setType] = useState("fixed");
	const [maturityDate, setMaturityDate] = useState("");
	const [imageFile, setImageFile] = useState<File | null>(null);

	// Fetch investments from API
	const fetchInvestments = async () => {
		try {
			setIsLoading(true);
			const session = await getSession();
			const accessToken = session?.accessToken;

			if (!accessToken) {
				console.error("No access token found.");
				toast.error("Authentication required");
				return;
			}

			const response = await fetch("/api/admin/investments", {
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			});

			if (!response.ok) {
				throw new Error("Failed to fetch investments");
			}

			const data = await response.json();
			setTableData(data.investments || []);
		} catch (error) {
			console.error("Error fetching investments:", error);
			toast.error("Failed to load investments");
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchInvestments();
	}, []);

	const columns: ColumnDef<Investment>[] = [
		{
			id: "select",
			header: ({ table }) => (
				<Checkbox
					checked={table.getIsAllPageRowsSelected()}
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
			enableSorting: false,
			enableHiding: false,
		},
		{
			accessorKey: "name",
			header: "Investment",
			cell: ({ row }) => (
				<div className="flex items-center gap-3">
					<Image
						src={row.original.image || "/images/default-investment.jpg"}
						alt={row.original.name}
						width="100"
						height="100"
						className="w-10 h-10 rounded-md object-cover"
					/>
					<span className="text-sm font-medium">{row.getValue("name")}</span>
				</div>
			),
		},
		{
			accessorKey: "unitPrice",
			header: "Unit Price",
			cell: ({ row }) => (
				<span className="text-sm">
					₦{(row.getValue("unitPrice") as number).toLocaleString()}
				</span>
			),
		},
		{
			accessorKey: "interestRate",
			header: "Interest Rate",
			cell: ({ row }) => (
				<span className="text-sm">{row.getValue("interestRate")}%</span>
			),
		},
		{
			accessorKey: "type",
			header: "Type",
			cell: ({ row }) => {
				const type = row.getValue("type");
				let typeClass = "";
				switch (type) {
					case "fixed":
						typeClass = "bg-green-100 text-green-800";
						break;
					case "flexible":
						typeClass = "bg-blue-100 text-blue-800";
						break;
					default:
						typeClass = "bg-gray-100 text-gray-800";
				}
				return (
					<span className={`px-2 py-1 rounded-full text-xs ${typeClass}`}>
						{String(row.getValue("type")).charAt(0).toUpperCase() +
							String(row.getValue("type")).slice(1)}
					</span>
				);
			},
		},
		{
			accessorKey: "maturityDate",
			header: "Maturity Date",
			cell: ({ row }) => (
				<span className="text-sm">
					{new Date(row.getValue("maturityDate")).toLocaleDateString()}
				</span>
			),
		},
		{
			accessorKey: "createdAt",
			header: "Created At",
			cell: ({ row }) => (
				<span className="text-sm">
					{new Date(row.getValue("createdAt")).toLocaleDateString()}
				</span>
			),
		},
		{
			id: "actions",
			header: "Actions",
			cell: ({ row }) => {
				const investment = row.original;

				return (
					<div className="flex space-x-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => handleEditInvestment(investment)}
							className="h-8 w-8 p-0">
							<IconEdit className="h-4 w-4" />
						</Button>
						<Button
							variant="destructive"
							size="sm"
							onClick={() => handleDeleteInvestment(investment._id)}
							className="h-8 w-8 p-0">
							<IconTrash className="h-4 w-4" />
						</Button>
					</div>
				);
			},
		},
	];

	const openModal = () => setModalOpen(true);
	const closeModal = () => {
		setModalOpen(false);
		setIsEditing(false);
		setEditingInvestment(null);
		setName("");
		setUnitPrice("");
		setInterestRate("");
		setType("fixed");
		setMaturityDate("");
		setImageFile(null);
		setPreviewImage(null);
	};

	const handleEditInvestment = (investment: Investment) => {
		setIsEditing(true);
		setEditingInvestment(investment);
		setName(investment.name);
		setUnitPrice(investment.unitPrice.toString());
		setInterestRate(investment.interestRate.toString());
		setType(investment.type);
		setMaturityDate(
			new Date(investment.maturityDate).toISOString().split("T")[0]
		);
		setPreviewImage(investment.image || null);
		setModalOpen(true);
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
		if (!name || !unitPrice || !interestRate || !type || !maturityDate) {
			toast.error("Please fill all required fields");
			return;
		}

		try {
			setIsSending(true);
			const session = await getSession();
			const accessToken = session?.accessToken;

			if (!accessToken) {
				console.error("No access token found.");
				toast.error("Authentication required");
				return;
			}

			// Prepare form data for image upload
			const formData = new FormData();
			formData.append("name", name);
			formData.append("unitPrice", unitPrice);
			formData.append("interestRate", interestRate);
			formData.append("type", "fixed");
			formData.append("maturityDate", maturityDate);

			if (imageFile) {
				formData.append("image", imageFile);
			}

			// ✅ include _id if editing
			if (isEditing && editingInvestment?._id) {
				formData.append("id", editingInvestment._id);
			}

			const url = "/api/admin/investments";
			const method = isEditing ? "PUT" : "POST";

			const response = await fetch(url, {
				method,
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
				body: formData,
			});

			const data = await response.json();

			if (!response.ok) {
				toast.error(
					data.error ||
						`Failed to ${isEditing ? "update" : "create"} investment`
				);
				return;
			}

			// Refresh the investments list
			fetchInvestments();
			toast.success(
				`Investment ${isEditing ? "updated" : "created"} successfully!`
			);
			closeModal();
		} catch (error) {
			console.error(
				`Error ${isEditing ? "updating" : "creating"} investment:`,
				error
			);
			toast.error("Something went wrong. Try again.");
		} finally {
			setIsSending(false);
		}
	};

	const handleDeleteInvestment = async (investmentId: string) => {
		if (!confirm("Are you sure you want to delete this investment?")) {
			return;
		}

		try {
			const session = await getSession();
			const accessToken = session?.accessToken;

			if (!accessToken) {
				console.error("No access token found.");
				toast.error("Authentication required");
				return;
			}

			const response = await fetch(
				`/api/admin/investments?id=${investmentId}`,
				{
					method: "DELETE",
					headers: {
						Authorization: `Bearer ${accessToken}`,
					},
				}
			);

			if (!response.ok) {
				throw new Error("Failed to delete investment");
			}

			// Refresh the investments list
			fetchInvestments();
			toast.success("Investment deleted successfully!");
		} catch (error) {
			console.error("Error deleting investment:", error);
			toast.error("Failed to delete investment");
		}
	};

	const bulkDeleteInvestments = async () => {
		const selectedIds = Object.keys(rowSelection).map(
			(index) => tableData[parseInt(index)]._id
		);

		if (selectedIds.length === 0) {
			toast.warn("No investments selected for deletion.");
			return;
		}

		if (
			!confirm(
				`Are you sure you want to delete ${selectedIds.length} selected investments?`
			)
		) {
			return;
		}

		try {
			const session = await getSession();
			const accessToken = session?.accessToken;

			if (!accessToken) {
				console.error("No access token found.");
				toast.error("Authentication required");
				return;
			}

			// Delete each selected investment
			for (const id of selectedIds) {
				const response = await fetch(`/api/admin/investments?id=${id}`, {
					method: "DELETE",
					headers: {
						Authorization: `Bearer ${accessToken}`,
					},
				});

				if (!response.ok) {
					throw new Error(`Failed to delete investment ${id}`);
				}
			}

			// Refresh the investments list
			fetchInvestments();
			setRowSelection({});
			toast.success("Selected investments deleted successfully!");
		} catch (error) {
			console.error("Error deleting investments:", error);
			toast.error("Failed to delete investments");
		}
	};

	const filterDataByDateRange = () => {
		if (!dateRange?.from || !dateRange?.to) {
			fetchInvestments(); // Reset to all investments
			return;
		}

		const filteredData = tableData.filter((item) => {
			const maturityDate = new Date(item.maturityDate);
			return maturityDate >= dateRange.from! && maturityDate <= dateRange.to!;
		});

		setTableData(filteredData);
	};

	const handleStatusFilter = (status: string) => {
		setSelectedStatus(status);

		if (status === "View All") {
			fetchInvestments(); // Reset to all investments
		} else {
			const filteredData = tableData.filter(
				(item) => item.type.toLowerCase() === status.toLowerCase()
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

	if (isLoading) {
		return (
			<div className="rounded-lg border-[1px] py-0">
				<div className="p-8 text-center">Loading investments...</div>
			</div>
		);
	}

	return (
		<div className="rounded-lg border-[1px] py-0">
			<Modal
				isOpen={isModalOpen}
				onClose={closeModal}
				title={isEditing ? "Edit Investment Plan" : "Add Investment Plan"}>
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
									<p className="text-xs text-primary-6">Unit Price (₦)</p>
									<Input
										type="number"
										placeholder="Enter unit price"
										className="focus:border-none mt-2"
										value={unitPrice}
										onChange={(e) => setUnitPrice(e.target.value)}
									/>
								</div>
								<div>
									<p className="text-xs text-primary-6">Interest Rate (%)</p>
									<Input
										type="number"
										placeholder="Enter interest rate"
										className="focus:border-none mt-2"
										value={interestRate}
										onChange={(e) => setInterestRate(e.target.value)}
									/>
								</div>
							</div>

							<div>
								<p className="text-xs text-primary-6">Maturity Date</p>
								<Input
									type="date"
									className="focus:border-none mt-2"
									value={maturityDate}
									onChange={(e) => setMaturityDate(e.target.value)}
								/>
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
								onClick={handleAddInvestment}
								disabled={isSending}>
								{isSending
									? isEditing
										? "Updating..."
										: "Adding..."
									: isEditing
									? "Update Investment"
									: "Add Investment"}
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
				<div className="p-3 flex flex-row justify-start items-center gap-3 w-full">
					<Input
						placeholder="Search investments..."
						value={globalFilter}
						onChange={(e) => setGlobalFilter(e.target.value)}
						className="focus:border-none bg-[#F9FAFB]"
					/>
					<Button
						className="border-[#E8E8E8] border-[1px] bg-white"
						onClick={bulkDeleteInvestments}
						disabled={Object.keys(rowSelection).length === 0}>
						<IconTrash /> Delete Selected
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
								No investment plans found.
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
