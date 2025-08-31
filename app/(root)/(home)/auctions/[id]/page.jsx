"use client";

import HeaderBox from "@/components/HeaderBox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

export default function AdminAuctionDetailPage() {
	const params = useParams();
	const { data: session, status } = useSession();
	const accessToken = session?.accessToken || session?.user?.accessToken; // ✅ safer
	const auctionId = params.id;

	const [auction, setAuction] = useState(null);
	const [bids, setBids] = useState([]);
	const [loading, setLoading] = useState(true);
	const [updating, setUpdating] = useState(false);

	useEffect(() => {
		// ✅ only run fetch when token is ready
		if (auctionId && accessToken && status === "authenticated") {
			fetchAuctionDetails();
		}
	}, [auctionId, accessToken, status]);

	const fetchAuctionDetails = async () => {
		try {
			setLoading(true);
			console.log("🔑 Using token:", accessToken); // debug

			const response = await fetch(`/api/admin/auctions/${auctionId}/bids`, {
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			});

			if (!response.ok) throw new Error("Failed to fetch auction details");

			const data = await response.json();
			setAuction(data.auction);
			setBids(data.bids);
		} catch (error) {
			console.error("❌ Error fetching auction details:", error);
			toast.error("Failed to load auction details");
		} finally {
			setLoading(false);
		}
	};

	const handleAcceptBid = async (bidId) => {
		if (!confirm("Are you sure you want to accept this bid?")) return;

		try {
			setUpdating(true);
			const response = await fetch(`/api/admin/bids/${bidId}/accept`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${accessToken}`, // ✅ add token
				},
			});

			if (!response.ok) throw new Error("Failed to accept bid");

			toast.success("Bid accepted successfully!");
			fetchAuctionDetails();
		} catch (error) {
			console.error("❌ Error accepting bid:", error);
			toast.error("Failed to accept bid");
		} finally {
			setUpdating(false);
		}
	};

	const handleUpdateAuctionStatus = async (newStatus) => {
		try {
			setUpdating(true);
			const response = await fetch(`/api/admin/auctions/${auctionId}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${accessToken}`, // ✅ add token
				},
				body: JSON.stringify({ status: newStatus }),
			});

			if (!response.ok) throw new Error("Failed to update auction status");

			toast.success("Auction status updated successfully!");
			setAuction({ ...auction, status: newStatus });
		} catch (error) {
			console.error("❌ Error updating auction status:", error);
			toast.error("Failed to update auction status");
		} finally {
			setUpdating(false);
		}
	};

	if (loading) {
		return (
			<div className="p-6">
				<HeaderBox title="Auction Details" />
				<div className="flex justify-center items-center h-64">
					<p>Loading auction details...</p>
				</div>
			</div>
		);
	}

	if (!auction) {
		return (
			<div className="p-6">
				<HeaderBox title="Auction Details" />
				<div className="flex justify-center items-center h-64">
					<p>Auction not found</p>
				</div>
			</div>
		);
	}

	return (
		<div>
			<HeaderBox title="Auction Details" />

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 p-6">
				{/* Auction Details Card */}
				<Card className="lg:col-span-1">
					<CardHeader>
						<CardTitle>Auction Information</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div>
							<p className="text-sm font-medium text-gray-500">Auction Name</p>
							<p className="text-lg font-semibold">{auction.auctionName}</p>
						</div>

						<div>
							<p className="text-sm font-medium text-gray-500">Reserve Price</p>
							<p className="text-lg font-semibold">
								NGN{auction.reservePrice.toLocaleString()}
							</p>
						</div>

						<div>
							<p className="text-sm font-medium text-gray-500">
								Current Highest Bid
							</p>
							<p className="text-lg font-semibold">
								NGN{auction.currentBid.toLocaleString()}
							</p>
						</div>

						<div>
							<p className="text-sm font-medium text-gray-500">Status</p>
							<div className="flex items-center gap-2">
								<Badge
									variant={
										auction.status === "active"
											? "default"
											: auction.status === "completed"
											? "success"
											: "secondary"
									}>
									{auction.status}
								</Badge>
								<Select
									value={auction.status}
									onValueChange={handleUpdateAuctionStatus}
									disabled={updating}>
									<SelectTrigger className="w-32">
										<SelectValue placeholder="Change status" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="active">Active</SelectItem>
										<SelectItem value="completed">Completed</SelectItem>
										<SelectItem value="cancelled">Cancelled</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						<div>
							<p className="text-sm font-medium text-gray-500">End Date</p>
							<p className="text-lg font-semibold">
								{new Date(auction.endDate).toLocaleDateString()}
							</p>
						</div>
					</CardContent>
				</Card>

				{/* Bids List Card */}
				<Card className="lg:col-span-2">
					<CardHeader className="flex flex-row items-center justify-between">
						<CardTitle>Bids</CardTitle>
						<Button onClick={fetchAuctionDetails} variant="outline">
							Refresh
						</Button>
					</CardHeader>
					<CardContent>
						{bids.length === 0 ? (
							<p className="text-center py-4 text-gray-500">No bids yet</p>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Bidder</TableHead>
										<TableHead>Email</TableHead>
										<TableHead>Amount</TableHead>
										<TableHead>Date</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{bids.map((bid) => (
										<TableRow key={bid._id}>
											<TableCell>
												{bid.user[0]?.firstName} {bid.user[0]?.lastName}
											</TableCell>
											<TableCell>{bid.user[0]?.email}</TableCell>
											<TableCell className="font-semibold">
												N{bid.amount.toLocaleString()}
											</TableCell>
											<TableCell>
												{new Date(bid.createdAt).toLocaleDateString()}
											</TableCell>
											<TableCell>
												<Badge
													variant={
														bid.status === "accepted"
															? "success"
															: bid.status === "rejected"
															? "destructive"
															: "secondary"
													}>
													{bid.status}
												</Badge>
											</TableCell>
											<TableCell>
												{bid.status === "pending" ||
													(bid.status === "leading" && (
														<Button
															className="bg-primary-1 text-white"
															size="sm"
															onClick={() => handleAcceptBid(bid._id)}
															disabled={updating}>
															Accept
														</Button>
													))}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
