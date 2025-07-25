import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { IconDownload } from "@tabler/icons-react";
import { Download } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

const ReceiptModal = () => {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button variant="ghost" size="icon" className="h-8 w-8">
					<Download className="h-4 w-4" />
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-md sm:max-w-[425px] bg-white">
				<DialogHeader>
					<DialogTitle className="text-left">Receipt 20484as</DialogTitle>
				</DialogHeader>
				<div className="receipt-container px-4 font-sans">
					{/* Receipt Header */}
					<div className="text-center mb-2">
						<Image
							src="/images/cloudicon.png"
							alt="logo"
							width={200}
							height={50}
							className="w-fit justify-center h-[40px] flex flex-row mx-auto mb-4"
						/>
						<div className="text-xs">
							<p>2ND FLOOR LENNOR MALL, ADMIRALTY WAY,</p>
							<p>LEKKI PHASE 1, LEKKI , LAGOS</p>
							<p>08059303818</p>
							<p>cutomerservice@washryte.com.ng</p>
						</div>
					</div>

					<hr className="border-t border-gray-300 my-4" />

					{/* Customer Details */}
					<div className="mb-6">
						<h2 className="font-bold mb-2">Customer Details</h2>
						<div className="grid grid-cols-1 gap-y-1 text-xs">
							<div className="flex justify-between">
								<span className="text-gray-600">Customer name</span>
								<span className="font-semibold">Johnbosco Doe</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-600">Attendant</span>
								<span className="font-semibold">Johnbosco Doe</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-600">Payment method</span>
								<span className="font-semibold">Done</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-600">Date</span>
								<span className="font-semibold">22/12/20</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-600">Quantity</span>
								<span className="font-semibold">15</span>
							</div>
						</div>
					</div>

					<hr className="border-t border-gray-300 my-4" />

					{/* Wash Details */}
					<div className="mb-6">
						<h2 className="font-bold mb-2">Wash Details</h2>
						<table className="w-full text-xs">
							<thead>
								<tr className="border-b border-gray-300">
									<th className="text-left pb-1">ITEM</th>
									<th className="text-left pb-1">PRICE</th>
									<th className="text-left pb-1">QTY</th>
									<th className="text-right pb-1">VALUE</th>
								</tr>
							</thead>
							<tbody>
								<tr>
									<td className="py-1">Wrapper</td>
									<td className="py-1">N500</td>
									<td className="py-1">x3</td>
									<td className="py-1 text-right">1800</td>
								</tr>
								<tr>
									<td className="py-1">Wrapper</td>
									<td className="py-1">N500</td>
									<td className="py-1">x3</td>
									<td className="py-1 text-right">1800</td>
								</tr>
								<tr>
									<td className="py-1">Wrapper</td>
									<td className="py-1">N500</td>
									<td className="py-1">x3</td>
									<td className="py-1 text-right">1800</td>
								</tr>
							</tbody>
						</table>
					</div>

					<hr className="border-t border-gray-300 my-4" />

					{/* VAT and Totals */}
					<div className="mb-6">
						<h2 className="font-bold mb-2">VAT</h2>
						<div className="grid grid-cols-1 gap-y-1 text-xs">
							<div className="flex justify-between">
								<span className="text-gray-600">Discount</span>
								<span className="font-semibold">%2.5</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-600">Total</span>
								<span className="font-semibold">$200</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-600">Subtotal</span>
								<span className="font-semibold">$200</span>
							</div>
						</div>
					</div>

					<hr className="border-t border-gray-300 my-4" />

					{/* Action Buttons */}
					<div className="flex flex-col justify-between mb-4 w-fit mx-auto">
						<Button
							variant="outline"
							className="text-sm bg-primary-1 text-white">
							Print receipt
						</Button>
						<Button
							variant="outline"
							className="text-sm text-primary-1 outline-none border-none shadow-none">
							<IconDownload className="mr-2 h-4 w-4" /> Download PDF receipt
						</Button>
					</div>

					{/* Footer */}
					<div className="text-center text-[10px] text-gray-500">
						<p>POWERED BY CLOUDWASH TECH</p>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default ReceiptModal;
