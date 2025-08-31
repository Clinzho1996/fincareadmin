import HeaderBox from "@/components/HeaderBox";
import { InvestmentDataTable } from "@/config/inventory-table";

function Inventory() {
	return (
		<div className="w-full overflow-x-hidden">
			<HeaderBox title="Fixed Investment Management" />
			<div className="bg-[#F6F8FA] flex flex-col px-4 py-2 gap-2 w-full max-w-[100vw]">
				<InvestmentDataTable />
			</div>
		</div>
	);
}

export default Inventory;
