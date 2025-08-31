"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";

import Loader from "@/components/Loader";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { IconEye, IconTrash } from "@tabler/icons-react";
import axios from "axios";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { AuctionDataTable } from "./auction-table";

// This type is used to define the shape of our data.
export type Auction = {
	_id: string;
	auctionName: string;
	investmentName: string;
	reservePrice: number;
	currentBid: number;
	status: string;
	startDate: string;
	endDate: string;
	createdAt: string;
	updatedAt: string;
	bidsCount?: number;
};

declare module "next-auth" {
	interface Session {
		accessToken?: string;
	}
}

const AuctionTable = () => {
	const { data: session } = useSession();
	const accessToken = session?.accessToken;
	const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
	const [selectedRow, setSelectedRow] = useState<any>(null);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [tableData, setTableData] = useState<Auction[]>([]);
	const [statusFilter, setStatusFilter] = useState<string>("all");

	const openDeleteModal = (row: any) => {
		setSelectedRow(row.original);
		setDeleteModalOpen(true);
	};

	const closeDeleteModal = () => {
		setDeleteModalOpen(false);
	};

	// -------------- Fetch Auctions --------------
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

	// -------------- Delete Auction --------------
	const deleteAuction = async (id: string) => {
		if (!accessToken) return;

		try {
			await axios.delete(`/api/admin/auctions?auctionId=${id}`, {
				headers: { Authorization: `Bearer ${accessToken}` },
			});
			setTableData((prev) => prev.filter((auction) => auction._id !== id));
			toast.success("Auction deleted successfully.");
		} catch (error) {
			console.error("Error deleting auction:", error);
			toast.error("Failed to delete auction.");
		}
	};

	useEffect(() => {
		if (accessToken) {
			fetchAuctions();
		}
	}, [accessToken]);

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("en-NG", {
			style: "currency",
			currency: "NGN",
		}).format(amount);
	};

	const formatDate = (rawDate: string | Date) => {
		const options: Intl.DateTimeFormatOptions = {
			year: "numeric",
			month: "short",
			day: "numeric",
		};
		const parsedDate =
			typeof rawDate === "string" ? new Date(rawDate) : rawDate;
		return new Intl.DateTimeFormat("en-US", options).format(parsedDate);
	};

	// Filter auctions based on status
	const filteredAuctions =
		statusFilter === "all"
			? tableData
			: tableData.filter((auction) => auction.status === statusFilter);

	const columns: ColumnDef<Auction>[] = [
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
			accessorKey: "auctionName",
			header: "Auction Name",
			cell: ({ row }) => {
				const auction = row.original;
				return (
					<span className="text-xs text-black t-data">
						{auction.auctionName}
					</span>
				);
			},
		},
		{
			accessorKey: "investmentName",
			header: "Investment",
			cell: ({ row }) => {
				const investment = row.original.investmentName;
				return (
					<span className="text-xs text-primary-6 capitalize">
						{investment}
					</span>
				);
			},
		},
		{
			accessorKey: "reservePrice",
			header: "Reserve Price",
			cell: ({ row }) => {
				const price = row.original.reservePrice || 0;
				return (
					<span className="text-xs text-primary-6">
						{formatCurrency(price)}
					</span>
				);
			},
		},
		{
			accessorKey: "currentBid",
			header: "Current Bid",
			cell: ({ row }) => {
				const bid = row.original.currentBid || 0;
				return (
					<span className="text-xs text-primary-6">{formatCurrency(bid)}</span>
				);
			},
		},
		{
			accessorKey: "bidsCount",
			header: "Bids",
			cell: ({ row }) => {
				const bids = row.original.bidsCount || 0;
				return <span className="text-xs text-primary-6">{bids}</span>;
			},
		},
		{
			accessorKey: "startDate",
			header: "Start Date",
			cell: ({ row }) => {
				const date = row.original.startDate;
				return (
					<span className="text-xs text-primary-6">{formatDate(date)}</span>
				);
			},
		},
		{
			accessorKey: "endDate",
			header: "End Date",
			cell: ({ row }) => {
				const date = row.original.endDate;
				return (
					<span className="text-xs text-primary-6">{formatDate(date)}</span>
				);
			},
		},
		{
			accessorKey: "status",
			header: "Status",
			cell: ({ row }) => {
				const status = row.getValue<string>("status");

				const statusColors: Record<string, string> = {
					active: "status green",
					completed: "status blue",
					cancelled: "status red",
					pending: "status yellow",
				};

				return (
					<span
						className={`px-2 py-1 rounded-full text-xs font-medium ${
							statusColors[status] || "bg-gray-100 text-gray-600"
						}`}>
						{status}
					</span>
				);
			},
		},
		{
			id: "actions",
			header: "Action",
			cell: ({ row }) => {
				const auction = row.original;

				return (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								className="h-8 w-8 p-2 bg-white border-[1px] border-[#E8E8E8]">
								<span className="sr-only">Open menu</span>
								<MoreHorizontal className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="bg-white">
							<Link href={`/auctions/${auction._id}`}>
								<DropdownMenuItem className="action cursor-pointer hover:bg-secondary-3">
									<IconEye />
									<p className="text-xs font-inter">View Auction</p>
								</DropdownMenuItem>
							</Link>
							<DropdownMenuItem
								className="action cursor-pointer hover:bg-red-500"
								onClick={() => openDeleteModal(row)}>
								<IconTrash color="#F43F5E" />
								<p className="text-[#F43F5E] delete text-xs font-inter">
									Delete Auction
								</p>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				);
			},
		},
	];

	return (
		<>
			{/* Status Filter */}
			<div className="flex justify-between items-center mb-4">
				<h2 className="text-xl font-bold">Auctions Management</h2>
				<div className="flex items-center gap-2">
					<span className="text-sm">Filter by status:</span>
					<Select value={statusFilter} onValueChange={setStatusFilter}>
						<SelectTrigger className="w-32">
							<SelectValue placeholder="All statuses" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All</SelectItem>
							<SelectItem value="active">Active</SelectItem>
							<SelectItem value="completed">Completed</SelectItem>
							<SelectItem value="cancelled">Cancelled</SelectItem>
							<SelectItem value="pending">Pending</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			{isLoading ? (
				<Loader />
			) : (
				<AuctionDataTable
					columns={columns}
					data={filteredAuctions}
				/>
			)}

			{isDeleteModalOpen && (
				<Modal onClose={closeDeleteModal} isOpen={isDeleteModalOpen}>
					<p>
						Are you sure you want to delete the auction "
						{selectedRow?.auctionName}"?
					</p>
					<p className="text-sm text-primary-6">This action cannot be undone</p>
					<div className="flex flex-row justify-end items-center gap-3 font-inter mt-4">
						<Button
							className="border-[#E8E8E8] border-[1px] text-primary-6 text-xs"
							onClick={closeDeleteModal}>
							Cancel
						</Button>
						<Button
							className="bg-[#F04F4A] text-white font-inter text-xs modal-delete"
							onClick={async () => {
								await deleteAuction(selectedRow._id);
								closeDeleteModal();
							}}>
							Yes, Delete
						</Button>
					</div>
				</Modal>
			)}
		</>
	);
};

export default AuctionTable;
