import HeaderBox from "@/components/HeaderBox";
import CustomerTable from "@/config/customer-columns";

function Customers() {
	return (
		<div className="w-full overflow-x-hidden">
			<HeaderBox title="Customer Management" />
			<div className="bg-[#F6F8FA] flex flex-col px-4 py-2 gap-2 w-full max-w-[100vw]">
				<CustomerTable />
			</div>
		</div>
	);
}

export default Customers;
