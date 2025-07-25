export const sidebarLinks = [
	{
		label: "Dashboard",
		route: "/",
		imgUrl: "/icons/dashboard.svg",
	},
	{
		label: "Sales",
		route: "/sales/all-sales",
		imgUrl: "/icons/sales.svg",
		subLinks: [
			{ label: "All Sales", route: "/sales/all-sales" },
			{ label: "Service Report", route: "/sales/service-report" },
			{ label: "Quotes", route: "/sales/quotes" },
			{ label: "Settings", route: "/sales/settings" },
		],
	},
	{
		label: "Staff Management",
		route: "/staff-management/all",
		imgUrl: "/icons/staff.svg",
		subLinks: [
			{ label: "All Staff", route: "/staff-management/all" },
			{ label: "Roles", route: "/staff-management/roles" },
			{ label: "Grade Levels", route: "/staff-management/grade-levels" },
			{ label: "Attendance", route: "/staff-management/attendance" },
			{ label: "Leave", route: "/staff-management/leave" },
		],
	},
	{
		label: "Payroll Management",
		route: "/payroll-management/all",
		imgUrl: "/icons/payroll.svg",
		subLinks: [
			{ label: "Payroll", route: "/payroll-management/all" },
			{ label: "Fines", route: "/payroll-management/fines" },
		],
	},
	{
		label: "Stores",
		route: "/stores",
		imgUrl: "/icons/stores.svg",
	},
	{
		label: "Customers",
		route: "/customers",
		imgUrl: "/icons/customers.svg",
	},
	{
		label: "Orders",
		route: "/orders",
		imgUrl: "/icons/orders.svg",
	},
	{
		label: "Payments",
		route: "/payments",
		imgUrl: "/icons/payments.svg",
	},
	{
		label: "Inventory",
		route: "/inventory",
		imgUrl: "/icons/inventory.svg",
	},
	{
		label: "Clothing Items",
		route: "/clothing",
		imgUrl: "/icons/clothing.svg",
	},
	{
		label: "Inbox",
		route: "/inbox",
		imgUrl: "/icons/inbox.svg",
	},
];
