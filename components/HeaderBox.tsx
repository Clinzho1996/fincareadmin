"use client";
import { Select, SelectContent, SelectTrigger } from "@/components/ui/select"; // Make sure to import these
import { IconBell, IconLogout2, IconUser } from "@tabler/icons-react"; // Import the icons you need
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { toast } from "react-toastify";

function HeaderBox({ title }: { title: string }) {
	const { data: session } = useSession();

	const handleLogout = async () => {
		try {
			// Attempt sign out with redirect set to false
			await signOut({ redirect: false });

			// Sign-out is successful if no error occurs
			toast.success("Logout successful!");
		} catch (error) {
			toast.error("Failed to log out. Please try again.");
			console.error("Sign-out error:", error);
		}
	};

	return (
		<div className="flex flex-row justify-between items-center p-4 border-b-[1px] border-[#E2E4E9] h-[80px]">
			{session?.user && (
				<div className="flex flex-col gap-2">
					<p className="text-[20px] text-dark-1 font-normal font-inter capitalize">
						{title}
					</p>
				</div>
			)}
			<div className="hidden lg:flex flex-row justify-start gap-1 items-center">
				<div className="items-center border border-[#E2E4E9] p-2 rounded-lg h-[45px] text-dark-1">
					<IconBell />
				</div>
				{session?.user && (
					<Select>
						<SelectTrigger className="border border-[#E2E4E9] rounded-lg bg-white flex flex-row items-center gap-2 p-2 h-[45px] text-dark-1">
							<div className="flex bg-primary-1 justify-center items-center border-[1px] border-dark-3 rounded-full overflow-hidden w-9 h-9">
								<p className="text-white text-sm font-semibold ">FA</p>
							</div>
							<p className="text-dark-1 text-sm font-medium capitalize">
								Fincare Admin
							</p>
						</SelectTrigger>
						<SelectContent
							side="bottom"
							className="bg-white border border-[#E2E4E9] flex flex-col gap-3">
							<Link
								href="/system-settings"
								className="flex flex-row justify-start items-center gap-2 p-2 hover:bg-gray-50 rounded">
								<IconUser size={18} color="#696E77" />
								<p className="text-sm text-dark-1">My Account</p>
							</Link>
							<div
								onClick={handleLogout}
								className="flex flex-row justify-start items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
								<IconLogout2 size={18} color="#FF0000" />
								<p className="text-sm text-dark-1">Log out</p>
							</div>
						</SelectContent>
					</Select>
				)}
			</div>
		</div>
	);
}

export default HeaderBox;
