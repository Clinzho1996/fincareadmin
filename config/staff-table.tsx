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
import React, { useEffect, useState } from "react";
import { DateRange } from "react-day-picker";
import { toast } from "react-toastify";

interface Staff {
	_id: string;
	firstName: string;
	lastName: string;
	email: string;
	role: string;
	staffCode: string;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
}

export function StaffDataTable<TData, TValue>({
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
	const [selectedStatus, setSelectedStatus] = useState<string>("View All");
	const [showPasswordModal, setShowPasswordModal] = useState(false);
	const [generatedPassword, setGeneratedPassword] = useState("");
	const [globalFilter, setGlobalFilter] = useState("");
	const [isModalOpen, setModalOpen] = useState(false);
	const [isEditModalOpen, setEditModalOpen] = useState(false);
	const [tableData, setTableData] = useState<TData[]>(data);
	const [isLoading, setIsLoading] = useState(false);
	const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

	// Form state
	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [email, setEmail] = useState("");
	const [role, setRole] = useState("admin");
	const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
	const [password, setPassword] = useState("");

	// Sync `tableData` with `data` prop
	useEffect(() => {
		setTableData(data);
	}, [data]);

	const openModal = () => setModalOpen(true);
	const closeModal = () => {
		setModalOpen(false);
		resetForm();
	};

	const closeEditModal = () => {
		setEditModalOpen(false);
		setEditingStaff(null);
		resetForm();
	};

	const resetForm = () => {
		setFirstName("");
		setLastName("");
		setEmail("");
		setRole("admin");
		setPassword("");
	};

	const fetchStaff = async () => {
		try {
			setIsLoading(true);
			const session = await getSession();
			const accessToken = session?.accessToken;

			if (!accessToken) {
				console.error("No access token found.");
				return;
			}

			const response = await fetch("/api/admin/users", {
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			});

			if (!response.ok) {
				throw new Error("Failed to fetch staff");
			}

			const data = await response.json();
			setTableData(data.users || []);
		} catch (error) {
			console.error("Error fetching staff:", error);
			toast.error("Failed to load staff data");
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
				toast.error("Authentication required");
				return;
			}

			const payload = {
				first_name: firstName,
				last_name: lastName,
				email: email,
				role: role,
				password: password || undefined,
			};

			const response = await fetch("/api/admin/users", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${accessToken}`,
				},
				body: JSON.stringify(payload),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to add staff");
			}

			// Check if email was sent successfully
			if (data.data.plainPassword) {
				// Email failed - show password in UI
				setGeneratedPassword(data.data.plainPassword);
				setShowPasswordModal(true);
				toast.warning(
					"Staff added but email failed. Please provide the password manually."
				);
			} else {
				// Email succeeded
				toast.success(
					"Staff member added successfully! Password sent via email."
				);
				closeModal();
			}

			fetchStaff(); // Refresh the list
		} catch (error: any) {
			console.error("Error adding staff:", error);
			toast.error(error.message || "An error occurred. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	const handleUpdateStaff = async () => {
		if (!editingStaff) return;

		setIsLoading(true);
		try {
			const session = await getSession();
			const accessToken = session?.accessToken;

			if (!accessToken) {
				toast.error("Authentication required");
				return;
			}

			const payload = {
				firstName,
				lastName,
				email,
				role,
				...(password && { password }), // Only include password if provided
			};

			const response = await fetch(`/api/admin/users?id=${editingStaff._id}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${accessToken}`,
				},
				body: JSON.stringify(payload),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to update staff");
			}

			toast.success("Staff member updated successfully!");
			closeEditModal();
			fetchStaff(); // Refresh the list
		} catch (error: any) {
			console.error("Error updating staff:", error);
			toast.error(error.message || "An error occurred. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	const bulkDeleteStaff = async () => {
		const selectedIds = Object.keys(rowSelection).map(
			(index) => (tableData[parseInt(index)] as any)?._id
		);

		if (selectedIds.length === 0) {
			toast.warn("No staff selected for deletion.");
			return;
		}

		if (
			!confirm(
				`Are you sure you want to delete ${selectedIds.length} selected staff members?`
			)
		) {
			return;
		}

		try {
			const session = await getSession();
			const accessToken = session?.accessToken;

			if (!accessToken) {
				toast.error("Authentication required");
				return;
			}

			// Delete each selected staff member
			for (const id of selectedIds) {
				const response = await fetch(`/api/admin/users?id=${id}`, {
					method: "DELETE",
					headers: {
						Authorization: `Bearer ${accessToken}`,
					},
				});

				if (!response.ok) {
					throw new Error(`Failed to delete staff member ${id}`);
				}
			}

			toast.success("Selected staff members deleted successfully!");
			setRowSelection({});
			fetchStaff(); // Refresh the list
		} catch (error: any) {
			console.error("Error bulk deleting staff:", error);
			toast.error(error.message || "Failed to delete staff members");
		}
	};

	const handleStatusFilter = (status: string) => {
		setSelectedStatus(status);

		if (status === "View All") {
			setTableData(data);
		} else {
			const filteredData = data.filter(
				(staff: any) => staff.isActive === (status === "Active")
			);
			setTableData(filteredData as TData[]);
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
			{/* Add Staff Modal */}
			<Modal isOpen={isModalOpen} onClose={closeModal} title="Add Admin User">
				<div className="bg-white p-0 rounded-lg transition-transform ease-in-out form">
					<div className="mt-3 pt-2">
						<div className="flex flex-col gap-4">
							<div>
								<p className="text-xs text-primary-6">First Name</p>
								<Input
									type="text"
									placeholder="Enter First Name"
									className="focus:border-none mt-1"
									value={firstName}
									onChange={(e) => setFirstName(e.target.value)}
								/>
							</div>

							<div>
								<p className="text-xs text-primary-6">Last Name</p>
								<Input
									type="text"
									placeholder="Enter Last Name"
									className="focus:border-none mt-1"
									value={lastName}
									onChange={(e) => setLastName(e.target.value)}
								/>
							</div>

							<div>
								<p className="text-xs text-primary-6">Email Address</p>
								<Input
									type="email"
									placeholder="Enter Email Address"
									className="focus:border-none mt-1"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
								/>
							</div>

							<div>
								<p className="text-xs text-primary-6">Password</p>
								<Input
									type="password"
									placeholder="Enter Password (optional)"
									className="focus:border-none mt-1"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
								/>
							</div>

							<div>
								<p className="text-xs text-primary-6">Role</p>
								<Select value={role} onValueChange={setRole}>
									<SelectTrigger className="w-full mt-1">
										<SelectValue placeholder="Select Role" />
									</SelectTrigger>
									<SelectContent className="bg-white z-10">
										<SelectItem value="super_admin">Super Admin</SelectItem>
										<SelectItem value="admin">Admin</SelectItem>
										<SelectItem value="support">Support</SelectItem>
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
								onClick={handleAddStaff}
								disabled={isLoading}>
								{isLoading ? "Adding User..." : "Add User"}
							</Button>
						</div>
					</div>
				</div>
			</Modal>

			{/* Password Display Modal */}
			<Modal
				isOpen={showPasswordModal}
				onClose={() => setShowPasswordModal(false)}
				title="Staff Account Created">
				<div className="bg-white p-4 rounded-lg">
					<p className="text-sm text-gray-600 mb-4">
						The staff account was created successfully, but we couldn't send the
						welcome email. Please provide this password to the user manually:
					</p>

					<div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
						<p className="text-xs text-yellow-800 font-semibold mb-1">
							Generated Password:
						</p>
						<div className="flex items-center justify-between">
							<code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
								{generatedPassword}
							</code>
							<Button
								size="sm"
								variant="outline"
								onClick={() => {
									navigator.clipboard.writeText(generatedPassword);
									toast.success("Password copied to clipboard");
								}}>
								Copy
							</Button>
						</div>
					</div>

					<p className="text-xs text-gray-500 mb-4">
						For security reasons, the user should change this password after
						first login.
					</p>

					<div className="flex justify-end">
						<Button
							onClick={() => {
								setShowPasswordModal(false);
								setGeneratedPassword("");
								closeModal();
							}}
							className="bg-primary-1 text-white">
							OK
						</Button>
					</div>
				</div>
			</Modal>

			{/* Edit Staff Modal */}
			<Modal
				isOpen={isEditModalOpen}
				onClose={closeEditModal}
				title="Edit Admin User">
				<div className="bg-white p-0 rounded-lg transition-transform ease-in-out form">
					<div className="mt-3 pt-2">
						<div className="flex flex-col gap-4">
							<div>
								<p className="text-xs text-primary-6">First Name</p>
								<Input
									type="text"
									placeholder="Enter First Name"
									className="focus:border-none mt-1"
									value={firstName}
									onChange={(e) => setFirstName(e.target.value)}
								/>
							</div>

							<div>
								<p className="text-xs text-primary-6">Last Name</p>
								<Input
									type="text"
									placeholder="Enter Last Name"
									className="focus:border-none mt-1"
									value={lastName}
									onChange={(e) => setLastName(e.target.value)}
								/>
							</div>

							<div>
								<p className="text-xs text-primary-6">Email Address</p>
								<Input
									type="email"
									placeholder="Enter Email Address"
									className="focus:border-none mt-1"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
								/>
							</div>

							<div>
								<p className="text-xs text-primary-6">
									New Password (optional)
								</p>
								<Input
									type="password"
									placeholder="Enter new password to update"
									className="focus:border-none mt-1"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
								/>
							</div>

							<div>
								<p className="text-xs text-primary-6">Role</p>
								<Select value={role} onValueChange={setRole}>
									<SelectTrigger className="w-full mt-1 select">
										<SelectValue placeholder="Select Role" />
									</SelectTrigger>
									<SelectContent className="bg-white select option">
										<SelectItem value="super_admin">Super Admin</SelectItem>
										<SelectItem value="admin">Admin</SelectItem>
										<SelectItem value="support">Support</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						<hr className="mt-4 mb-4 text-[#9F9E9E40]" color="#9F9E9E40" />
						<div className="flex flex-row justify-end items-center gap-3 font-inter">
							<Button
								className="border-[#E8E8E8] border-[1px] text-primary-6 text-xs"
								onClick={closeEditModal}>
								Cancel
							</Button>
							<Button
								className="bg-primary-1 text-white font-inter text-xs"
								onClick={handleUpdateStaff}
								disabled={isLoading}>
								{isLoading ? "Updating User..." : "Update User"}
							</Button>
						</div>
					</div>
				</div>
			</Modal>

			<div className="p-3 flex flex-row justify-between border-b-[1px] border-[#E2E4E9] bg-white items-center gap-20 max-w-full rounded-lg">
				<div className="p-3 flex flex-row justify-start items-center gap-3 w-full">
					<Input
						placeholder="Search Staff..."
						value={globalFilter}
						onChange={(e) => setGlobalFilter(e.target.value)}
						className="focus:border-none bg-[#F9FAFB] w-full"
					/>

					<div className="w-[250px]">
						<DateRangePicker dateRange={dateRange} onSelect={setDateRange} />
					</div>

					{Object.keys(rowSelection).length > 0 && (
						<Button
							variant="destructive"
							onClick={bulkDeleteStaff}
							disabled={isLoading}>
							<IconTrash /> Delete Selected
						</Button>
					)}

					<Button
						className="bg-primary-1 text-white font-inter"
						onClick={openModal}
						disabled={isLoading}>
						<IconPlus /> Add New Staff
					</Button>
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
								No staff members found.
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
