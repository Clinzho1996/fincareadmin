"use client";

import { useRef, useState } from "react";
import {
	FiCheck,
	FiChevronDown,
	FiMail,
	FiMessageSquare,
	FiPhone,
	FiSearch,
} from "react-icons/fi";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

type Customer = {
	id: string;
	name: string;
	email: string;
	phone: string;
	lastInteraction: string;
	unread?: boolean;
	latestMessage?: string;
};

type MessageChannel = "email" | "sms" | "chat";

const CustomerMessaging = () => {
	const customers = [
		{
			id: "1",
			name: "Johnson James",
			email: "jamesjohnson@gmail.com",
			phone: "+1234567890",
			lastInteraction: "12:00pm",
			unread: true,
			latestMessage: "Pending loan request... We would like to inform...",
		},
		{
			id: "2",
			name: "Confidence Clinton",
			email: "confidenceclinton@gmail.com",
			phone: "+234987654321",
			lastInteraction: "1:00pm",
			unread: false,
			latestMessage: "Your loan has been approved...",
		},
		{
			id: "3",
			name: "Dele Ajibola",
			email: "deleajibola@gmail.com",
			phone: "+23422334455",
			lastInteraction: "2:00pm",
			unread: true,
			latestMessage: "Your loan has been rejected...",
		},
	];

	const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
	const [currentMessage, setCurrentMessage] = useState<string>("");
	const [messageChannel, setMessageChannel] = useState<MessageChannel>("email");
	const [searchTerm, setSearchTerm] = useState<string>("");
	const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
		null
	);
	const [isChannelDropdownOpen, setIsChannelDropdownOpen] = useState(false);

	const quillRef = useRef<ReactQuill>(null);

	// Dynamic channel names
	const channelNames = {
		email: "Email",
		sms: "Text Message",
		chat: "Direct Message",
	};

	const filteredCustomers = customers.filter(
		(customer) =>
			customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			customer.email.toLowerCase().includes(searchTerm.toLowerCase())
	);

	const toggleCustomerSelection = (customerId: string) => {
		setSelectedCustomers((prev) =>
			prev.includes(customerId)
				? prev.filter((id) => id !== customerId)
				: [...prev, customerId]
		);
	};

	const selectAllCustomers = () => {
		if (selectedCustomers.length === filteredCustomers.length) {
			setSelectedCustomers([]);
		} else {
			setSelectedCustomers(filteredCustomers.map((c) => c.id));
		}
	};

	const handleSendMessage = async () => {
		if (selectedCustomers.length === 0 || !currentMessage.trim()) return;

		try {
			console.log("Sending message:", {
				customerIds: selectedCustomers,
				message: currentMessage,
				channel: messageChannel,
			});

			setCurrentMessage("");
			setSelectedCustomers([]);
			alert("Message sent successfully!");
		} catch (error) {
			console.error("Error sending message:", error);
			alert("Failed to send message");
		}
	};

	const channelIcons = {
		email: <FiMail className="mr-2" />,
		sms: <FiPhone className="mr-2" />,
		chat: <FiMessageSquare className="mr-2" />,
	};

	// Different layouts for each channel
	const renderMessageComposer = () => {
		switch (messageChannel) {
			case "email":
				return (
					<ReactQuill
						ref={quillRef}
						theme="snow"
						value={currentMessage}
						onChange={setCurrentMessage}
						placeholder="Compose your email..."
						className="border border-gray-300 rounded-md bg-white"
						modules={{
							toolbar: [
								[{ header: [1, 2, false] }],
								["bold", "italic", "underline", "strike"],
								[{ list: "ordered" }, { list: "bullet" }],
								["link", "image"],
								["clean"],
							],
						}}
					/>
				);
			case "sms":
				return (
					<div className="relative">
						<textarea
							value={currentMessage}
							onChange={(e) => setCurrentMessage(e.target.value)}
							placeholder="Type your text message..."
							className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							rows={3}
							maxLength={160}
						/>
						<div className="absolute bottom-2 right-2 text-xs text-gray-500">
							{currentMessage.length}/160
						</div>
					</div>
				);
			case "chat":
				return (
					<div className="flex items-center">
						<input
							type="text"
							value={currentMessage}
							onChange={(e) => setCurrentMessage(e.target.value)}
							placeholder="Type your message..."
							className="flex-1 p-3 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
						/>
						<button
							onClick={handleSendMessage}
							disabled={
								!currentMessage.trim() || selectedCustomers.length === 0
							}
							className="bg-primary-1 text-white p-3 rounded-r-md hover:bg-primary-1 disabled:bg-gray-400 disabled:cursor-not-allowed">
							Send
						</button>
					</div>
				);
			default:
				return null;
		}
	};

	return (
		<div className="flex h-screen bg-gray-50">
			{/* Sidebar */}
			<div className="w-1/3 border-r border-gray-200 bg-white flex flex-col">
				<div className="p-4 border-b border-gray-200">
					<h1 className="text-xl font-bold text-gray-800">Customer Inbox</h1>

					{/* Search */}
					<div className="mt-4 relative">
						<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
							<FiSearch className="text-gray-400" />
						</div>
						<input
							type="text"
							placeholder="Search customers..."
							className="pl-10 w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
						/>
					</div>

					{/* Channel Filter */}
					<div className="mt-4 flex flex-row space-x-2">
						{(["email", "sms", "chat"] as MessageChannel[]).map((channel) => (
							<button
								key={channel}
								className={`px-3 py-1 rounded-md flex items-center text-sm ${
									messageChannel === channel
										? "bg-primary-1 text-white"
										: "bg-gray-200 text-gray-700"
								}`}
								onClick={() => setMessageChannel(channel)}>
								{channelIcons[channel]}
								{channelNames[channel]}
							</button>
						))}
					</div>
				</div>

				{/* Customer List */}
				<div className="flex-1 overflow-y-auto">
					<div className="p-2 border-b border-gray-200 flex items-center bg-gray-100">
						<input
							type="checkbox"
							checked={
								selectedCustomers.length === filteredCustomers.length &&
								filteredCustomers.length > 0
							}
							onChange={selectAllCustomers}
							className="mr-3 h-4 w-4 text-primary-1 rounded"
						/>
						<span className="text-sm text-gray-500">
							{selectedCustomers.length > 0
								? `${selectedCustomers.length} selected`
								: `${customers.length} customers`}
						</span>
					</div>

					{filteredCustomers.map((customer) => (
						<div
							key={customer.id}
							className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${
								selectedCustomer?.id === customer.id ? "bg-blue-50" : ""
							}`}
							onClick={() => setSelectedCustomer(customer)}>
							<div className="flex items-center justify-between">
								<div className="flex items-center">
									<input
										type="checkbox"
										checked={selectedCustomers.includes(customer.id)}
										onChange={(e) => {
											e.stopPropagation();
											toggleCustomerSelection(customer.id);
										}}
										className="mr-3 h-4 w-4 text-primary-1 rounded"
									/>
									<div>
										<h3 className="font-medium text-gray-900">
											{customer.name}
										</h3>
										<p className="text-sm text-gray-500">
											{messageChannel === "email"
												? customer.email
												: messageChannel === "sms"
												? customer.phone
												: `@${customer.name.toLowerCase().replace(/\s+/g, "")}`}
										</p>
									</div>
								</div>
								<span className="text-xs text-gray-400">
									{customer.lastInteraction}
								</span>
							</div>
							{customer.unread && (
								<div className="mt-2 flex items-center">
									<span className="inline-block w-2 h-2 rounded-full bg-primary-1 mr-2"></span>
									<p className="text-sm text-gray-600 truncate">
										{customer.latestMessage}
									</p>
								</div>
							)}
						</div>
					))}
				</div>
			</div>

			{/* Main Content */}
			<div className="flex-1 flex flex-col">
				{selectedCustomer ? (
					<>
						{/* Message Header */}
						<div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white">
							<div>
								<h2 className="text-lg font-semibold">
									{selectedCustomer.name}
								</h2>
								<p className="text-sm text-gray-500">
									{messageChannel === "email"
										? selectedCustomer.email
										: messageChannel === "sms"
										? selectedCustomer.phone
										: `@${selectedCustomer.name
												.toLowerCase()
												.replace(/\s+/g, "")}`}
								</p>
							</div>
							<div className="relative">
								<button
									className="flex items-center px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-700"
									onClick={() =>
										setIsChannelDropdownOpen(!isChannelDropdownOpen)
									}>
									{channelIcons[messageChannel]}
									<span>{channelNames[messageChannel]}</span>
									<FiChevronDown className="ml-2" />
								</button>
								{isChannelDropdownOpen && (
									<div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
										<div className="py-1">
											{(["email", "sms", "chat"] as MessageChannel[]).map(
												(channel) => (
													<button
														key={channel}
														className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
														onClick={() => {
															setMessageChannel(channel);
															setIsChannelDropdownOpen(false);
														}}>
														{channelIcons[channel]}
														{channelNames[channel]}
													</button>
												)
											)}
										</div>
									</div>
								)}
							</div>
						</div>

						{/* Message History */}
						<div className="flex-1 p-4 overflow-y-auto bg-gray-50">
							{/* Sample message history */}
							<div className="mb-4">
								<div className="flex justify-end mb-2">
									<div className="bg-primary-1 text-white rounded-lg py-2 px-4 max-w-xs md:max-w-md lg:max-w-lg">
										<p>Hello, I have a question about my order.</p>
										<p className="text-xs text-blue-100 mt-1">12:00pm</p>
									</div>
								</div>
								<div className="flex justify-start mb-2">
									<div className="bg-gray-200 text-gray-800 rounded-lg py-2 px-4 max-w-xs md:max-w-md lg:max-w-lg">
										<p>
											Hi {selectedCustomer.name.split(" ")[0]}, what would you
											like to know about your order?
										</p>
										<p className="text-xs text-gray-500 mt-1">12:02pm</p>
									</div>
								</div>
							</div>
						</div>
					</>
				) : (
					<div className="flex-1 flex items-center justify-center bg-gray-50">
						<div className="text-center">
							<h2 className="text-xl font-semibold text-gray-700">
								No customer selected
							</h2>
							<p className="text-gray-500 mt-2">
								Select a customer from the list to view messages
							</p>
						</div>
					</div>
				)}

				{/* Message Composer */}
				<div className="p-4 border-t border-gray-200 bg-white">
					{selectedCustomers.length > 0 && (
						<div className="mb-2 text-sm text-gray-600">
							<FiCheck className="inline mr-1 text-green-500" />
							Sending to {selectedCustomers.length} customer
							{selectedCustomers.length > 1 ? "s" : ""}
						</div>
					)}
					{renderMessageComposer()}
					<div className="mt-4 flex justify-between items-center">
						<div className="text-sm text-gray-500">
							{messageChannel === "email" && "This will be sent as an email"}
							{messageChannel === "sms" &&
								"This will be sent as an SMS (limited to 160 characters)"}
							{messageChannel === "chat" &&
								"This will be sent as a direct message"}
						</div>
						{messageChannel !== "chat" && (
							<button
								onClick={handleSendMessage}
								disabled={
									!currentMessage.trim() || selectedCustomers.length === 0
								}
								className={`px-4 py-2 rounded-md text-white flex flex-row items-center gap-2 ${
									!currentMessage.trim() || selectedCustomers.length === 0
										? "bg-gray-400 cursor-not-allowed"
										: "bg-primary-1 hover:bg-primary-1"
								}`}>
								Send {channelIcons[messageChannel]}
							</button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default CustomerMessaging;
