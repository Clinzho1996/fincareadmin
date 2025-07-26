"use client";

import axios from "axios";
import { Eye, EyeOff } from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

export default function ChangePassword() {
	const { status } = useSession();
	const router = useRouter();

	const [form, setForm] = useState({ password: "", confirmPassword: "" });
	const [isLoading, setIsLoading] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);

	useEffect(() => {
		if (status === "authenticated") {
			toast.success("Login Successful!");
			router.push("/");
		}
	}, [status, router]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);

		try {
			const response = await axios.post(
				"https://api.comicscrolls.com/api/v1/auth/reset-password",
				{
					user_id: localStorage.getItem("userId"),
					password: form.password,
					password_confirmation: form.confirmPassword,
				},
				{
					headers: {
						Accept: "application/json",
						"Content-Type": "application/json",
					},
				}
			);

			if (response.status == 200) {
				toast.success("Password changed successfully");
				router.push("/sign-in");
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
		<div className="w-full flex flex-col lg:flex-row justify-center min-h-screen items-center bg-primary-1">
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
						<div className="mb-4 mt-4">
							<label className="text-sm text-[#E9E9EB] font-medium">
								New Password
							</label>
							<div className="relative">
								<input
									type={showPassword ? "text" : "password"}
									placeholder="Enter your password"
									value={form.password}
									onChange={(e) =>
										setForm({ ...form, password: e.target.value })
									}
									className="w-full bg-[#126aa14f] text-white text-sm rounded-lg p-2 border border-[#0000000D] placeholder:text-[#C6DCEA] focus:outline-none focus:border-primary mt-1 shadow-inner h-[50px]"
									required
								/>
								<button
									type="button"
									className="absolute right-3 top-[55%] translate-y-[-50%] text-[#C6DCEA]"
									onClick={() => setShowPassword(!showPassword)}>
									{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
								</button>
							</div>
						</div>

						<div className="mb-4 mt-4">
							<label className="text-sm text-[#E9E9EB] font-medium">
								Confirm Password
							</label>
							<div className="relative">
								<input
									type={showConfirmPassword ? "text" : "password"}
									placeholder="Re-enter your password"
									value={form.confirmPassword}
									onChange={(e) =>
										setForm({ ...form, confirmPassword: e.target.value })
									}
									className="w-full bg-[#126aa14f] text-white text-sm rounded-lg p-2 border border-[#0000000D] placeholder:text-[#C6DCEA] focus:outline-none focus:border-primary mt-1 shadow-inner h-[50px]"
									required
								/>
								<button
									type="button"
									className="absolute right-3 top-[55%] translate-y-[-50%] text-[#C6DCEA]"
									onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
									{showConfirmPassword ? (
										<EyeOff size={18} />
									) : (
										<Eye size={18} />
									)}
								</button>
							</div>
						</div>

						<button
							type="submit"
							className="w-full bg-[#fff] text-primary-1 font-inter p-3 rounded-lg mt-4"
							disabled={isLoading}>
							{isLoading ? "Signing up..." : "Sign Up"}
						</button>
					</form>
				</div>
			</div>
		</div>
	);
}
