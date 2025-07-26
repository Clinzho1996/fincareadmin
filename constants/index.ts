export const sidebarLinks = [
	{
		label: "Dashboard",
		route: "/",
		imgUrl: "/icons/dashboard.svg",
	},
	{
		label: "Staff Management",
		route: "/staff-management/all",
		imgUrl: "/icons/staff.svg",
		subLinks: [
			{ label: "All Staff", route: "/staff-management/all" },
			{ label: "Roles", route: "/staff-management/roles" },
		],
	},

	{
		label: "Customer Management",
		route: "/customers",
		imgUrl: "/icons/customers.svg",
	},
	{
		label: "Subscription Management",
		route: "/payments",
		imgUrl: "/icons/payments.svg",
	},
	{
		label: "Loan Management",
		route: "/loans",
		imgUrl: "/icons/orders.svg",
	},

	{
		label: "Investment Management",
		route: "/investment",
		imgUrl: "/icons/inventory.svg",
	},
	{
		label: "Inbox",
		route: "/inbox",
		imgUrl: "/icons/inbox.svg",
	},
];
