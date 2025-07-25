function ActionCard({
	title,
	amount,
}: {
	title: string;
	amount: string | number;
}) {
	return (
		<div className="bg-[#ECF3F8] p-4 rounded-lg shadow-md flex flex-col items-start border-l-4 border-[#649ABC] w-full">
			<h2 className="text-sm  text-primary-1 font-normal">{title}</h2>
			<p className="text-2xl font-bold">{amount}</p>
		</div>
	);
}

export default ActionCard;
