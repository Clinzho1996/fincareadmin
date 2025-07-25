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

import { Button } from "@/components/ui/button";

import Modal from "@/components/Modal";
import TabCard from "@/components/TabCard";
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
import { IconPlus } from "@tabler/icons-react";
import axios from "axios";
import {
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
} from "lucide-react";
import { getSession } from "next-auth/react";
import Image from "next/image";
import React, { useCallback, useEffect, useState } from "react";
import { DateRange } from "react-day-picker";
import { toast } from "react-toastify";

interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
}

export type Categories = {
	id: string;
	image: string;
	name: string;
	created_at: string;
};

interface ApiResponse {
	status: string;
	data: {
		id: string;
		name: string;
		image: string;
		created_at: string;
		updated_at: string;
	}[];
}
export function RolesDataTable<TData, TValue>({
	columns,
	data,
}: DataTableProps<TData, TValue>) {
	const [sorting, setSorting] = React.useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
		[]
	);
	const [columnVisibility, setColumnVisibility] =
		React.useState<VisibilityState>({});
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
	const [globalFilter, setGlobalFilter] = useState("");
	const [isModalOpen, setModalOpen] = useState(false);
	const [featuredImage, setFeaturedImage] = useState<File | null>(null);
	const [previewImage, setPreviewImage] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [tableData, setTableData] = useState<TData[]>(data);
	const [name, setName] = useState("");
	const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

	const openModal = () => setModalOpen(true);
	const closeModal = () => setModalOpen(false);

	const filterDataByDateRange = () => {
		if (!dateRange?.from || !dateRange?.to) {
			setTableData(data); // Reset to all data if no date range is selected
			return;
		}

		const filteredData = data.filter((readers: any) => {
			const dateJoined = new Date(readers.created_at);
			return dateJoined >= dateRange.from! && dateJoined <= dateRange.to!;
		});

		setTableData(filteredData);
	};

	// Update the table data whenever the date range changes
	React.useEffect(() => {
		filterDataByDateRange();
	}, [dateRange]);

	useEffect(() => {
		setTableData(data);
	}, [data]);

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0] || null;
		setFeaturedImage(file);

		if (file) {
			const reader = new FileReader();
			reader.onloadend = () => {
				setPreviewImage(reader.result as string);
			};
			reader.readAsDataURL(file);
		} else {
			setPreviewImage(null);
		}
	};

	const formatDate = (rawDate?: string | Date) => {
		if (!rawDate) return "Unknown"; // Handle undefined case
		const options: Intl.DateTimeFormatOptions = {
			year: "numeric",
			month: "long",
			day: "numeric",
		};
		const parsedDate =
			typeof rawDate === "string" ? new Date(rawDate) : rawDate;
		return new Intl.DateTimeFormat("en-US", options).format(parsedDate);
	};

	const fetchCategories = useCallback(async () => {
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
				`https://api.comicscrolls.com/api/v1/genre`,
				{
					headers: {
						Accept: "application/json",
						Authorization: `Bearer ${accessToken}`,
					},
				}
			);

			if (response.data.status === "success") {
				const formattedData = response.data.data.map((item) => ({
					id: item.id,
					name: item.name,
					image: item.image,
					created_at: formatDate(item.created_at),
				}));
				setTableData(formattedData as TData[]);
			}
		} catch (error: unknown) {
			if (axios.isAxiosError(error)) {
				console.error(
					"Error fetching categories:",
					error.response?.data || error.message
				);
			} else {
				console.error("Unexpected error fetching categories:", error);
			}
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchCategories();
	}, [fetchCategories]);

	const handleCreateGenre = async () => {
		setIsLoading(true);
		try {
			const session = await getSession();
			const accessToken = session?.accessToken;

			if (!accessToken) {
				console.error("No access token found.");
				toast.error("Authentication failed.");
				setIsLoading(false);
				return;
			}

			const formData = new FormData();
			formData.append("name", name);
			if (featuredImage) {
				formData.append("image", featuredImage);
			}

			const response = await axios.post(
				`https://api.comicscrolls.com/api/v1/genre`,
				formData,
				{
					headers: {
						Accept: "application/json",
						Authorization: `Bearer ${accessToken}`,
						"Content-Type": "multipart/form-data",
					},
				}
			);

			if (response.data.status === "success") {
				toast.success("Genre created successfully.");

				await fetchCategories();
				closeModal();
			} else {
				toast.error("Failed to create genre.");
			}
		} catch (error: unknown) {
			if (axios.isAxiosError(error)) {
				console.error(
					"Error creating genre:",
					error.response?.data || error.message
				);
				toast.error(`${error?.response?.data.message}`);
			} else {
				console.error("Unexpected error creating genre:", error);
				toast.error("An unexpected error occurred.");
			}
		} finally {
			setIsLoading(false);
		}
	};

	const handleDelete = () => {
		const selectedRowIds = Object.keys(rowSelection).filter(
			(key) => rowSelection[key]
		);
		const filteredData = tableData.filter(
			(_, index) => !selectedRowIds.includes(index.toString())
		);
		setTableData(filteredData);
		setRowSelection({});
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
			<Modal
				isOpen={isModalOpen}
				className="category"
				onClose={closeModal}
				title="Create New Role">
				<div className="bg-white py-1 rounded-lg transition-transform ease-in-out max-h[70vh]">
					<div className=" border-t-[1px] border-[#E2E4E9] pt-2">
						<div className="mt-2">
							<p className="text-xs text-dark-1 font-inter">Name of Role</p>
							<Input
								value={name}
								placeholder="Enter role name"
								onChange={(e) => setName(e.target.value)}
								type="text"
								className="focus:border-none mt-2 h-10 w-full"
							/>
						</div>

						<div className="mt-4">
							<p className="text-xs text-dark-1 font-inter">Permissions</p>
							<Input
								value={name}
								placeholder="Enter role permissions"
								onChange={(e) => setName(e.target.value)}
								type="text"
								className="focus:border-none mt-2 h-10 w-full"
							/>
						</div>
						<div className="flex flex-row justify-end items-center gap-3 font-inter mt-4">
							<Button
								className="border-gray-300 bg-[#6B728033] border-[1px] text-dark-1 text-xs px-4 py-1"
								onClick={closeModal}>
								Cancel
							</Button>
							<Button
								className="bg-primary-1 text-white font-inter text-xs px-4 py-1"
								onClick={handleCreateGenre}
								disabled={isLoading}>
								{isLoading ? "Creating..." : "Create Role"}
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
				<div>
					<div className="flex flex-row justify-start items-center gap-2">
						<Image
							src="/images/user.png"
							alt="staff management"
							height={20}
							width={20}
						/>
						<p className="text-sm text-dark-1 font-medium font-inter">
							Category Management
						</p>
					</div>

					<p className="text-xs text-dark-1 mt-3">
						The process of planning, organizing, and directing cloudwash's
						categories within an organization.
					</p>
				</div>
			</div>

			<div className="p-3 flex flex-row justify-between border-b-[1px] border-[#E2E4E9] bg-white items-center gap-20 max-w-full">
				<div className="p-3 flex flex-row justify-between items-center gap-3 w-full ">
					{/* filter by type */}
					<div>
						<TabCard
							title="Total Roles"
							value={tableData.length}
							icon="/images/all.png"
						/>
					</div>
					<div className="p-3 flex flex-row justify-end items-center gap-3 w-full ">
						<div className="w-[250px]">
							<DateRangePicker dateRange={dateRange} onSelect={setDateRange} />
						</div>
						<Button
							className="bg-primary-1 text-white font-inter"
							onClick={openModal}>
							Add New Role <IconPlus />
						</Button>
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
								className="h-24 text-left text-xs text-dark-1">
								No results.
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
			<div className="flex items-center justify-between bg-white rounded-lg py-3 px-2 border-t-[1px] border-gray-300 mt-2">
				<div className="flex-1 text-xs text-dark-1 text-muted-foreground">
					{table.getFilteredSelectedRowModel().rows.length} of{" "}
					{table.getFilteredRowModel().rows.length} row(s) selected.
				</div>
				<div className="flex items-center space-x-10 lg:space-x-10 gap-3">
					<div className="flex items-center space-x-4 gap-2">
						<p className="text-xs text-dark-1 font-medium">Rows per page</p>
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
					<div className="flex w-[100px] items-center justify-center font-medium text-xs text-dark-1">
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
