"use client";

import axios from "axios";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

export default function ForgotPassword() {
	const { status } = useSession();
	const router = useRouter();

	const [form, setForm] = useState({ email: "" });
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		if (status === "authenticated") {
			toast.success("Login Successful!");
			router.push("/");
		}
	}, [status, router]);

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault(); // Prevents default form submission

		if (form.email === "") {
			toast.error("Please fill in all fields");
			return;
		}

		setIsLoading(true);

		try {
			const response = await axios.post(
				"https://api.kuditrak.ng/api/v1/auth/forgot-password",
				{ email: form.email },
				{
					headers: {
						Accept: "application/json",
						referer: "aitechma.com",
					},
				}
			);

			localStorage.setItem("email", form.email);
			toast.success("Email sent successfully!");
			console.log("Response Data:", response.data);

			// Ensure the reset password route exists in your app
			router.push("/reset-password");
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
		<div className="w-full flex flex-col lg:flex-row justify-center items-center min-h-screen bg-primary-1">
			<div className="w-[80%] lg:w-[65%] flex flex-col gap-10 mx-auto my-auto">
				<div className="flex flex-col gap-1">
					<div className="flex items-center gap-1">
						<Image
							src="/images/icon.png"
							alt="profile"
							className="object-cover w-[50px] h-full lg:w-[40px] lg:h-[42px] rounded-full"
							width={30}
							height={30}
						/>
						<h2 className="text-white text-xl font-normal">Fincare CMS</h2>
					</div>
					<p className="text-[32px] font-medium text-white text-left mt-2 font-inter">
						Forgot Password
					</p>

					<p className="text-[18px] font-normal text-white text-left font-inter">
						Enter your email for a reset link.
					</p>
					<form className="w-full mt-6" onSubmit={handleSubmit}>
						<div className="flex gap-4 mt-4">
							<div className="w-full">
								<label className="text-sm text-[#E9E9EB] font-medium font-inter">
									Email address
								</label>
								<input
									type="email"
									placeholder="Enter your email address"
									value={form.email}
									onChange={(e) => setForm({ ...form, email: e.target.value })}
									className="w-full bg-[#126aa14f] text-white text-sm rounded-lg p-2 border border-[#0000000D] placeholder:text-[#C6DCEA] focus:outline-none focus:border-primary mt-1 shadow-inner h-[50px]"
									required
								/>
							</div>
						</div>

						<button
							type="submit"
							className="w-full bg-[#fff] text-primary-1 font-inter p-3 rounded-lg mt-4"
							disabled={isLoading}>
							{isLoading ? "Loading..." : "Continue"}
						</button>
					</form>
				</div>
			</div>
		</div>
	);
}
