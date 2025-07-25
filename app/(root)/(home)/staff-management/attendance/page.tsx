import HeaderBox from "@/components/HeaderBox";
import AttendanceTable from "@/config/attendance-columns";
import AttendanceSummaryTable from "@/config/attendance-summary-columns";

function Attendance() {
	return (
		<div className="w-full overflow-x-hidden">
			<HeaderBox title="Attendance Management" />
			<div className="bg-[#F6F8FA] flex flex-col px-4 py-2 gap-2 w-full max-w-[100vw]">
				<AttendanceTable />
				<AttendanceSummaryTable />
			</div>
		</div>
	);
}

export default Attendance;
