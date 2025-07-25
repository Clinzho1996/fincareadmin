"use client";

import HeaderBox from "@/components/HeaderBox";
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
import { useState } from "react";

interface ServiceItem {
	id: number;
	name: string;
	unitCost: number;
	quantity: number;
}

export default function LaunchyQuote() {
	const [isModalOpen, setModalOpen] = useState(false);
	const [activeTab, setActiveTab] = useState<"Iron" | "Co">("Iron");
	const [customerName, setCustomerName] = useState("John Doe");
	const [staffId, setStaffId] = useState("301");
	const [paymentMethod, setPaymentMethod] = useState("Bank transfer");
	const [orderType, setOrderType] = useState("Drop off");
	const [date, setDate] = useState("02/07/2024");
	const [services, setServices] = useState<ServiceItem[]>([
		{ id: 1, name: "", unitCost: 30, quantity: 1 },
		{ id: 2, name: "", unitCost: 30, quantity: 1 },
		{ id: 3, name: "", unitCost: 30, quantity: 2 },
		{ id: 4, name: "", unitCost: 30, quantity: 3 },
	]);

	const openModal = () => setModalOpen(true);
	const closeModal = () => setModalOpen(false);

	const incrementQuantity = (id: number) => {
		setServices(
			services.map((service) =>
				service.id === id
					? { ...service, quantity: service.quantity + 1 }
					: service
			)
		);
	};

	const decrementQuantity = (id: number) => {
		setServices(
			services.map((service) =>
				service.id === id
					? { ...service, quantity: Math.max(1, service.quantity - 1) }
					: service
			)
		);
	};

	const subtotal = services.reduce(
		(sum, service) => sum + service.unitCost * service.quantity,
		0
	);
	const vat = subtotal * 0.2; // Assuming 20% VAT
	const total = subtotal + vat;

	return (
		<>
			<HeaderBox title="Edit Quote" />

			<Modal isOpen={isModalOpen} onClose={closeModal} title="Upgrade to sale">
				<div className="bg-white p-0 rounded-lg w-[600px] transition-transform ease-in-out form">
					<div className="mt-3 border-t-[1px] border-[#E2E4E9] pt-2">
						<div className="flex flex-col gap-2 mt-4">
							<p className="text-xs text-primary-6">Staff ID</p>
							<Input
								type="text"
								placeholder="Enter staff ID"
								className="focus:border-none mt-2"
							/>

							<p className="text-xs text-primary-6 mt-2">Payment Method</p>
							<Select>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Select method" />
								</SelectTrigger>
								<SelectContent className="bg-white z-10 select text-gray-300">
									<SelectItem value="Sales Inventory">Bank Transfer</SelectItem>
									<SelectItem value="Non-sales inventory">Cash</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="flex flex-row justify-end items-center gap-3 font-inter mt-4">
							<Button
								className="border-[#E8E8E8] border-[1px] text-primary-6 text-xs"
								onClick={closeModal}>
								Cancel
							</Button>
							<Button className="bg-primary-1 text-white font-inter text-xs">
								Confirm Upgrade
							</Button>
						</div>
					</div>
				</div>
			</Modal>

			<div className=" mx-auto p-6 bg-white rounded-lg shadow-2xl w-[70%]">
				<div className="mb-8">
					<h2 className="text-lg font-semibold mb-4">Unit cost</h2>
					<div className="flex mb-4">
						<button
							className={`px-4 py-2 ${
								activeTab === "Iron" ? "bg-gray-200 font-medium" : "bg-gray-100"
							}`}
							onClick={() => setActiveTab("Iron")}>
							Sales service
						</button>
						<button
							className={`px-4 py-2 ${
								activeTab === "Co" ? "bg-gray-200 font-medium" : "bg-gray-100"
							}`}
							onClick={() => setActiveTab("Co")}>
							Unit cost
						</button>
					</div>

					<div className="mb-2 flex justify-between text-sm text-gray-600">
						<span>Quantity</span>
					</div>

					<div className="space-y-3">
						{services.map((service) => (
							<div
								key={service.id}
								className="flex items-center justify-between border-b pb-2">
								<div className="w-1/3">
									{service.name || (
										<select className="bg-transparent border-none focus:outline-none">
											<option>Select service</option>
											<option>Wash and dry</option>
											<option>Ironing</option>
											<option>Dry cleaning</option>
										</select>
									)}
								</div>
								<div className="w-1/3 text-right">${service.unitCost}</div>
								<div className="w-1/3 flex items-center justify-end space-x-2">
									<button
										onClick={() => decrementQuantity(service.id)}
										className="w-6 h-6 flex items-center justify-center border rounded">
										-
									</button>
									<span>{service.quantity}</span>
									<button
										onClick={() => incrementQuantity(service.id)}
										className="w-6 h-6 flex items-center justify-center border rounded">
										+
									</button>
								</div>
							</div>
						))}
					</div>
				</div>

				<div className="border-t pt-6">
					<h2 className="text-lg font-semibold mb-4">New Quote</h2>

					<div className="grid grid-cols-2 gap-6">
						<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Customer name
								</label>
								<Input
									type="text"
									value={customerName}
									onChange={(e) => setCustomerName(e.target.value)}
									className="w-full p-2 border rounded"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Staff ID
								</label>
								<Input
									type="text"
									value={staffId}
									onChange={(e) => setStaffId(e.target.value)}
									className="w-full p-2 border rounded"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Payment method
								</label>
								<select
									value={paymentMethod}
									onChange={(e) => setPaymentMethod(e.target.value)}
									className="w-full p-2 border rounded">
									<option>Bank transfer</option>
									<option>Cash</option>
									<option>Card</option>
								</select>
							</div>
						</div>

						<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Order type
								</label>
								<select
									value={orderType}
									onChange={(e) => setOrderType(e.target.value)}
									className="w-full p-2 border rounded">
									<option>Drop off</option>
									<option>Pickup</option>
									<option>Delivery</option>
								</select>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Date
								</label>
								<Input
									type="text"
									value={date}
									onChange={(e) => setDate(e.target.value)}
									className="w-full p-2 border rounded"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Item
								</label>
								<Input
									type="text"
									placeholder="Enter Item"
									className="w-full p-2 border rounded"
								/>
							</div>
						</div>
					</div>

					<div className="mt-6 border-t pt-4">
						<div className="flex justify-between mb-2">
							<span>VAT</span>
							<span>${vat.toFixed(2)}</span>
						</div>
						<div className="flex justify-between font-bold text-lg mt-3">
							<span>Total</span>
							<span>${total.toFixed(2)}</span>
						</div>

						<div className="flex flex-row justify-between items-center gap-5">
							<Button
								className="w-full mt-6 bg-transparent  text-primary-1 border  py-3 rounded"
								onClick={openModal}>
								Convert to sales
							</Button>

							<Button className="w-full mt-6 bg-primary-1 hover:bg-primary-1 text-white py-3 rounded">
								Send quote
							</Button>
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
