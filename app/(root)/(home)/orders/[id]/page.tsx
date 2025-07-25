"use client";
import HeaderBox from "@/components/HeaderBox";
import Loader from "@/components/Loader";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Readers } from "@/config/columns";
import axios from "axios";
import { ChevronDown } from "lucide-react";
import { getSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface ApiResponse {
	data: Readers;
}
function OrderDetails() {
	const { id } = useParams();
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [userData, setUserData] = useState<Readers | null>(null);
	const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
	const [isDisputeModalOpen, setDisputeModalOpen] = useState(false);
	const [isBillModalOpen, setBillModalOpen] = useState(false);

	const openDeleteModal = () => {
		setDeleteModalOpen(true);
	};

	const openBillModal = () => {
		setBillModalOpen(true);
	};

	const openDisputeModal = () => {
		setDisputeModalOpen(true);
	};

	const closeDeleteModal = () => {
		setDeleteModalOpen(false);
	};

	const closeDisputeModal = () => {
		setDisputeModalOpen(false);
	};

	const closeBillModal = () => {
		setBillModalOpen(false);
	};

	const fetchReaders = useCallback(async () => {
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
				`https://api.comicscrolls.com/api/v1/user/${id}`,
				{
					headers: {
						Accept: "application/json",
						redirect: "follow",
						Authorization: `Bearer ${accessToken}`,
					},
				}
			);

			console.log("data", response?.data?.data);
			setUserData(response?.data?.data);
			setIsLoading(false);
		} catch (error: unknown) {
			if (axios.isAxiosError(error)) {
				console.log(
					"Error fetching post:",
					error.response?.data || error.message
				);
			} else {
				console.log("Unexpected error:", error);
			}
		} finally {
			setIsLoading(false);
		}
	}, [id]);

	useEffect(() => {
		fetchReaders();
	}, [fetchReaders]);

	const handleStatusChange = (status: string) => {
		// Implement your status change logic here
		console.log("Status changed to:", status);
		// You might want to make an API call here to update the status
	};

	if (isLoading) {
		return <Loader />;
	}
	return (
		<div className="mx-auto font-sans text-gray-800 w-full ">
			<HeaderBox title="Order Details" />

			{isDeleteModalOpen && (
				<Modal
					onClose={closeDeleteModal}
					isOpen={isDeleteModalOpen}
					className="form">
					<p>Are you sure you want to cancel this order ?</p>

					<p className="text-sm text-primary-6">This can&apos;t be undone</p>
					<div className="flex flex-row justify-end items-center gap-3 font-inter mt-4">
						<Button
							className="border-[#E8E8E8] border-[1px] text-primary-6 text-xs"
							onClick={closeDeleteModal}>
							Cancel
						</Button>
						<Button
							className="bg-[#F04F4A] text-white font-inter text-xs modal-delete"
							onClick={async () => {
								closeDeleteModal();
							}}>
							Yes, Confirm
						</Button>
					</div>
				</Modal>
			)}

			{isDisputeModalOpen && (
				<Modal
					onClose={closeDisputeModal}
					isOpen={isDisputeModalOpen}
					className="form"
					title="Raise a Dispute">
					<p>Dispute</p>

					<textarea
						name="message"
						id="message"
						placeholder="Type your message here"
						cols={30}
						rows={10}
						className="w-full border-[1px] border-[#E8E8E8] mt-4 p-3 rounded-lg"></textarea>
					<div className="flex flex-row justify-end items-center gap-3 font-inter mt-4">
						<Button
							className="border-[#E8E8E8] border-[1px] text-primary-6 text-xs"
							onClick={closeDisputeModal}>
							Cancel
						</Button>
						<Button
							className="bg-primary-1 text-white font-inter text-xs modal-delete"
							onClick={async () => {
								closeDisputeModal();
							}}>
							Raise Dispute
						</Button>
					</div>
				</Modal>
			)}

			{isBillModalOpen && (
				<Modal
					onClose={closeBillModal}
					isOpen={isBillModalOpen}
					className="form"
					title="Set Bill">
					<div className="flex flex-col mt-3">
						<p className="text-sm pb-2">Customer Name</p>

						<Input
							className="focus:border-none bg-[#F9FAFB]"
							placeholder="Enter Customer Name"
						/>
					</div>

					<div className="flex flex-col mt-3">
						<p className="text-sm pb-2">Staff ID</p>

						<Input
							className="focus:border-none bg-[#F9FAFB]"
							placeholder="Enter Staff ID"
						/>
					</div>

					<div className="flex flex-col mt-3">
						<p className="text-sm pb-2">Payment Method</p>

						<Input
							className="focus:border-none bg-[#F9FAFB]"
							placeholder="Wallet"
						/>
					</div>

					<div className="flex flex-col mt-3">
						<p className="text-sm pb-2">Order Type</p>

						<Input
							className="focus:border-none bg-[#F9FAFB]"
							placeholder="Pick up and drop off"
						/>
					</div>

					<div className="flex flex-col mt-3">
						<p className="text-sm pb-2">Date</p>

						<Input
							type="date"
							className="focus:border-none bg-[#F9FAFB]"
							placeholder="Enter Customer Name"
						/>
					</div>

					<div className="flex flex-col mt-3">
						<p className="text-sm pb-2">Discount</p>

						<Input className="focus:border-none bg-[#F9FAFB]" placeholder="%" />
					</div>
					<div className="flex flex-row justify-between items-center mt-4">
						<p className="text-gray-500 text-sm">VAT</p>
						<p className="text-dark-1 text-sm font-semibold">2.5%</p>
					</div>

					<div className="flex flex-row justify-between items-center mt-4">
						<p className="text-gray-500 text-sm">Total</p>
						<p className="text-dark-1 text-sm font-semibold">$200</p>
					</div>
					<div className="flex flex-row justify-end items-center gap-3 font-inter mt-4">
						<Button
							className="border-[#E8E8E8] border-[1px] text-primary-6 text-xs"
							onClick={closeBillModal}>
							Cancel
						</Button>
						<Button
							className="bg-primary-1 text-white font-inter text-xs modal-delete"
							onClick={async () => {
								closeBillModal();
							}}>
							Create Bill
						</Button>
					</div>
				</Modal>
			)}
			{/* Order Details Header */}
			<div className="p-6 max-w-4xl mx-auto">
				<div className="mb-8 ">
					<div className="flex justify-between items-start">
						<div>
							<h2 className="text-lg font-medium mb-1">
								Order #
								{userData?.id && userData.id.length > 8
									? userData.id.slice(0, 5)
									: userData?.id}{" "}
								<span className="text-blue-600">(in progress)</span>
							</h2>
							<p className="text-gray-600">
								Feb 14, 2024 ● Pick up date Feb 15, 2024
							</p>
						</div>
						<div className="flex flex-wrap gap-2">
							<button
								className="px-3 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
								onClick={openDisputeModal}>
								Raise dispute
							</button>
							<button
								className="px-3 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
								onClick={openBillModal}>
								Set bill
							</button>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<button className="px-3 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50 flex items-center gap-1">
										Change status
										<ChevronDown className="h-4 w-4 opacity-50" />
									</button>
								</DropdownMenuTrigger>
								<DropdownMenuContent className="w-56 bg-white">
									<DropdownMenuItem
										onSelect={() => handleStatusChange("pending")}>
										Pending
									</DropdownMenuItem>
									<DropdownMenuItem
										onSelect={() => handleStatusChange("processing")}>
										Processing
									</DropdownMenuItem>
									<DropdownMenuItem
										onSelect={() => handleStatusChange("shipped")}>
										Shipped
									</DropdownMenuItem>
									<DropdownMenuItem
										onSelect={() => handleStatusChange("delivered")}>
										Delivered
									</DropdownMenuItem>
									<DropdownMenuItem
										onSelect={() => handleStatusChange("cancelled")}>
										Cancelled
									</DropdownMenuItem>
									<DropdownMenuItem
										onSelect={() => handleStatusChange("returned")}>
										Returned
									</DropdownMenuItem>
									<DropdownMenuItem
										onSelect={() => handleStatusChange("refunded")}>
										Refunded
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
							<button
								className="px-3 py-1.5 border border-red-300 text-red-600 rounded-md text-sm hover:bg-red-50 flex items-center"
								onClick={openDeleteModal}>
								<span className="mr-1">+</span> Cancel order
							</button>
						</div>
					</div>
				</div>

				{/* Order Summary */}
				<div className="border border-gray-200 rounded-lg p-6">
					<h1 className="text-xl font-semibold mb-4">Order #CWHJERF</h1>

					<div className="text-gray-600 mb-6">
						<p>Feb 14, 2024</p>
						<p>Pick up date Feb 15, 2024</p>
					</div>

					<hr className="my-6 border-gray-200" />

					<div className="mb-6">
						<h2 className="text-lg font-medium mb-4">Item Ordered</h2>
						<table className="w-full">
							<thead>
								<tr className="border-b border-gray-200">
									<th className="text-left pb-2 font-medium">Item</th>
									<th className="text-left pb-2 font-medium">Quantity</th>
									<th className="text-left pb-2 font-medium">
										Service instruction
									</th>
								</tr>
							</thead>
							<tbody>
								<tr className="border-b border-gray-200">
									<td className="py-3">Agbada</td>
									<td className="py-3">2</td>
									<td className="py-3">Do not dry under the sun</td>
								</tr>
								<tr className="border-b border-gray-200">
									<td className="py-3">T-shirt</td>
									<td className="py-3">3</td>
									<td className="py-3">Do not dry under the sun</td>
								</tr>
								<tr>
									<td className="py-3">Singlet</td>
									<td className="py-3">1</td>
									<td className="py-3">Do not dry under the sun</td>
								</tr>
							</tbody>
						</table>
					</div>

					<hr className="my-6 border-gray-200" />

					<div>
						<h2 className="text-lg font-medium mb-4">Subtotal</h2>
						<table className="w-full">
							<tbody>
								<tr className="border-b border-gray-200">
									<td className="py-2">Delivery fee</td>
									<td className="py-2 text-right">Paid</td>
								</tr>
								<tr className="border-b border-gray-200">
									<td className="py-2">Pick up fee</td>
									<td className="py-2 text-right ">Paid</td>
								</tr>
								<tr className="border-b border-gray-200">
									<td className="py-2">Discount</td>
									<td className="py-2 text-right">-2%</td>
								</tr>
								<tr>
									<td className="pt-4 font-semibold">Grand total</td>
									<td className="pt-4 text-right font-semibold text-xl text-primary-1">
										3100
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>
	);
}

export default OrderDetails;
