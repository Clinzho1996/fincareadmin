"use client";

import HeaderBox from "@/components/HeaderBox";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface SettingItem {
	id: string;
	name: string;
	value: string;
}

export default function SystemSettings() {
	const [settings, setSettings] = useState<SettingItem[]>([
		{ id: "1", name: "Membership Fee", value: "Set Value" },
		{ id: "2", name: "Loan Penalty", value: "Set Value" },
		{ id: "3", name: "VAT", value: "Set Value" },
	]);

	const [isModalOpen, setIsModalOpen] = useState(false);
	const [currentSetting, setCurrentSetting] = useState<SettingItem | null>(
		null
	);
	const [editValue, setEditValue] = useState("");

	const openEditModal = (setting: SettingItem) => {
		setCurrentSetting(setting);
		setEditValue(setting.value);
		setIsModalOpen(true);
	};

	const closeModal = () => {
		setIsModalOpen(false);
		setCurrentSetting(null);
		setEditValue("");
	};

	const handleSave = () => {
		if (currentSetting) {
			setSettings(
				settings.map((item) =>
					item.id === currentSetting.id ? { ...item, value: editValue } : item
				)
			);
		}
		closeModal();
	};

	return (
		<div>
			<HeaderBox title="System Settings" />

			<div className="w-full mx-auto p-6 bg-white rounded-lg shadow-sm">
				<div className="border rounded-lg overflow-hidden">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Item
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Values
								</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{settings.map((setting) => (
								<tr key={setting.id} className="hover:bg-gray-50">
									<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
										{setting.name}
									</td>
									<td
										className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer hover:text-blue-600 hover:underline"
										onClick={() => openEditModal(setting)}>
										{setting.value}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>

			<Modal
				isOpen={isModalOpen}
				onClose={closeModal}
				title={`Edit ${currentSetting?.name}`}>
				<div className="p-6 form">
					<div className="mb-4">
						<label className="block text-sm font-medium text-gray-700 mb-1">
							{currentSetting?.name}
						</label>
						<input
							type="text"
							value={editValue}
							onChange={(e) => setEditValue(e.target.value)}
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
						<Button onClick={handleSave} className="bg-primary-1  text-white">
							Save Changes
						</Button>
					</div>
				</div>
			</Modal>
		</div>
	);
}
