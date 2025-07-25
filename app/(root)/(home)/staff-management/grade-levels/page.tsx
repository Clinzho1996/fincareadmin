import HeaderBox from "@/components/HeaderBox";
import GradeTable from "@/config/grade-columns";
import SalaryTable from "@/config/salary-columns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@radix-ui/react-tabs";

function GradeLevels() {
	return (
		<div className="w-full overflow-x-hidden">
			<HeaderBox title="Grade Levels" />

			<div className="w-full bg-white rounded-b-lg py-5 border-x-[1px] border-b-[1px] border-[#E2E4E9]">
				<Tabs defaultValue="grade" className="bg-transparent">
					<TabsList className="flex flex-row h-fit flex-wrap justify-start bg-[#fff] w-fit ml-4 mr-4 gap-3 items-center border-[1px] border-[#E2E4E9] rounded-lg mb-4 p-1">
						<TabsTrigger
							value="grade"
							className="p-2 rounded-md data-[state=active]:bg-primary-2 data-[state=active]:text-primary-6 text-sm">
							Grade Levels
						</TabsTrigger>
						|
						<TabsTrigger
							value="salary"
							className="p-2 rounded-md data-[state=active]:bg-primary-2 data-[state=active]:text-primary-6 text-sm">
							Salary Heads
						</TabsTrigger>{" "}
					</TabsList>

					<div className="w-full px-4 mt-[100px] lg:mt-0">
						<TabsContent value="grade">
							<GradeTable />
						</TabsContent>
						<TabsContent value="salary">
							<SalaryTable />
						</TabsContent>
					</div>
				</Tabs>
			</div>
		</div>
	);
}

export default GradeLevels;
