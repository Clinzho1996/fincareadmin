import HeaderBox from "@/components/HeaderBox";
import PayrollTable from "@/config/payroll-columns";

function Payroll() {
	return (
		<div className="w-full overflow-x-hidden">
			<HeaderBox title="Payroll Management" />
			<div className="bg-[#F6F8FA] flex flex-col px-4 py-2 gap-2 w-full max-w-[100vw]">
				<PayrollTable />
			</div>
		</div>
	);
}

export default Payroll;
