import ActionCard from "./ActionCard";

function Hero() {
	const formattedAmount = (amount: number) => {
		return new Intl.NumberFormat("en-NG", {
			style: "currency",
			currency: "NGN",
		}).format(amount);
	};
	return (
		<div className="flex flex-row justify-between items-center gap-4 w-full max-w-[100vw]">
			<ActionCard title="Total Revenue" amount={formattedAmount(1000000)} />
			<ActionCard title="Total Expenses" amount={formattedAmount(500000)} />
			<ActionCard title="Next Payout" amount={formattedAmount(2100000)} />
			<ActionCard title="Total Inventory" amount={formattedAmount(150000)} />
			<ActionCard title="Total Staff" amount={80} />
			<ActionCard title="Stores" amount={23} />
		</div>
	);
}

export default Hero;
