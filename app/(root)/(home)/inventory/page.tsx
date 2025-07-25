import HeaderBox from "@/components/HeaderBox";
import InventoryTable from "@/config/inventory-columns";

function Inventory() {
	return (
		<div className="w-full overflow-x-hidden">
			<HeaderBox title="Inventory" />
			<div className="bg-[#F6F8FA] flex flex-col px-4 py-2 gap-2 w-full max-w-[100vw]">
				<InventoryTable />
			</div>
		</div>
	);
}

export default Inventory;
