import HeaderBox from "@/components/HeaderBox";
import FinesManagement from "@/components/SavedFines";
import FineTable from "@/config/fine-columns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@radix-ui/react-tabs";

function Fines() {
	return (
		<div className="w-full overflow-x-hidden">
			<HeaderBox title="Fine Management" />

			<div className="w-full bg-white rounded-b-lg py-5 border-x-[1px] border-b-[1px] border-[#E2E4E9]">
				<Tabs defaultValue="saved" className="bg-transparent">
					<TabsList className="flex flex-row h-fit flex-wrap justify-start bg-[#fff] w-fit ml-4 mr-4 gap-3 items-center border-[1px] border-[#E2E4E9] rounded-lg mb-4 p-1">
						<TabsTrigger
							value="saved"
							className="p-2 rounded-md data-[state=active]:bg-primary-2 data-[state=active]:text-primary-6 text-sm">
							Saved Fines
						</TabsTrigger>
						|
						<TabsTrigger
							value="history"
							className="p-2 rounded-md data-[state=active]:bg-primary-2 data-[state=active]:text-primary-6 text-sm">
							Fine History
						</TabsTrigger>{" "}
					</TabsList>

					<div className="w-full px-4 mt-[100px] lg:mt-0">
						<TabsContent value="saved">
							<FinesManagement />
						</TabsContent>
						<TabsContent value="history">
							<FineTable />
						</TabsContent>
					</div>
				</Tabs>
			</div>
		</div>
	);
}

export default Fines;
