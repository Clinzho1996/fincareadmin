"use client";

import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetTrigger,
} from "@/components/ui/sheet";
import { sidebarLinks } from "@/constants";
import { cn } from "@/lib/utils";
import { IconMenu } from "@tabler/icons-react";
import { signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { toast } from "react-toastify";

const MobileNav = () => {
	const [isCollapsed, setIsCollapsed] = useState(false);
	const pathname = usePathname();

	const handleLogout = async () => {
		try {
			await signOut({ redirect: true, callbackUrl: "/sign-in" });
			toast.success("Logout successful!");
		} catch (error) {
			toast.error("Failed to log out. Please try again.");
			console.error("Sign-out error:", error);
		}
	};

	const toggleSidebar = () => {
		setIsCollapsed(!isCollapsed);
	};
	// Function to get the name initials from the user's name

	return (
		<section className="w-fulll max-w-[264px]">
			<Sheet>
				<SheetTrigger>
					<IconMenu />
				</SheetTrigger>
				<SheetContent side="left" className="border-none bg-primary-1">
					<div className="flex h-[calc(100vh-72px)] flex-col justify-between overflow-y-auto">
						<SheetClose asChild>
							<>
								<div className="flex flex-1 flex-col gap-2">
									{/* Logo and Toggle Button */}
									<div className="flex items-center justify-between border-b-[#CED0D51A] p-3 h-[80px]">
										{!isCollapsed ? (
											<Link href="/" className="flex items-center gap-1">
												<Image
													src="/images/logo.png"
													alt="Kuditrak Logo"
													width={100}
													height={50}
													className="w-fit justify-center h-[35px] flex flex-row"
												/>
											</Link>
										) : (
											<Link
												href="/"
												className="flex items-center justify-center w-full min-w-[250px]">
												<Image
													src="/images/kudilogo.png"
													alt="Kuditrak Logo"
													width={150}
													height={50}
													className="w-[250px] h-auto object-contain"
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

									{!isCollapsed && (
										<>
											<p className="text-sm font-normal text-dark-2 pl-4 font-inter py-2">
												MENU
											</p>
										</>
									)}

									{/* Sidebar Links */}
									{sidebarLinks.map((item) => {
										const isActive =
											pathname === item.route ||
											pathname.startsWith(`${item.route}/`);

										return (
											<Link
												href={item.route}
												key={item.label}
												className={cn(
													"flex items-center w-full justify-start rounded-[8px] mx-auto sm:mx-4 my-0 border-[1px] border-[#FFFFFF0A]",
													{
														"shadow-inner shadow-[#C3FF9D38] border-[1px] border-[#C3FF9D]":
															isActive,
														"p-2": !isCollapsed,
														"p-3": isCollapsed,
													}
												)}>
												<div className="flex gap-2 items-center">
													<Image
														src={item.imgUrl}
														alt={item.label}
														width={20}
														height={20}
														className="w-[20px] h-[20px] object-contain flex"
													/>
													{!isCollapsed && (
														<p
															className={cn(
																"text-sm font-normal font-inter text-[#E9E9EB]",
																{
																	"text-[#E9E9EB]": isActive,
																}
															)}>
															{item.label}
														</p>
													)}
												</div>
											</Link>
										);
									})}
								</div>

								{/* Logout Button */}
								<div className="flex flex-col  w-full mt-4">
									<div
										className={cn(
											"flex items-center w-full justify-center sm:justify-start mx-4 my-0 cursor-pointer border-t-[1px] border-[#CED0D51A]",
											{
												"p-2": !isCollapsed,
												"p-3": isCollapsed,
											}
										)}
										onClick={handleLogout}>
										<div className="flex gap-2 items-center">
											<Image
												src="/icons/logout.svg"
												alt="settings"
												width={20}
												height={20}
												className="w-[20px] h-[20px] object-contain flex"
											/>
											{!isCollapsed && (
												<p className="text-sm font-normal font-inter text-[#E9E9EB]">
													Logout
												</p>
											)}
										</div>
									</div>
								</div>
							</>
						</SheetClose>
					</div>
				</SheetContent>
			</Sheet>
		</section>
	);
};

export default MobileNav;
