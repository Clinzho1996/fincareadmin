import FinanceReport from "@/components/FinanceReport";
import HeaderBox from "@/components/HeaderBox";
import Hero from "@/components/Hero";
import SalesTracker from "@/components/SalesTracker";
import Table from "@/config/columns";

function Dashboard() {
	return (
		<div className="w-full overflow-x-hidden">
			<HeaderBox title="Dashboard" />
			<div className="bg-[#F6F8FA] flex flex-col px-6 py-4 w-full max-w-[100vw] gap-4">
				{/* Dashboard content goes here */}
				<Hero />
				<div className="flex flex-col lg:flex-row gap-4">
					<SalesTracker />
					<FinanceReport />
				</div>

				<Table />
			</div>
		</div>
	);
}

export default Dashboard;
