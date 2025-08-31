import HeaderBox from "@/components/HeaderBox";
import AdminLoansDashboard from "@/config/loan-column";

function Leave() {
	return (
		<div className="w-full overflow-x-hidden">
			<HeaderBox title="Loan Management" />
			<div className="bg-[#F6F8FA] flex flex-col px-4 py-2 gap-2 w-full max-w-[100vw]">
				<AdminLoansDashboard />
			</div>
		</div>
	);
}

export default Leave;
