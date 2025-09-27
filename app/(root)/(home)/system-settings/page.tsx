// app/admin/settings/page.jsx
"use client";

import HeaderBox from "@/components/HeaderBox";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	AlertCircle,
	CheckCircle,
	DollarSign,
	History,
	Loader2,
	Settings,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

interface LoanSettings {
	interestRate: number;
	processingFeeRate: number;
	updatedAt: string;
	updatedBy: string;
}

interface SettingsHistory {
	_id: string;
	previousSettings: LoanSettings;
	updatedBy: string;
	updatedAt: string;
}

export default function AdminSettingsPage() {
	const { data: session } = useSession();
	const accessToken = session?.accessToken;

	const [settings, setSettings] = useState<LoanSettings | null>(null);
	const [history, setHistory] = useState<SettingsHistory[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState<{
		type: "success" | "error";
		text: string;
	} | null>(null);

	const [formData, setFormData] = useState({
		interestRate: "",
		processingFeeRate: "",
	});

	useEffect(() => {
		fetchSettings();
	}, []);

	const fetchSettings = async () => {
		try {
			setLoading(true);
			const res = await fetch("/api/admin/loans/settings", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			});

			const data = await res.json();
			if (data.status === "success") {
				setSettings(data.data);
				setFormData({
					interestRate: data.data.interestRate.toString(),
					processingFeeRate: data.data.processingFeeRate.toString(),
				});
			}
		} catch (error) {
			console.error("Error fetching settings:", error);
			setMessage({ type: "error", text: "Failed to load settings" });
		} finally {
			setLoading(false);
		}
	};

	const fetchHistory = async () => {
		try {
			const res = await fetch("/api/admin/settings/history", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			});

			const data = await res.json();
			if (data.status === "success") {
				setHistory(data.data.history);
			}
		} catch (error) {
			console.error("Error fetching history:", error);
		}
	};

	const saveSettings = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!formData.interestRate || parseFloat(formData.interestRate) <= 0) {
			setMessage({ type: "error", text: "Please enter a valid interest rate" });
			return;
		}

		setSaving(true);
		setMessage(null);

		try {
			const res = await fetch("/api/admin/loans/settings", {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${accessToken}`,
				},
				body: JSON.stringify({
					interestRate: parseFloat(formData.interestRate),
					processingFeeRate: formData.processingFeeRate
						? parseFloat(formData.processingFeeRate)
						: undefined,
				}),
			});

			const data = await res.json();

			if (data.status === "success") {
				setMessage({
					type: "success",
					text: "Loan settings updated successfully! New loans will use these rates.",
				});
				fetchSettings(); // Refresh settings
				fetchHistory(); // Refresh history
			} else {
				setMessage({
					type: "error",
					text: data.error || "Failed to update settings",
				});
			}
		} catch (error) {
			console.error("Error saving settings:", error);
			setMessage({ type: "error", text: "Failed to update settings" });
		} finally {
			setSaving(false);
		}
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	if (loading) {
		return (
			<>
				<HeaderBox title="Loan Settings" />
				<div className="flex justify-center items-center h-64">
					<Loader2 className="h-8 w-8 animate-spin" />
				</div>
			</>
		);
	}

	return (
		<>
			<HeaderBox title="Loan Settings" />
			<div className="p-6 space-y-6">
				{message && (
					<Alert
						className={
							message.type === "success"
								? "bg-green-50 border-green-200"
								: "bg-red-50 border-red-200"
						}>
						{message.type === "success" ? (
							<CheckCircle className="h-4 w-4 text-green-600" />
						) : (
							<AlertCircle className="h-4 w-4 text-red-600" />
						)}
						<AlertDescription
							className={
								message.type === "success" ? "text-green-800" : "text-red-800"
							}>
							{message.text}
						</AlertDescription>
					</Alert>
				)}

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Current Settings Card */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Settings className="h-5 w-5" />
								Current Loan Settings
							</CardTitle>
							<CardDescription>
								These rates will be applied to all new loan applications
							</CardDescription>
						</CardHeader>
						<CardContent>
							{settings ? (
								<div className="space-y-4">
									<div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
										<span className="font-medium">Interest Rate</span>
										<Badge variant="secondary" className="text-lg">
											{settings.interestRate}%
										</Badge>
									</div>
									<div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
										<span className="font-medium">Processing Fee Rate</span>
										<Badge variant="secondary" className="text-lg">
											{settings.processingFeeRate}%
										</Badge>
									</div>
									<div className="text-sm text-gray-500 mt-4">
										Last updated: {formatDate(settings.updatedAt)}
									</div>
								</div>
							) : (
								<p className="text-gray-500">No settings found</p>
							)}
						</CardContent>
					</Card>

					{/* Update Settings Card */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<DollarSign className="h-5 w-5" />
								Update Loan Rates
							</CardTitle>
							<CardDescription>
								Change the interest and processing fee rates for new loans
							</CardDescription>
						</CardHeader>
						<CardContent>
							<form onSubmit={saveSettings} className="space-y-4">
								<div>
									<Label htmlFor="interestRate">Interest Rate (%)</Label>
									<Input
										id="interestRate"
										type="number"
										step="0.1"
										min="0.1"
										max="50"
										value={formData.interestRate}
										onChange={(e) =>
											setFormData({ ...formData, interestRate: e.target.value })
										}
										placeholder="Enter interest rate"
										required
									/>
									<p className="text-sm text-gray-500 mt-1">
										Annual interest rate applied to loans
									</p>
								</div>
								<div>
									<Label htmlFor="processingFeeRate">
										Processing Fee Rate (%)
									</Label>
									<Input
										id="processingFeeRate"
										type="number"
										step="0.1"
										min="0"
										max="10"
										value={formData.processingFeeRate}
										onChange={(e) =>
											setFormData({
												...formData,
												processingFeeRate: e.target.value,
											})
										}
										placeholder="Enter processing fee rate"
									/>
									<p className="text-sm text-gray-500 mt-1">
										One-time processing fee applied to loan amount
									</p>
								</div>
								<Button
									type="submit"
									disabled={saving}
									className="w-full bg-primary-1 text-white">
									{saving ? (
										<>
											<Loader2 className="h-4 w-4 animate-spin mr-2" />
											Updating Settings...
										</>
									) : (
										<>
											<Settings className="h-4 w-4 mr-2" />
											Update Loan Rates
										</>
									)}
								</Button>
							</form>
						</CardContent>
					</Card>
				</div>

				{/* Settings Impact Information */}
				<Card>
					<CardHeader>
						<CardTitle>Rate Change Impact</CardTitle>
						<CardDescription>
							How these rates affect loan calculations
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Loan Amount</TableHead>
									<TableHead>Duration</TableHead>
									<TableHead>Interest ({formData.interestRate}%)</TableHead>
									<TableHead>
										Processing Fee ({formData.processingFeeRate}%)
									</TableHead>
									<TableHead>Total Repayment</TableHead>
									<TableHead>Monthly Payment</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{[100000, 500000, 1000000].map((amount) => (
									<TableRow key={amount}>
										<TableCell>₦{amount.toLocaleString()}</TableCell>
										<TableCell>12 months</TableCell>
										<TableCell>
											₦
											{(
												amount *
												(parseFloat(formData.interestRate) / 100)
											).toLocaleString()}
										</TableCell>
										<TableCell>
											₦
											{(
												amount *
												(parseFloat(formData.processingFeeRate) / 100)
											).toLocaleString()}
										</TableCell>
										<TableCell className="font-semibold">
											₦
											{(
												amount +
												amount * (parseFloat(formData.interestRate) / 100)
											).toLocaleString()}
										</TableCell>
										<TableCell>
											₦
											{(
												(amount +
													amount * (parseFloat(formData.interestRate) / 100)) /
												12
											).toLocaleString()}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>

				{/* Settings History */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<History className="h-5 w-5" />
							Settings Change History
						</CardTitle>
						<CardDescription>
							Track changes to loan rates over time
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button onClick={fetchHistory} variant="outline" className="mb-4">
							<History className="h-4 w-4 mr-2" />
							Load History
						</Button>

						{history.length === 0 ? (
							<p className="text-gray-500 text-center py-8">
								No history available
							</p>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Date Changed</TableHead>
										<TableHead>Interest Rate</TableHead>
										<TableHead>Processing Fee</TableHead>
										<TableHead>Changed By</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{history.map((record) => (
										<TableRow key={record._id}>
											<TableCell>{formatDate(record.updatedAt)}</TableCell>
											<TableCell>
												<Badge variant="outline">
													{record.previousSettings.interestRate}%
												</Badge>
											</TableCell>
											<TableCell>
												<Badge variant="outline">
													{record.previousSettings.processingFeeRate}%
												</Badge>
											</TableCell>
											<TableCell className="text-sm text-gray-500">
												Admin
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
					</CardContent>
				</Card>
			</div>
		</>
	);
}
