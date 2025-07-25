import HeaderBox from "@/components/HeaderBox";
import StoreTable from "@/config/store-columns";

function Stores() {
	return (
		<div className="w-full overflow-x-hidden">
			<HeaderBox title="Store Management" />
			<div className="bg-[#F6F8FA] flex flex-col px-4 py-2 gap-2 w-full max-w-[100vw]">
				<StoreTable />
			</div>
		</div>
	);
}

export default Stores;
