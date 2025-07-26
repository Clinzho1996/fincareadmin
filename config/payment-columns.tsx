"use client";

import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	IconDownload,
	IconEye,
	IconPencil,
	IconTrash,
} from "@tabler/icons-react";
import { ColumnDef } from "@tanstack/react-table";
import axios from "axios";
import { ArrowUpDown } from "lucide-react";
import { getSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { PaymentDataTable } from "./payment-table";

export type Transactions = {
	id: string;
	dateTime: string;
	name: string;
	type: string;
	amount: string;
	walletBalance?: string;
	paymentMethod: string;
	referenceNumber?: string;
};

// Receipt Modal Component
const ReceiptModal = ({ transaction }: { transaction: Transactions }) => {
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button
					variant="ghost"
					className="h-8 w-8 p-0 text-primary hover:bg-transparent">
					<IconEye className="h-4 w-4" />
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-md bg-white rounded-lg">
				<div className="p-6">
					<DialogHeader className="mb-4">
						<DialogTitle className="text-2xl font-bold text-center">
							Payment details
						</DialogTitle>
					</DialogHeader>

					<div className="space-y-4 text-sm border-t border-dashed p-3">
						<div className="flex justify-between">
							<span className="text-gray-500">Reference number</span>
							<span className="font-medium">
								{transaction.referenceNumber || "1040560509605"}
							</span>
						</div>

						<div className="flex justify-between">
							<span className="text-gray-500">Customer name</span>
							<span className="font-medium">{transaction.name}</span>
						</div>

						<div className="flex justify-between">
							<span className="text-gray-500">Date</span>
							<span className="font-medium">
								{new Date(transaction.dateTime).toLocaleDateString()}
							</span>
						</div>

						<div className="flex justify-between">
							<span className="text-gray-500">Payment method</span>
							<span className="font-medium capitalize">
								{transaction.paymentMethod}
							</span>
						</div>

						<div className="flex justify-between border-t border-dashed p-3">
							<span className="text-gray-500">Amount</span>
							<span className="font-medium">{transaction.amount}</span>
						</div>
					</div>

					<div className="mt-6 flex justify-center">
						<Button className="flex items-center gap-2 bg-primary-1 hover:bg-primary-dark text-white">
							<IconDownload className="h-4 w-4" />
							Download PDF receipt
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};

const PaymentTable = () => {
	const [tableData, setTableData] = useState<Transactions[]>([]);
	const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
	const [isEditModalOpen, setEditModalOpen] = useState(false);
	const [selectedRow, setSelectedRow] = useState<any>(null);
	const [isLoading, setIsLoading] = useState<boolean>(false);

	const formattedAmount = (amount: number) => {
		return new Intl.NumberFormat("en-NG", {
			style: "currency",
			currency: "NGN",
		}).format(amount);
	};
	const openDeleteModal = (row: any) => {
		setSelectedRow(row.original);
		setDeleteModalOpen(true);
	};

	const closeDeleteModal = () => {
		setDeleteModalOpen(false);
	};

	const openEditModal = (row: any) => {
		setSelectedRow(row.original);
		setEditModalOpen(true);
	};

	const closeEditModal = () => {
		setEditModalOpen(false);
	};

	const fetchTransactionData = async () => {
		try {
			const session = await getSession();
			const accessToken = session?.accessToken;
			if (!accessToken) {
				console.error("No access token found.");
				return;
			}

			const response = await axios.get(
				`https://api.comicscrolls.com/api/v1/transaction/all`,
				{
					headers: {
						Accept: "application/json",
						Authorization: `Bearer ${accessToken}`,
					},
				}
			);

			if (response.data.status === "success") {
				const formattedData = response.data.data.map((transaction: any) => ({
					id: transaction.id,
					dateTime: transaction.created_at,
					name: transaction.narration,
					type: transaction.type,
					amount: `$${transaction.amount}`,
					paymentMethod: transaction.payment_method || "Bank transfer",
					status: "successful",
					referenceNumber: transaction.ref_id,
				}));

				setTableData(formattedData);
			}
		} catch (error) {
			console.error("Error fetching transaction data:", error);
		}
	};

	useEffect(() => {
		fetchTransactionData();
	}, []);

	const columns: ColumnDef<Transactions>[] = [
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
			accessorKey: "dateTime",
			header: "Date",
			cell: ({ row }) => {
				const date = row.getValue<string>("dateTime");

				return <span className="text-xs text-dark-1">{date}</span>;
			},
		},

		{
			accessorKey: "name",
			header: "Transaction ID",
			cell: ({ row }) => {
				const name = row.getValue<string>("name");

				return <span className="text-xs text-dark-1">{name}</span>;
			},
		},
		{
			accessorKey: "type",
			header: "Payment Type",
			cell: ({ row }) => {
				const type = row.getValue<string>("type");

				return <span className="text-xs text-dark-1 capitalize">{type}</span>;
			},
		},
		{
			accessorKey: "amount",
			header: "Amount",
			cell: ({ row }) => {
				const amount = row.getValue<string>("email") || "1200000";

				return (
					<span className="text-xs text-dark-1">
						{formattedAmount(Number(amount))}
					</span>
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
					<div
						className={`status ${
							status === "successful"
								? "green"
								: status === "processing"
								? "yellow"
								: "red"
						}`}>
						{status}
					</div>
				);
			},
		},
		{
			id: "actions",
			header: "Action",
			cell: ({ row }) => {
				const transaction = row.original;

				return (
					<div className="flex items-center gap-2">
						<ReceiptModal transaction={transaction} />
						<Button
							className="action cursor-pointer hover:bg-secondary-3 border"
							onClick={() => openEditModal(row)}>
							<IconPencil color="#000" />
						</Button>
						<Button
							className="action cursor-pointer hover:bg-secondary-3 border"
							onClick={() => openDeleteModal(row)}>
							<IconTrash color="#F43F5E" />
						</Button>
					</div>
				);
			},
		},
	];

	return (
		<>
			<PaymentDataTable columns={columns} data={tableData} />

			{isDeleteModalOpen && (
				<Modal onClose={closeDeleteModal} isOpen={isDeleteModalOpen}>
					<p>Are you sure you want to delete {selectedRow?.name}'s payment?</p>

					<p className="text-sm text-primary-6">This can't be undone</p>
					<div className="flex flex-row justify-end items-center gap-3 font-inter mt-4">
						<Button
							className="border-[#E8E8E8] border-[1px] text-primary-6 text-xs"
							onClick={closeDeleteModal}>
							Cancel
						</Button>
						<Button
							className="bg-[#F04F4A] text-white font-inter text-xs modal-delete"
							onClick={async () => {}}>
							Yes, Confirm
						</Button>
					</div>
				</Modal>
			)}

			{isEditModalOpen && (
				<Modal
					isOpen={isEditModalOpen}
					onClose={closeEditModal}
					title="Edit Payment">
					<div className="bg-white p-0 rounded-lg w-[600px] transition-transform ease-in-out form">
						<div className="mt-3 border-t-[1px] border-[#E2E4E9] pt-2">
							<div className="flex flex-col gap-2 mt-4">
								<p className="text-xs text-primary-6">Amount</p>
								<Input
									type="text"
									placeholder="Enter amount"
									className="focus:border-none mt-2"
								/>
								<p className="text-xs text-primary-6">Date</p>
								<Input
									type="date"
									placeholder="Enter date"
									className="focus:border-none mt-2"
								/>
								<p className="text-xs text-primary-6 mt-2">Payment Type</p>
								<Select>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Select Type" />
									</SelectTrigger>
									<SelectContent className="bg-white z-10 select text-gray-300">
										<SelectItem value="light">Online Payment</SelectItem>
										<SelectItem value="dark">Offline Payment</SelectItem>
									</SelectContent>
								</Select>
								<p className="text-xs text-primary-6 mt-2">Account Number</p>
								<Input
									type="text"
									placeholder="Enter account number"
									className="focus:border-none mt-2"
								/>
								<p className="text-xs text-primary-6 mt-2">Bank Name</p>
								<Select>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Select Bank" />
									</SelectTrigger>
									<SelectContent className="bg-white z-10 select text-gray-300">
										<SelectItem value="light">FCMB</SelectItem>
										<SelectItem value="dark">UBA</SelectItem>
									</SelectContent>
								</Select>
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
									disabled={isLoading}>
									{isLoading ? "Updating Payment..." : "Update Payment"}
								</Button>
							</div>
						</div>
					</div>
				</Modal>
			)}
		</>
	);
};

export default PaymentTable;
