import HeaderBox from "@/components/HeaderBox";
import SalesTable from "@/config/sales-columns";

function AllSales() {
	return (
		<div className="w-full overflow-x-hidden">
			<HeaderBox title="All Sales" />
			<div className="bg-[#F6F8FA] flex flex-col px-4 py-2 gap-2 w-full max-w-[100vw]">
                <SalesTable />
            </div>
		</div>
	);
}

export default AllSales;
