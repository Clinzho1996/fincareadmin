import HeaderBox from "@/components/HeaderBox";
import AuctionTable from "@/config/auction-column";

function Auction() {
	return (
		<div className="w-full overflow-x-hidden">
			<HeaderBox title="Auction Management" />
			<div className="bg-[#F6F8FA] flex flex-col px-4 py-2 gap-2 w-full max-w-[100vw]">
				<AuctionTable />
			</div>
		</div>
	);
}

export default Auction;
