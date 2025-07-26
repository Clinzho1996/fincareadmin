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
			<ActionCard title="Total Loans" amount={formattedAmount(1000000)} />
			<ActionCard title="Total Investment" amount={formattedAmount(500000)} />
			<ActionCard title="Total Savings" amount={formattedAmount(2100000)} />
			<ActionCard title="Total Users" amount={80} />
		</div>
	);
}

export default Hero;
