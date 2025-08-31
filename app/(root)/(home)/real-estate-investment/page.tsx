import HeaderBox from "@/components/HeaderBox";
import { RealEstateDataTable } from "@/config/real-estate";

function Inventory() {
	return (
		<div className="w-full overflow-x-hidden">
			<HeaderBox title="Real Estate Investment Management" />
			<div className="bg-[#F6F8FA] flex flex-col px-4 py-2 gap-2 w-full max-w-[100vw]">
				<RealEstateDataTable />
			</div>
		</div>
	);
}

export default Inventory;
