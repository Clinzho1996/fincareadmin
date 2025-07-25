"use client";

import { Input } from "@/components/ui/input";
import {
	IconArrowBackUpDouble,
	IconTrash,
	IconUserCircle,
} from "@tabler/icons-react";
import axios from "axios";
import { getSession, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import Loader from "./Loader";
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

function Profile() {
	const { data: session, update } = useSession();
	const [form, setForm] = useState({
		bio: "",
		phone_number: "",
		first_name: "",
		last_name: "",
	});
	const [featuredImage, setFeaturedImage] = useState<File | null>(null);
	const [previewImage, setPreviewImage] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [userData, setUserData] = useState<UserData | null>(null);

	// Update the form when the session changes
	useEffect(() => {
		if (userData?.users?.phone_number) {
			setForm({
				bio: userData.users.bio || "",
				phone_number: userData.users.phone_number || "",
				first_name: userData.users.first_name || "",
				last_name: userData.users.last_name || "",
			});
		}
	}, [userData]);

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0] || null;
		setFeaturedImage(file);

		if (file) {
			const reader = new FileReader();
			reader.onloadend = () => {
				setPreviewImage(reader.result as string);
			};
			reader.readAsDataURL(file);
		} else {
			setPreviewImage(null);
		}
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
					"https://api.kuditrak.ng/api/v1/user",
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

	const handleProfileUpdate = async () => {
		setIsLoading(true);
		try {
			const response = await axios.put(
				"https://api.kuditrak.ng/api/v1/user/update/basic-details",
				{
					full_name: session?.user?.name,
					email: session?.user?.email,
					bio: form.bio,
				},
				{
					headers: {
						Accept: "application/json",
						referer: "aitechma.com",
						Authorization: `Bearer ${session?.accessToken}`,
					},
				}
			);

			if (response.data.status === "success") {
				await update();
				toast.success("Profile updated successfully!");
			}
		} catch (error) {
			console.error("Error updating profile:", error);
			toast.error("Failed to update profile. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	const handleAddProfileImage = async () => {
		try {
			setIsLoading(true);
			const session = await getSession();
			if (!session?.accessToken) {
				toast.error("You need to be logged in to update your avatar.");
				setIsLoading(false);
				return;
			}

			const formData = new FormData();
			if (featuredImage) {
				formData.append("profile_pic", featuredImage);
			}

			const response = await axios.post(
				"https://api.kuditrak.ng/api/v1/user/profile-pic",
				formData,
				{
					headers: {
						Authorization: `Bearer ${session.accessToken}`,
						"Content-Type": "multipart/form-data",
					},
				}
			);

			if (response.data.status === "success") {
				await update(); // Update the session
				toast.success("Avatar updated successfully!");
			}
		} catch (error) {
			if (axios.isAxiosError(error)) {
				// Corrected error message access
				if (error.response && error.response.data) {
					toast.error(error?.response?.data?.message);
					console.log("Error response:", error.response.data);
				} else {
					toast.error("An error occurred.");
					console.log("Error response: An error occurred.");
				}
			} else {
				toast.error("Something went wrong. Please try again.");
				console.log("Unexpected error:", error);
			}
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<section className="w-full border border-green-400 bg-white p-3 shadow-lg rounded-lg min-h-screen">
			{isLoading ? (
				<Loader />
			) : (
				<div className="p-1 sm:p-5 bg-white border-[1px] border-[#FFFFFF12] m-4 rounded-lg">
					<div className="flex flex-col sm:flex-row justify-start items-start gap-4 sm:gap-20">
						{userData?.users && (
							<div>
								{userData?.users?.profile_pic ? (
									<Image
										src={userData?.users?.profile_pic}
										alt="profile"
										className="rounded-full object-cover w-12 h-12 border "
										width={30}
										height={30}
										onError={(e) => {
											(e.currentTarget as HTMLImageElement).src =
												avatarFallback.src;
										}}
									/>
								) : (
									<Image
										src="/images/avatar.png"
										width={50}
										height={50}
										alt="avatar"
										className="rounded-full"
									/>
								)}
								<div className="py-4">
									<p className="text-[16px] text-dark-1 font-medium font-inter mt-2">
										{userData?.users?.first_name} {userData?.users?.last_name}
									</p>
									<p className="text-sm text-[#6B7280B7] font-inter mt-3">
										Last signed in 3h ago
									</p>
								</div>
								<div className="py-4 border-b-[1px] border-gray-400">
									<div className="flex flex-row justify-start gap-2 items-center bg-[#06510c2e] p-2 rounded-md">
										<IconUserCircle color="#000" size={16} />
										<p className="text-sm text-dark-1 font-inter">
											Change Personal Information
										</p>
									</div>
								</div>
								<div className="flex flex-row justify-start gap-2 items-center py-4 border-b-[1px] border-gray-400">
									<IconTrash color="#FF002C" size={16} />
									<p className="text-sm text-[#FF002C] font-inter">
										Delete Account
									</p>
								</div>

								<div className="py-4">
									<p className="text-sm text-[#7D7C81] font-inter mt-2">
										Joined on <span className="text-dark-1">Jan 5, 2025</span>
									</p>
								</div>
							</div>
						)}
						{userData?.users && (
							<div className="bg-[#EFF1F5] border-[1px] border-[#EFF1F5] w-full sm:w-[500px] rounded-lg">
								<div className="p-3 w-full border-b-[1px] border-[#FFFFFF12]">
									<Link href="/library">
										<div className="p-2 flex flex-row justify-start items-center gap-1 text-dark-1 rounded-md cursor-pointer w-fit text-sm ">
											<IconArrowBackUpDouble size={18} /> Change Personal
											Information
										</div>
									</Link>
								</div>

								<div className="bg-white p-3 rounded-lg mt-2 mx-1 mb-1 shadow-md flex flex-col gap-2">
									<div>
										<div className="flex items-center gap-3">
											<div className="border border-[#202020] bg-[#181818]  w-18 h-18 justify-center shadow-md rounded-full">
												{previewImage ? (
													<Image
														src={previewImage}
														alt="Preview"
														width={60}
														height={60}
														className="rounded-full w-18 h-18 object-cover"
													/>
												) : (
													<Image
														src="/images/avatar.png"
														alt="Avatar"
														width={60}
														height={60}
														className="rounded-full w-18 h-18 object-cover"
													/>
												)}
											</div>

											<input
												type="file"
												accept="image/*"
												onChange={handleFileChange}
												className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-1 text-white text-xs font-inter"
											/>

											<button
												onClick={handleAddProfileImage}
												className="px-3 py-1 bg-[#C3FF9D] border border-[#E8E8E81A] rounded-md text-dark-1">
												Upload
											</button>
										</div>
									</div>
									<div className="p-2">
										<h2 className="text-sm text-dark-1 font-inter">
											First Name
										</h2>
										<Input
											value={userData?.users?.first_name}
											placeholder="Enter first name"
											className="w-full text-[#7D7C81] focus:border-secondary-1 focus:border-[1px] bg-[#00000029] rounded-lg p-2 border border-[#00000029] shadow-inner focus:outline-none focus:border-primary mt-2  placeholder:text-[#7D7C81] placeholder:font-inter"
										/>
									</div>
									<div className="p-2">
										<h2 className="text-sm text-dark-1 font-inter">
											Last Name
										</h2>
										<Input
											value={userData?.users?.last_name}
											placeholder="Enter last name"
											className="w-full text-[#7D7C81] focus:border-secondary-1 focus:border-[1px] bg-[#00000029] rounded-lg p-2 border border-[#00000029] shadow-inner focus:outline-none focus:border-primary mt-2  placeholder:text-[#7D7C81] placeholder:font-inter"
										/>
									</div>
									<div className="p-2 ">
										<h2 className="text-sm text-dark-1 font-inter">Email</h2>
										<Input
											value={userData?.users?.email}
											type="email"
											placeholder="name@example.com"
											className="w-full text-[#7D7C81] focus:border-secondary-1 focus:border-[1px] bg-[#00000029] rounded-lg p-2 border border-[#00000029] shadow-inner focus:outline-none focus:border-primary placeholder:text-[#7D7C81] placeholder:font-inter"
										/>
									</div>
									<div className="p-2 ">
										<h2 className="text-sm text-dark-1 font-inter">Phone</h2>
										<Input
											value={userData?.users?.phone_number || ""}
											placeholder="Enter phone number"
											className="w-full text-[#7D7C81] focus:border-secondary-1 focus:border-[1px] bg-[#00000029] rounded-lg p-2 border border-[#00000029] shadow-inner focus:outline-none focus:border-primary mt-2  placeholder:text-[#7D7C81] placeholder:font-inter"
										/>
									</div>
									<div className="p-2 ">
										<button
											onClick={handleProfileUpdate}
											type="submit"
											className="w-full bg-[#C3FF9D] text-dark-1 p-2 rounded-lg mx-auto shadow-[#B5F090] hover:bg-[#B5F090] transition-colors duration-300 ease-in-out font-inter text-sm font-semibold flex justify-center items-center"
											disabled={isLoading}>
											{isLoading ? "Updating..." : "Update Changes"}
										</button>
									</div>
								</div>
							</div>
						)}
					</div>
				</div>
			)}
		</section>
	);
}

export default Profile;
