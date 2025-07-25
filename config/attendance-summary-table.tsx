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
import axios from "axios";
import {
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
} from "lucide-react";
import { getSession } from "next-auth/react";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { DateRange } from "react-day-picker";
import { toast } from "react-toastify";

interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
}

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

export function AttendanceSummaryDataTable<TData, TValue>({
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
	const [isNewFineModalOpen, setNewFineModalOpen] = useState(false);
	const [isModalOpen, setModalOpen] = useState(false);
	const [tableData, setTableData] = useState<TData[]>(data);
	const [isLoading, setIsLoading] = useState(false);

	const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

	// State for form inputs
	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [email, setEmail] = useState("");
	const [staffId, setStaffId] = useState("");
	const [role, setRole] = useState("super_admin");

	const openModal = () => setModalOpen(true);
	const closeModal = () => setModalOpen(false);

	const openNewFineModal = () => setNewFineModalOpen(true);
	const closeNewFineModal = () => setNewFineModalOpen(false);

	// Sync `tableData` with `data` prop
	useEffect(() => {
		setTableData(data);
	}, [data]);

	// Function to filter data based on date range
	const filterDataByDateRange = () => {
		if (!dateRange?.from || !dateRange?.to) {
			setTableData(data); // Reset to all data
			return;
		}

		const filteredData = data.filter((farmer: any) => {
			const dateJoined = new Date(farmer.date);
			return dateJoined >= dateRange.from! && dateJoined <= dateRange.to!;
		});

		setTableData(filteredData);
	};

	useEffect(() => {
		filterDataByDateRange();
	}, [dateRange]);

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

			const response = await axios.get<{
				status: string;
				message: string;
				data: ApiResponse[];
			}>("https://api.wowdev.com.ng/api/v1/user", {
				headers: {
					Accept: "application/json",
					Authorization: `Bearer ${accessToken}`,
				},
			});

			const fetchedData = response.data.data;

			console.log("Staff Data:", fetchedData);

			// Map the API response to match the `Staff` type
			const mappedData = fetchedData.map((item) => ({
				id: item.id,
				name: `${item.first_name} ${item.last_name}` || "N/A",
				date: item.created_at,
				role: item.role,
				staff: item.staff_code,
				status: item.is_active ? "active" : "inactive",
				email: item.email,
			}));

			console.log("Mapped Data:", mappedData);
			setTableData(mappedData as TData[]);
		} catch (error) {
			console.error("Error fetching user data:", error);
		} finally {
			setIsLoading(false);
		}
	};

	const handleAddStaff = async () => {
		setIsLoading(true);
		try {
			const session = await getSession();
			const accessToken = session?.accessToken;

			if (!accessToken) {
				console.error("No access token found.");
				return;
			}

			const payload = {
				staff_code: staffId,
				first_name: firstName,
				last_name: lastName,
				email: email,
				role: role,
			};

			const response = await axios.post(
				"https://api.wowdev.com.ng/api/v1/user/create",
				payload,
				{
					headers: {
						Accept: "application/json",
						Authorization: `Bearer ${accessToken}`,
					},
				}
			);

			if (response.status === 200 || response.status === 201) {
				await fetchStaffs();

				toast.success("Staff member added successfully!");

				// Close the modal and reset form fields
				closeModal();
				setFirstName("");
				setLastName("");
				setEmail(" ");
				setStaffId("");
				setRole("super_admin");
			}
		} catch (error: unknown) {
			if (axios.isAxiosError(error)) {
				console.log(
					"Error Adding Staff:",
					error.response?.data || error.message
				);
				toast.error(
					error.response?.data?.message ||
						"An error occurred. Please try again."
				);
			} else {
				console.log("Unexpected error:", error);
				toast.error("Unexpected error occurred.");
			}
		} finally {
			setIsLoading(false);
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
			<Modal isOpen={isModalOpen} onClose={closeModal} title="Issue Fine">
				<div className="bg-white p-0 rounded-lg w-[600px] transition-transform ease-in-out form">
					<div className="mt-3  pt-2">
						<div className="flex flex-col gap-2">
							<p className="text-xs text-primary-6">Staff</p>
							<Input
								type="text"
								placeholder="Select Staff"
								className="focus:border-none mt-2"
								value={firstName}
								onChange={(e) => setFirstName(e.target.value)}
							/>
							<p className="text-xs text-primary-6 mt-2">Fine</p>
							<Input
								type="text"
								placeholder="Select the fine you want to issue"
								className="focus:border-none mt-2"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
							/>
							<p className="text-xs text-primary-6 mt-2">Amount</p>
							<Input
								type="text"
								placeholder="Enter Amount"
								className="focus:border-none mt-2"
								value={lastName}
								onChange={(e) => setLastName(e.target.value)}
							/>
							<p className="text-xs text-primary-6 mt-2">Reason</p>
							<textarea
								placeholder="Enter Reason"
								className="flex w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
								value={lastName}
								onChange={(e) => setLastName(e.target.value)}
							/>
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
								onClick={handleAddStaff}
								disabled={isLoading}>
								{isLoading ? "Issuing..." : "Issue fine"}
							</Button>
						</div>
					</div>
				</div>
			</Modal>
			<Modal
				isOpen={isNewFineModalOpen}
				onClose={closeNewFineModal}
				title="New Fine">
				<div className="bg-white p-0 rounded-lg w-[600px] transition-transform ease-in-out form">
					<div className="mt-3  pt-2">
						<div className="flex flex-col gap-2">
							<p className="text-xs text-primary-6">Fine</p>
							<Input
								type="text"
								placeholder="Enter fine name"
								className="focus:border-none mt-2"
								value={firstName}
								onChange={(e) => setFirstName(e.target.value)}
							/>
							<p className="text-xs text-primary-6 mt-2">Amount</p>
							<Input
								type="text"
								placeholder="Enter Amount"
								className="focus:border-none mt-2"
								value={lastName}
								onChange={(e) => setLastName(e.target.value)}
							/>
						</div>
						<hr className="mt-4 mb-4 text-[#9F9E9E40]" color="#9F9E9E40" />
						<div className="flex flex-row justify-end items-center gap-3 font-inter">
							<Button
								className="border-[#E8E8E8] border-[1px] text-primary-6 text-xs"
								onClick={closeNewFineModal}>
								Cancel
							</Button>
							<Button
								className="bg-primary-1 text-white font-inter text-xs"
								onClick={handleAddStaff}
								disabled={isLoading}>
								{isLoading ? "Adding..." : "Add fine"}
							</Button>
						</div>
					</div>
				</div>
			</Modal>

			<div className="p-3 flex flex-col justify-between  bg-white items-center max-w-full rounded-lg">
				<div className="p-3 flex flex-row justify-between items-center gap-3 w-full  border-b">
					<div className="flex flex-row gap-2 justify-start items-center">
						<p className="text-dark-1 font-medium text-lg">
							Attendance Summary
						</p>
						<div className="border-[1px] border-[#96BBD2] rounded-lg px-2 py-1 flex items-center gap-2 bg-[#ECF3F8]">
							<p className="text-primary-1 font-medium text-xs">This week</p>
						</div>
					</div>
					<div>
						<Link href="#" className="text-primary-1 font-medium text-sm">
							View full summary
						</Link>
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
