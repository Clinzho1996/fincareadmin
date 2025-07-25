"use client";

import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface FineItem {
	id: string;
	name: string;
	amount: string;
	type: "fixed" | "other";
}

export default function FinesManagement() {
	const [fines, setFines] = useState<FineItem[]>([
		{ id: "1", name: "Lateness fine", amount: "2,000", type: "fixed" },
		{ id: "2", name: "Absentee fine", amount: "Add Amount", type: "fixed" },
		{
			id: "3",
			name: "Absconding from premises",
			amount: "12,000",
			type: "other",
		},
		{ id: "4", name: "Damages fine", amount: "12,000", type: "other" },
	]);

	const [isModalOpen, setIsModalOpen] = useState(false);
	const [currentFine, setCurrentFine] = useState<FineItem | null>(null);
	const [editAmount, setEditAmount] = useState("");

	const openEditModal = (fine: FineItem) => {
		setCurrentFine(fine);
		setEditAmount(fine.amount === "Add Amount" ? "" : fine.amount);
		setIsModalOpen(true);
	};

	const closeModal = () => {
		setIsModalOpen(false);
		setCurrentFine(null);
		setEditAmount("");
	};

	const handleSave = () => {
		if (currentFine) {
			const newAmount = editAmount.trim() === "" ? "Add Amount" : editAmount;
			setFines(
				fines.map((item) =>
					item.id === currentFine.id ? { ...item, amount: newAmount } : item
				)
			);
		}
		closeModal();
	};

	const fixedFines = fines.filter((fine) => fine.type === "fixed");
	const otherFines = fines.filter((fine) => fine.type === "other");

	return (
		<div>
			<div className="w-full mx-auto p-2 bg-white rounded-lg shadow-lg space-y-8">
				{/* Fixed Fines Section */}
				<div>
					<h2 className="text-lg font-semibold mb-4">Fixed fines</h2>
					<div className="border rounded-lg overflow-hidden">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Fine
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Amount (NGN)
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Actions
									</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{fixedFines.map((fine) => (
									<tr key={fine.id} className="hover:bg-gray-50">
										<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
											{fine.name}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											{fine.amount}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											<button
												onClick={() => openEditModal(fine)}
												className="text-primary-600 hover:text-primary-900">
												{fine.amount === "Add Amount" ? "Edit amount" : "Edit"}
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>

				{/* Other Fines Section */}
				<div>
					<h2 className="text-lg font-semibold mb-4">Other fines</h2>
					<div className="border rounded-lg overflow-hidden">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Fine
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Amount (NGN)
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Actions
									</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{otherFines.map((fine) => (
									<tr key={fine.id} className="hover:bg-gray-50">
										<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
											{fine.name}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											{fine.amount}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											<button
												onClick={() => openEditModal(fine)}
												className="text-primary-600 hover:text-primary-900">
												Edit
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</div>

			{/* Edit Modal */}
			<Modal
				isOpen={isModalOpen}
				onClose={closeModal}
				title={`Edit ${currentFine?.name}`}>
				<div className="p-6 form">
					<div className="mb-4">
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Amount (NGN)
						</label>
						<input
							type="text"
							value={editAmount}
							onChange={(e) => setEditAmount(e.target.value)}
							placeholder="Enter amount"
							className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
							autoFocus
						/>
					</div>
					<div className="flex justify-end space-x-3 mt-6">
						<Button
							variant="outline"
							onClick={closeModal}
							className="text-gray-700">
							Cancel
						</Button>
						<Button onClick={handleSave} className="bg-primary-1 text-white">
							Save Changes
						</Button>
					</div>
				</div>
			</Modal>
		</div>
	);
}
