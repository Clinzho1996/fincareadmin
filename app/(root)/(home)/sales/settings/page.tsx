import HeaderBox from "@/components/HeaderBox";
import CategoriesTable from "@/config/categories-columns";

function Settings() {
	return (
		<div className="w-full overflow-x-hidden">
			<HeaderBox title="Settings" />
			<div className="bg-[#F6F8FA] flex flex-col px-4 py-2 gap-2 w-full max-w-[100vw]">
				<CategoriesTable />
			</div>
		</div>
	);
}

export default Settings;
