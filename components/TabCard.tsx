import Image from "next/image";

function TabCard({
	title,
	value,
	icon,
}: {
	title: string;
	value: number;
	icon: string;
}) {
	return (
		<div className="flex flex-row justify-between items-center gap-2 bg-primary-2 p-3 rounded-lg w-[200px] border border-[#C6DCEA]">
			<div>
				<h2 className="text-sm  text-primary-1 font-normal">{title}</h2>
				<p className="text-2xl font-bold">{value}</p>
			</div>
			<div>
				<Image src={icon} alt="Logo" width={30} height={30} />
			</div>
		</div>
	);
}

export default TabCard;
