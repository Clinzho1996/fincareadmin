import HeaderBox from "@/components/HeaderBox";
import PaymentTable from "@/config/payment-columns";

function Payments() {
	return (
		<div className="w-full overflow-x-hidden">
			<HeaderBox title="Payment Management" />
			<div className="bg-[#F6F8FA] flex flex-col px-4 py-2 gap-2 w-full max-w-[100vw]">
				<PaymentTable />
			</div>
		</div>
	);
}

export default Payments;
