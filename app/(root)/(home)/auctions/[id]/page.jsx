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
	const accessToken = session?.accessToken || session?.user?.accessToken;
	const auctionId = params.id;

	const [auction, setAuction] = useState(null);
	const [bids, setBids] = useState([]);
	const [statistics, setStatistics] = useState(null);
	const [loading, setLoading] = useState(true);
	const [updating, setUpdating] = useState(false);
	const [activeTab, setActiveTab] = useState("bids"); // "bids" or "analytics"

	useEffect(() => {
		if (auctionId && accessToken && status === "authenticated") {
			fetchAuctionDetails();
		}
	}, [auctionId, accessToken, status]);

	const fetchAuctionDetails = async () => {
		try {
			setLoading(true);
			const response = await fetch(`/api/admin/auctions/${auctionId}/bids`, {
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			});

			if (!response.ok) throw new Error("Failed to fetch auction details");

			const data = await response.json();
			setAuction(data.auction);
			setBids(data.bids);
			setStatistics(data.statistics);
		} catch (error) {
			console.error("Error fetching auction details:", error);
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
					Authorization: `Bearer ${accessToken}`,
				},
			});

			if (!response.ok) throw new Error("Failed to accept bid");

			toast.success("Bid accepted successfully!");
			fetchAuctionDetails();
		} catch (error) {
			console.error("Error accepting bid:", error);
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
					Authorization: `Bearer ${accessToken}`,
				},
				body: JSON.stringify({ status: newStatus }),
			});

			if (!response.ok) throw new Error("Failed to update auction status");

			toast.success("Auction status updated successfully!");
			setAuction({ ...auction, status: newStatus });
		} catch (error) {
			console.error("Error updating auction status:", error);
			toast.error("Failed to update auction status");
		} finally {
			setUpdating(false);
		}
	};

	const formatCurrency = (amount) => {
		return new Intl.NumberFormat("en-NG", {
			style: "currency",
			currency: "NGN",
		}).format(amount);
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

			<div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6 p-6">
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
								{formatCurrency(auction.reservePrice)}
							</p>
						</div>

						<div>
							<p className="text-sm font-medium text-gray-500">
								Current Highest Bid
							</p>
							<p className="text-lg font-semibold">
								{formatCurrency(auction.currentBid)}
							</p>
							{statistics?.reservePricePercentage && (
								<p className="text-sm text-gray-500">
									({statistics.reservePricePercentage}% of reserve)
								</p>
							)}
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

						{/* Statistics Overview */}
						{statistics && (
							<div className="pt-4 border-t">
								<p className="text-sm font-medium text-gray-500">
									Bidding Stats
								</p>
								<div className="text-sm space-y-1">
									<p>Total Bids: {statistics.totalBids}</p>
									<p>Unique Bidders: {statistics.uniqueBidders}</p>
									<p>Average Bid: {formatCurrency(statistics.averageBid)}</p>
								</div>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Main Content Area */}
				<Card className="lg:col-span-3">
					<CardHeader className="flex flex-row items-center justify-between">
						<CardTitle>
							<div className="flex space-x-2">
								<Button
									variant={activeTab === "bids" ? "default" : "outline"}
									onClick={() => setActiveTab("bids")}>
									Bids ({bids.length})
								</Button>
								<Button
									variant={activeTab === "analytics" ? "default" : "outline"}
									onClick={() => setActiveTab("analytics")}>
									Analytics
								</Button>
							</div>
						</CardTitle>
						<Button onClick={fetchAuctionDetails} variant="outline">
							Refresh
						</Button>
					</CardHeader>

					<CardContent>
						{activeTab === "bids" ? (
							<BidsTable
								bids={bids}
								onAcceptBid={handleAcceptBid}
								updating={updating}
								formatCurrency={formatCurrency}
							/>
						) : (
							<AnalyticsTab
								statistics={statistics}
								formatCurrency={formatCurrency}
							/>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

// Separate component for bids table
// Separate component for bids table with local formatPercentage
function BidsTable({ bids, onAcceptBid, updating, formatCurrency }) {
	const formatPercentage = (value) => {
		return `${value}%`;
	};

	if (bids.length === 0) {
		return <p className="text-center py-4 text-gray-500">No bids yet</p>;
	}

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Bidder</TableHead>
					<TableHead>Email</TableHead>
					<TableHead>Amount</TableHead>
					<TableHead>Type</TableHead>
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
							{formatCurrency(bid.amount)}
							{bid.percentage && (
								<span className="text-sm text-gray-500 ml-2">
									({formatPercentage(bid.percentage)})
								</span>
							)}
						</TableCell>
						<TableCell>
							<Badge
								variant={
									bid.bidType === "percentage" ? "secondary" : "outline"
								}>
								{bid.bidType || "absolute"}
							</Badge>
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
							{(bid.status === "pending" || bid.status === "leading") && (
								<Button
									className="bg-primary-1 text-white"
									size="sm"
									onClick={() => onAcceptBid(bid._id)}
									disabled={updating}>
									Accept
								</Button>
							)}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}

// Separate component for analytics tab
function AnalyticsTab({ statistics, formatCurrency }) {
	const formatPercentage = (value) => {
		return `${value}%`;
	};

	if (!statistics) {
		return (
			<p className="text-center py-4 text-gray-500">
				No analytics data available
			</p>
		);
	}

	return (
		<div className="space-y-6">
			{/* Overall Statistics */}
			<Card>
				<CardHeader>
					<CardTitle>Bidding Overview</CardTitle>
				</CardHeader>
				<CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
					<div className="text-center">
						<p className="text-2xl font-bold">{statistics.totalBids}</p>
						<p className="text-sm text-gray-500">Total Bids</p>
					</div>
					<div className="text-center">
						<p className="text-2xl font-bold">{statistics.uniqueBidders}</p>
						<p className="text-sm text-gray-500">Unique Bidders</p>
					</div>
					<div className="text-center">
						<p className="text-2xl font-bold">
							{formatCurrency(statistics.averageBid)}
						</p>
						<p className="text-sm text-gray-500">Average Bid</p>
					</div>
					<div className="text-center">
						<p className="text-2xl font-bold">
							{formatCurrency(statistics.medianBid)}
						</p>
						<p className="text-sm text-gray-500">Median Bid</p>
					</div>
				</CardContent>
			</Card>

			{/* Percentage Bidding Analysis */}
			{statistics.percentageAnalysis &&
				statistics.percentageAnalysis.percentageBidStats && (
					<Card>
						<CardHeader>
							<CardTitle>Percentage Bidding Analysis</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div>
									<h4 className="font-semibold mb-3">
										Percentage vs Absolute Bids
									</h4>
									<div className="space-y-2">
										<p>
											Percentage Bids:{" "}
											{statistics.percentageAnalysis.totalPercentageBids}
										</p>
										<p>
											Average Percentage:{" "}
											{formatPercentage(
												statistics.percentageAnalysis.percentageBidStats
													.averagePercentage
											)}
										</p>
										<p>
											Average Value:{" "}
											{formatCurrency(
												statistics.percentageAnalysis.percentageBidStats
													.averageValue
											)}
										</p>
									</div>
								</div>
								<div>
									<h4 className="font-semibold mb-3">Comparison</h4>
									<div className="space-y-2">
										<p>
											Percentage bids are{" "}
											{Math.abs(
												statistics.percentageAnalysis.conversionComparison
													.percentageDifference
											)}
											%
											{statistics.percentageAnalysis.conversionComparison
												.percentageDifference > 0
												? " higher"
												: " lower"}
											than absolute bids
										</p>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				)}

			{/* Membership Level Analysis */}
			{statistics.averageByMembership &&
				Object.keys(statistics.averageByMembership).length > 0 && (
					<Card>
						<CardHeader>
							<CardTitle>Bidding by Membership Level</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
								{Object.entries(statistics.averageByMembership).map(
									([level, amount]) => (
										<div key={level} className="text-center">
											<p className="text-lg font-bold">
												{formatCurrency(amount)}
											</p>
											<p className="text-sm text-gray-500 capitalize">
												{level}
											</p>
										</div>
									)
								)}
							</div>
						</CardContent>
					</Card>
				)}
		</div>
	);
}
