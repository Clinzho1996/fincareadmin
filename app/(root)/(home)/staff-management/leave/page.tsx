import HeaderBox from "@/components/HeaderBox";
import LeaveTable from "@/config/leave-columns";

function Leave() {
	return (
		<div className="w-full overflow-x-hidden">
			<HeaderBox title="Leave Management" />
			<div className="bg-[#F6F8FA] flex flex-col px-4 py-2 gap-2 w-full max-w-[100vw]">
				<LeaveTable />
			</div>
		</div>
	);
}

export default Leave;
