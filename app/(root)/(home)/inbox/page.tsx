import CustomerMessaging from "@/components/CustomerMessaging";
import HeaderBox from "@/components/HeaderBox";

function Inbox() {
	return (
		<div className="w-full overflow-x-hidden">
			<HeaderBox title="Inbox" />
			<div className="bg-[#F6F8FA] flex flex-col px-4 py-2 gap-2 w-full max-w-[100vw]">
				<CustomerMessaging />
			</div>
		</div>
	);
}

export default Inbox;
