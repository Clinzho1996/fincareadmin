// components/ActionCard.js
function ActionCard({ title, amount, change, subtitle }) {
	const isPositive = change >= 0;
	const changeColor = isPositive ? "text-green-600" : "text-red-600";
	const changeIcon = isPositive ? "↗" : "↘";

	return (
		<div className="flex-1 bg-white rounded-lg shadow-md p-6 border border-gray-200 h-[160px]">
			<h3 className="text-sm font-medium text-gray-600 mb-2">{title}</h3>
			<p className="text-2xl font-bold text-gray-900 mb-2">{amount}</p>

			{change !== undefined && (
				<div className="flex items-center gap-1 mb-2">
					<span className={`text-sm font-medium ${changeColor}`}>
						{changeIcon} {Math.abs(change).toFixed(1)}%
					</span>
					<span className="text-xs text-gray-500">from last month</span>
				</div>
			)}

			{subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
		</div>
	);
}

export default ActionCard;
