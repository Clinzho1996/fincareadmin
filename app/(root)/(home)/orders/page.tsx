import HeaderBox from "@/components/HeaderBox";
import OrderTable from "@/config/order-columns";

function Orders() {
	return (
		<div className="w-full overflow-x-hidden">
			<HeaderBox title="Order Management" />
			<div className="bg-[#F6F8FA] flex flex-col px-4 py-2 gap-2 w-full max-w-[100vw]">
				<OrderTable />
			</div>
		</div>
	);
}

export default Orders;
