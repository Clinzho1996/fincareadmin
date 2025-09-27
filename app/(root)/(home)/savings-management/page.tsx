// app/admin/analytics/savings/page.jsx
"use client";

import HeaderBox from "@/components/HeaderBox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
	Award,
	BarChart3,
	Calendar,
	DollarSign,
	Filter,
	Loader2,
	RefreshCw,
	Target,
	TrendingUp,
	Users,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

interface TopSaver {
	userId: string;
	totalSavingsAmount: number;
	savingsCount: number;
	lastSavingsDate: string;
	firstSavingsDate: string;
	userDetails: {
		firstName: string;
		lastName: string;
		otherName: string;
		email: string;
		phone: string;
		savingsBalance: number;
		totalSavings: number;
		membershipLevel: string;
		membershipStatus: string;
	};
}

interface Statistics {
	totalSavingsVolume: number;
	totalTransactions: number;
	averageSavings: number;
	uniqueSaversCount: number;
}

export default function ExtraSavingsAnalyticsPage() {
	const { data: session } = useSession();
	const accessToken = session?.accessToken;

	const [topSavers, setTopSavers] = useState<TopSaver[]>([]);
	const [statistics, setStatistics] = useState<Statistics | null>(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [filters, setFilters] = useState({
		period: "month",
		limit: 20,
		page: 1,
	});
	const [searchTerm, setSearchTerm] = useState("");

	useEffect(() => {
		fetchTopSavers();
	}, [filters]);

	const fetchTopSavers = async () => {
		try {
			setLoading(true);
			const queryParams = new URLSearchParams({
				period: filters.period,
				limit: filters.limit.toString(),
				page: filters.page.toString(),
			});

			const res = await fetch(
				`/api/admin/analytics/top-savers?${queryParams}`,
				{
					method: "GET",
					headers: {
						Authorization: `Bearer ${accessToken}`,
					},
				}
			);

			const data = await res.json();
			if (data.status === "success") {
				setTopSavers(data.data.topSavers);
				setStatistics(data.data.statistics);
			}
		} catch (error) {
			console.error("Error fetching top savers:", error);
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	const handleRefresh = () => {
		setRefreshing(true);
		fetchTopSavers();
	};

	const handlePeriodChange = (period: string) => {
		setFilters((prev) => ({ ...prev, period, page: 1 }));
	};

	const handleLimitChange = (limit: number) => {
		setFilters((prev) => ({ ...prev, limit, page: 1 }));
	};

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("en-NG", {
			style: "currency",
			currency: "NGN",
		}).format(amount);
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	const getMembershipBadge = (level: string) => {
		const variants: Record<string, string> = {
			bronze: "bg-amber-100 text-amber-800",
			silver: "bg-gray-100 text-gray-800",
			gold: "bg-yellow-100 text-yellow-800",
			platinum: "bg-blue-100 text-blue-800",
		};

		return variants[level?.toLowerCase()] || "bg-gray-100 text-gray-800";
	};

	const filteredSavers = topSavers.filter(
		(saver) =>
			saver.userDetails?.firstName
				?.toLowerCase()
				.includes(searchTerm.toLowerCase()) ||
			saver.userDetails?.lastName
				?.toLowerCase()
				.includes(searchTerm.toLowerCase()) ||
			saver.userDetails?.email
				?.toLowerCase()
				.includes(searchTerm.toLowerCase()) ||
			saver.userDetails?.phone?.includes(searchTerm)
	);

	if (loading) {
		return (
			<>
				<HeaderBox title="Extra Savings Analytics" />
				<div className="flex justify-center items-center h-64">
					<Loader2 className="h-8 w-8 animate-spin" />
				</div>
			</>
		);
	}

	return (
		<>
			<HeaderBox title="Extra Savings Analytics" />

			<div className="p-6 space-y-6">
				{/* Filters Card */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Filter className="h-5 w-5" />
							Filters & Controls
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
							<div>
								<Label htmlFor="period">Time Period</Label>
								<Select
									value={filters.period}
									onValueChange={handlePeriodChange}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent className="bg-white">
										<SelectItem value="day">Today</SelectItem>
										<SelectItem value="week">This Week</SelectItem>
										<SelectItem value="month">This Month</SelectItem>
										<SelectItem value="year">This Year</SelectItem>
										<SelectItem value="all">All Time</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div>
								<Label htmlFor="limit">Results Limit</Label>
								<Select
									value={filters.limit.toString()}
									onValueChange={(value) => handleLimitChange(parseInt(value))}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent className="bg-white">
										<SelectItem value="10">Top 10</SelectItem>
										<SelectItem value="20">Top 20</SelectItem>
										<SelectItem value="50">Top 50</SelectItem>
										<SelectItem value="100">Top 100</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div>
								<Label htmlFor="search">Search Savers</Label>
								<Input
									placeholder="Search by name, email, phone..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
								/>
							</div>
							<div className="flex items-end">
								<Button
									onClick={handleRefresh}
									disabled={refreshing}
									className="w-full bg-primary-1 text-white">
									{refreshing ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										<RefreshCw className="h-4 w-4" />
									)}
									Refresh Data
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Statistics Cards */}
				{statistics && (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">
									Total Savings Volume
								</CardTitle>
								<DollarSign className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">
									{formatCurrency(statistics.totalSavingsVolume)}
								</div>
								<p className="text-xs text-muted-foreground">
									across {statistics.totalTransactions} transactions
								</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">
									Active Savers
								</CardTitle>
								<Users className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">
									{statistics.uniqueSaversCount}
								</div>
								<p className="text-xs text-muted-foreground">
									unique members saving
								</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">
									Average Savings
								</CardTitle>
								<BarChart3 className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">
									{formatCurrency(statistics.averageSavings)}
								</div>
								<p className="text-xs text-muted-foreground">per transaction</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">Period</CardTitle>
								<Calendar className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold capitalize">
									{filters.period}
								</div>
								<p className="text-xs text-muted-foreground">analysis period</p>
							</CardContent>
						</Card>
					</div>
				)}

				{/* Top Savers Table */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<Award className="h-5 w-5" />
								Top Savers Ranking
							</div>
							<Badge variant="secondary">
								{filteredSavers.length}{" "}
								{filteredSavers.length === 1 ? "Saver" : "Savers"}
							</Badge>
						</CardTitle>
						<CardDescription>
							Members ranked by their savings activity during the selected
							period
						</CardDescription>
					</CardHeader>
					<CardContent>
						{filteredSavers.length === 0 ? (
							<div className="text-center py-8">
								<Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
								<p className="text-gray-500">
									No savings data found for the selected period
								</p>
							</div>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Rank</TableHead>
										<TableHead>Member</TableHead>
										<TableHead>Contact</TableHead>
										<TableHead>Membership</TableHead>
										<TableHead>Total Savings</TableHead>
										<TableHead>Transactions</TableHead>
										<TableHead>Last Activity</TableHead>
										<TableHead>Current Balance</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{filteredSavers.map((saver, index) => (
										<TableRow
											key={saver.userId}
											className={index < 3 ? "bg-muted/50" : ""}>
											<TableCell>
												<div className="flex items-center gap-2">
													{index === 0 && (
														<Award className="h-4 w-4 text-yellow-500" />
													)}
													{index === 1 && (
														<Award className="h-4 w-4 text-gray-400" />
													)}
													{index === 2 && (
														<Award className="h-4 w-4 text-amber-600" />
													)}
													<span className="font-medium">#{index + 1}</span>
												</div>
											</TableCell>
											<TableCell>
												<div>
													<div className="font-medium">
														{saver.userDetails?.firstName}{" "}
														{saver.userDetails?.lastName}
													</div>
													<div className="text-sm text-gray-500">
														{saver.userDetails?.otherName}
													</div>
												</div>
											</TableCell>
											<TableCell>
												<div className="text-sm">
													<div>{saver.userDetails?.email}</div>
													<div className="text-gray-500">
														{saver.userDetails?.phone}
													</div>
												</div>
											</TableCell>
											<TableCell>
												<Badge
													variant="outline"
													className={getMembershipBadge(
														saver.userDetails?.membershipLevel
													)}>
													{saver.userDetails?.membershipLevel}
												</Badge>
											</TableCell>
											<TableCell className="font-semibold">
												{formatCurrency(saver.totalSavingsAmount)}
											</TableCell>
											<TableCell>
												<Badge variant="secondary">{saver.savingsCount}</Badge>
											</TableCell>
											<TableCell className="text-sm text-gray-500">
												{formatDate(saver.lastSavingsDate)}
											</TableCell>
											<TableCell className="font-medium">
												{formatCurrency(saver.userDetails?.savingsBalance || 0)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
					</CardContent>
				</Card>

				{/* Insights Card */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<TrendingUp className="h-5 w-5" />
							Savings Insights & Recommendations
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<h4 className="font-semibold mb-3">Top Performing Segments</h4>
								<ul className="space-y-2 text-sm">
									<li className="flex justify-between">
										<span>Highest single saver:</span>
										<span className="font-medium">
											{topSavers.length > 0
												? formatCurrency(topSavers[0].totalSavingsAmount)
												: "N/A"}
										</span>
									</li>
									<li className="flex justify-between">
										<span>Most active saver:</span>
										<span className="font-medium">
											{topSavers.length > 0
												? `${topSavers[0].savingsCount} transactions`
												: "N/A"}
										</span>
									</li>
									<li className="flex justify-between">
										<span>Average per saver:</span>
										<span className="font-medium">
											{statistics
												? formatCurrency(
														statistics.totalSavingsVolume /
															statistics.uniqueSaversCount
												  )
												: "N/A"}
										</span>
									</li>
								</ul>
							</div>
							<div>
								<h4 className="font-semibold mb-3">Encouragement Strategies</h4>
								<ul className="space-y-2 text-sm">
									<li>• Send congratulatory messages to top 10 savers</li>
									<li>• Create savings challenges for lower-ranked members</li>
									<li>• Offer bonus interest for consistent savers</li>
									<li>• Share success stories in newsletters</li>
								</ul>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</>
	);
}
