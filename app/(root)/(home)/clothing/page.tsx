import ClothGrid from "@/components/ClothGrid";
import HeaderBox from "@/components/HeaderBox";
import { dummyClothes } from "@/constants/cloth";

function Clothing() {
	return (
		<div className="w-full overflow-x-hidden">
			<HeaderBox title="Clothing Items" />
			<div className="bg-[#fff] flex flex-col px-4 py-2 gap-2 w-full max-w-[100vw]">
				<ClothGrid clothes={dummyClothes} />
			</div>
		</div>
	);
}

export default Clothing;
