import HeaderBox from "@/components/HeaderBox";
import RolesTable from "@/config/roles-columns";

function Roles() {
	return (
		<div className="w-full overflow-x-hidden">
			<HeaderBox title="Roles" />
			<div className="bg-[#F6F8FA] flex flex-col px-4 py-2 gap-2 w-full max-w-[100vw]">
				<RolesTable />
			</div>
		</div>
	);
}

export default Roles;
