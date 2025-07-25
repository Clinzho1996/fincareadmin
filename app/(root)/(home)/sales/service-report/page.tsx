import HeaderBox from "@/components/HeaderBox";
import ReportsTable from "@/config/reports-columns";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@radix-ui/react-tabs";

function ServiceReport() {
	return (
		<div className="w-full overflow-x-hidden">
			<HeaderBox title="Service Report" />

			<div className="w-full bg-white rounded-b-lg py-5 border-x-[1px] border-b-[1px] border-[#E2E4E9]">
				<Tabs defaultValue="laundry" className="bg-transparent">
					<TabsList className="flex flex-row h-fit flex-wrap justify-start bg-[#fff] w-fit ml-4 mr-4 gap-3 items-center border-[1px] border-[#E2E4E9] rounded-lg mb-4 p-1">
						<TabsTrigger
							value="laundry"
							className="p-2 rounded-md data-[state=active]:bg-primary-2 data-[state=active]:text-primary-6 text-sm">
							Laundry
						</TabsTrigger>
						|
						<TabsTrigger
							value="iron"
							className="p-2 rounded-md data-[state=active]:bg-primary-2 data-[state=active]:text-primary-6 text-sm">
							Iron
						</TabsTrigger>
						|
						<TabsTrigger
							value="dry"
							className="p-2 rounded-md data-[state=active]:bg-primary-2 data-[state=active]:text-primary-6 text-sm">
							Dry Clean
						</TabsTrigger>
						|
						<TabsTrigger
							value="stain"
							className="p-2 rounded-md data-[state=active]:bg-primary-2 data-[state=active]:text-primary-6 text-sm">
							Stain Remove
						</TabsTrigger>
						|
						<TabsTrigger
							value="sales"
							className="p-2 rounded-md data-[state=active]:bg-primary-2 data-[state=active]:text-primary-6 text-sm">
							Sales Inventory Item
						</TabsTrigger>
					</TabsList>

					<div className="w-full px-4 mt-[100px] lg:mt-0">
						<TabsContent value="laundry">
							<ReportsTable />
						</TabsContent>
						<TabsContent value="iron">
							<ReportsTable />
						</TabsContent>
						<TabsContent value="dry">
							<ReportsTable />
						</TabsContent>
						<TabsContent value="stain">
							<ReportsTable />
						</TabsContent>
						<TabsContent value="sales">
							<ReportsTable />
						</TabsContent>
					</div>
				</Tabs>
			</div>
		</div>
	);
}

export default ServiceReport;
