import { sidebarLinks } from "@/constants";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const Sidebar = () => {
	const [isCollapsed, setIsCollapsed] = useState(false);
	// This state correctly holds only one expanded item's route at a time.
	const [expandedItem, setExpandedItem] = useState<string | null>(null);
	const pathname = usePathname();

	const isSettingsActive =
		pathname === "/settings" || pathname.startsWith("/settings");
	const { data: session } = useSession();
	// Function to get the name initials from the user's name

	const toggleSidebar = () => {
		setIsCollapsed(!isCollapsed);
	};

	const toggleItemExpansion = (route: string) => {
		// This toggles the expansion of the clicked item.
		// If it's already expanded, it collapses it.
		// If it's not expanded, it expands it (and implicitly collapses any other open item).
		setExpandedItem((prev) => (prev === route ? null : route));
	};

	const isActiveParent = (route: string, subLinks?: { route: string }[]) => {
		if (pathname === route) return true;
		if (subLinks) {
			return subLinks.some(
				(subLink) =>
					pathname === subLink.route || pathname.startsWith(`${subLink.route}/`)
			);
		}
		return false;
	};

	return (
		<section
			className={cn(
				"sticky left-0 top-0 flex h-screen w-fit flex-col border-r-[1px] justify-between bg-primary-1 text-dark-3 max-sm:hidden z-10",
				{
					"lg:w-[80px]": isCollapsed,
					"lg:w-[264px]": !isCollapsed,
				}
			)}>
			<div className="flex flex-1 flex-col gap-2">
				{/* Logo and Toggle Button */}
				<div className="flex items-center justify-between border-b-[#CED0D51A] p-3 h-[80px]">
					{!isCollapsed ? (
						<Link href="/" className="flex items-center gap-1">
							<Image
								src="/images/icon.png"
								alt="profile"
								className="object-cover w-full h-full sm:w-[40px] sm:h-[40px] rounded-full"
								width={80}
								height={80}
							/>
							<h2 className="text-white ">Fincare CMS</h2>
						</Link>
					) : (
						<Link href="/" className="flex items-center justify-center w-full">
							<Image
								src="/images/icon.png"
								alt="profile"
								className="object-cover w-full h-full lg:w-[40px] lg:h-[42px] rounded-full"
								width={30}
								height={30}
							/>
						</Link>
					)}
					<button
						onClick={toggleSidebar}
						className="hidden lg:flex items-center justify-center w-8 h-8 rounded-full hover:bg-[#E9E9EB17]">
						<Image
							src={
								isCollapsed
									? "/icons/arrow-right.svg"
									: "/icons/arrow-right.svg"
							}
							alt="Toggle sidebar"
							width={20}
							height={20}
							className="w-5 h-5 object-contain"
						/>
					</button>
				</div>

				{/* Sidebar Links */}
				{sidebarLinks.map((item) => {
					const isActive = isActiveParent(item.route, item.subLinks);
					const isExpanded = expandedItem === item.route && !isCollapsed; // This correctly checks if *this* item is the one expanded

					return (
						<div key={item.label} className="flex flex-col">
							<div
								className={cn(
									"flex items-center justify-center sm:justify-start rounded-[8px] mx-auto sm:mx-4 my-0 border-[1px] border-[#FFFFFF0A] cursor-pointer",
									{
										"shadow-inner shadow-[#C3FF9D38] border-[1px] border-[#fff]":
											isActive,
										"p-2": !isCollapsed,
										"p-3": isCollapsed,
									}
								)}
								onClick={() =>
									item.subLinks && toggleItemExpansion(item.route)
								}>
								<div className="flex gap-2 items-center w-full">
									<Image
										src={item.imgUrl}
										alt={item.label}
										width={20}
										height={20}
										className="w-[20px] h-[20px] object-contain flex"
									/>
									{!isCollapsed && (
										<>
											{/* Link for the parent item */}
											<Link
												href={item.route}
												className={cn(
													"text-sm font-normal font-inter text-[#E9E9EB] flex-1 hover:no-underline",
													{
														"text-[#E9E9EB]": isActive,
													}
												)}
												// Prevent propagation to avoid toggling expansion when clicking the link itself
												onClick={(e) => e.stopPropagation()}>
												{item.label}
											</Link>
											{item.subLinks && (
												<Image
													src={
														isExpanded
															? "/icons/chevron-up.svg"
															: "/icons/chevron-down.svg"
													}
													alt={isExpanded ? "Collapse" : "Expand"}
													width={16}
													height={16}
													className="w-4 h-4 object-contain"
												/>
											)}
										</>
									)}
								</div>
							</div>

							{/* Sub-items */}
							{!isCollapsed && isExpanded && item.subLinks && (
								<div className="ml-8 mt-1 flex flex-col gap-1 w-[80%]">
									{item.subLinks.map((subItem) => {
										const isSubActive =
											pathname === subItem.route ||
											pathname.startsWith(`${subItem.route}/`);

										return (
											<Link
												href={subItem.route}
												key={subItem.route}
												className={cn(
													"flex items-center justify-start rounded-[8px] px-3 py-2 text-sm font-normal font-inter text-[#E9E9EB]",
													{
														"bg-[#E9E9EB17]": isSubActive,
													}
												)}>
												{subItem.label}
											</Link>
										);
									})}
								</div>
							)}
						</div>
					);
				})}
			</div>

			<div className="flex flex-col gap-1 mb-4">
				<div className="flex flex-col mx-0 gap-2 border-b-[1px] border-[#E2E4E9] py-2">
					<Link
						href="/system-settings"
						className={cn(
							"flex items-center justify-center sm:justify-start rounded-[8px] mx-auto sm:mx-4 my-0 border-[1px] border-[#FFFFFF0A] cursor-pointer p-2",
							{
								"shadow-inner shadow-[#C3FF9D38] border-[1px] border-[#fff]":
									isSettingsActive,
							}
						)}>
						{!isCollapsed ? (
							<div className="flex gap-2 items-center justify-start rounded-[8px] my-0">
								<Image
									src="/icons/settings.svg"
									alt="settings"
									width={20}
									height={20}
									className="w-[20px] h-[20px] object-contain flex"
								/>
								<p className="text-sm font-normal font-inter  text-white">
									System Settings
								</p>
							</div>
						) : (
							<div className="flex gap-2 items-center justify-start rounded-[8px] my-0">
								<Image
									src="/icons/settings.svg"
									alt="settings"
									width={20}
									height={20}
									className="w-[20px] h-[20px] object-contain flex"
								/>
							</div>
						)}
					</Link>
				</div>
				{session?.user && (
					<div className="md:flex flex-row justify-start gap-2 items-center mx-4 px-2 rounded-lg mt-2">
						<div className="flex justify-center items-center border-[1px] border-dark-3 rounded-full overflow-hidden">
							<Image
								src="/images/icon.png"
								alt="profile"
								className="object-cover w-[40px] h-[40px] sm:w-[40px] sm:h-[40px] rounded-full"
								width={80}
								height={80}
							/>
						</div>
						<div className="lg:block">
							<h3 className="text-white text-sm font-normal font-inter">
								Fincare Admin
							</h3>
							<h3 className="text-xs text-white">{session.user.email}</h3>
						</div>
					</div>
				)}
			</div>
		</section>
	);
};

export default Sidebar;
