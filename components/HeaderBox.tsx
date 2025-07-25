"use client";
import { Select, SelectContent, SelectTrigger } from "@/components/ui/select"; // Make sure to import these
import { IconBell, IconLogout2, IconUser } from "@tabler/icons-react"; // Import the icons you need
import axios from "axios";
import { getSession, signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import avatarFallback from "/public/images/avatar.png";

interface User {
	full_name?: string;
	email?: string;
	phone_number?: string;
	first_name?: string;
	last_name?: string;
	bio?: string;
	wallet?: number;
	profile_pic?: string;
}

interface UserData {
	users?: User;
}
function HeaderBox({ title }: { title: string }) {
	const { data: session } = useSession();
	const [isLoading, setIsLoading] = useState(false);
	const [userData, setUserData] = useState<UserData | null>(null);

	// Function to get the name initials from the user's name
	const getNameInitials = ({ name }: { name: string }) => {
		if (!name) return "OA";
		const initials = name
			.split(" ")
			.map((word) => word.charAt(0))
			.join("");
		return initials.toUpperCase();
	};

	useEffect(() => {
		const fetchStripeStatus = async () => {
			try {
				setIsLoading(true);
				const session = await getSession();
				if (!session?.accessToken) {
					console.error("No access token found.");
					return;
				}

				const response = await axios.get(
					"https://api.comicscrolls.com/api/v1/user",
					{
						headers: {
							Accept: "application/json",
							Authorization: `Bearer ${session.accessToken}`,
						},
					}
				);

				console.log("API Response:", response.data); // Debugging: Log the entire response
				setUserData(response.data?.data);
			} catch (error) {
				console.error("Error fetching Stripe status:", error);
				toast.error("Failed to fetch Stripe connection status.");
			}

			setIsLoading(false);
		};

		fetchStripeStatus();
	}, []);
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

	if (isLoading) {
		return (
			<div className="flex flex-row justify-between items-center p-4 border-b-[1px] border-[#E2E4E9] h-[80px]">
				<div className="flex flex-col gap-2">
					<p className="text-[20px] text-dark-1 font-normal font-inter capitalize">
						{title}
					</p>
				</div>
				<div className="flex items-center gap-2">
					<div className="animate-pulse bg-gray-200 rounded-full w-9 h-9" />
					<div className="w-24 h-6 bg-gray-200 rounded" />
				</div>
			</div>
		);
	}

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
								{userData?.users?.profile_pic ? (
									<Image
										src={userData?.users?.profile_pic}
										alt="profile"
										className="rounded-full  object-cover h-12 w-14 border "
										width={50}
										height={50}
										onError={(e) => {
											(e.currentTarget as HTMLImageElement).src =
												avatarFallback.src;
										}}
									/>
								) : (
									<p className="text-white text-sm font-semibold ">FA</p>
								)}
							</div>
							<p className="text-dark-1 text-sm font-medium capitalize">
								Fincare Admin
							</p>
						</SelectTrigger>
						<SelectContent
							side="bottom"
							className="bg-white border border-[#E2E4E9] flex flex-col gap-3">
							<Link
								href="/"
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
