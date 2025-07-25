import HeaderBox from "@/components/HeaderBox";
import QuotesTable from "@/config/quotes-columns";

function Quotes() {
	return (
		<div className="w-full overflow-x-hidden">
			<HeaderBox title="Quotes" />
			<div className="bg-[#F6F8FA] flex flex-col px-4 py-2 gap-2 w-full max-w-[100vw]">
				<QuotesTable />
			</div>
		</div>
	);
}

export default Quotes;
