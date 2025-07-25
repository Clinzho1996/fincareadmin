"use client";

import axios from "axios";
import { Eye, EyeOff } from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

export default function SignUp() {
	const { status } = useSession();
	const router = useRouter();
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);

	const [form, setForm] = useState({
		first_name: "",
		last_name: "",
		email: "",
		phone_number: "",
		password: "",
		password_confirmation: "",
	});
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		if (status === "authenticated") {
			toast.success("Login Successful!");
			router.push("/");
		}
	}, [status, router]);

	const handleSubmit = async (e) => {
		e.preventDefault();
		console.log("Form Values:", form);
		if (
			form.first_name === "" ||
			form.last_name === "" ||
			form.email === "" ||
			form.phone_number === "" ||
			form.password === "" ||
			form.password_confirmation === ""
		) {
			toast.error("Please fill in all fields");
			return;
		}

		if (form.password !== form.password_confirmation) {
			toast.error("Passwords do not match");
			setIsLoading(false);
			return;
		}

		setIsLoading(true);

		try {
			const response = await axios.post(
				"https://api.kuditrak.ng/api/v1/auth/register",
				{
					first_name: form.first_name,
					last_name: form.last_name,
					email: form.email,
					phone_number: form.phone_number,
					password: form.password,
					password_confirmation: form.password,
				},
				{
					headers: {
						Accept: "application/json",
						referer: "aitechma.com",
					},
				}
			);

			if (response.data.data.email) {
				localStorage.setItem("email", response.data.data.email);
			} else {
				console.error("Email is undefined");
			}

			if (response.status == 200) {
				toast.success("Registration successful");
				router.push("/email-verify");
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
			<div className="w-full lg:w-[55%] flex flex-col gap-10 px-[4%] py-[8%] mx-auto my-auto h-screen">
				<div className="bg-primary-2 p-1 rounded-lg flex flex-col items-center shadow-inner border-[#00000014] border-[1px]">
					<div className="bg-primary-1 w-full px-6 py-10 rounded-lg flex flex-col items-center shadow-md">
						<Image
							src="/images/kudilogo.png"
							alt="Logo"
							width={60}
							height={60}
							className="mx-auto"
						/>

						<p className="text-[20px] font-medium text-white text-center mt-4 font-inter">
							Join the Kuditrak Community
						</p>

						<form className="w-full mt-6" onSubmit={(e) => handleSubmit(e)}>
							<div className="flex gap-4">
								<div className="w-full">
									<label className="text-sm text-[#E9E9EB] font-medium font-inter">
										First Name
									</label>
									<input
										type="text"
										placeholder="Enter your first name"
										value={form.first_name}
										onChange={(e) =>
											setForm({ ...form, first_name: e.target.value })
										}
										className="w-full bg-[#00000029] text-white text-sm rounded-lg p-2 border border-[#0000000D] placeholder:text-[#525254] focus:outline-none focus:border-primary mt-1 shadow-inner"
										required
									/>
								</div>
								<div className="w-full">
									<label className="text-sm text-[#E9E9EB] font-medium font-inter">
										Last Name
									</label>
									<input
										type="text"
										placeholder="Enter your last name"
										value={form.last_name}
										onChange={(e) =>
											setForm({ ...form, last_name: e.target.value })
										}
										className="w-full bg-[#00000029] text-white text-sm rounded-lg p-2 border border-[#0000000D] placeholder:text-[#525254] focus:outline-none focus:border-primary mt-1 shadow-inner"
										required
									/>
								</div>
							</div>
							<div className="flex gap-4 mt-4">
								<div className="w-full">
									<label className="text-sm text-[#E9E9EB] font-medium font-inter">
										Email address
									</label>
									<input
										type="email"
										placeholder="Enter your email"
										value={form.email}
										onChange={(e) =>
											setForm({ ...form, email: e.target.value })
										}
										className="w-full bg-[#00000029] text-white text-sm rounded-lg p-2 border border-[#0000000D] placeholder:text-[#525254] focus:outline-none focus:border-primary mt-1 shadow-inner"
										required
									/>
								</div>
								<div className="w-full">
									<label className="text-sm text-[#E9E9EB] font-medium font-inter">
										Phone Number
									</label>
									<input
										type="text"
										placeholder="Enter your phone number"
										value={form.phone_number}
										onChange={(e) =>
											setForm({ ...form, phone_number: e.target.value })
										}
										className="w-full bg-[#00000029] text-white text-sm rounded-lg p-2 border border-[#0000000D] placeholder:text-[#525254] focus:outline-none focus:border-primary mt-1 shadow-inner"
										required
									/>
								</div>
							</div>

							<div className="flex gap-4">
								<div className="mb-4 mt-4 w-full">
									<label className="text-sm text-[#E9E9EB] font-medium">
										Password
									</label>
									<div className="relative">
										<input
											type={showPassword ? "text" : "password"}
											placeholder="Enter your password"
											value={form.password}
											onChange={(e) =>
												setForm({ ...form, password: e.target.value })
											}
											className="w-full bg-[#00000029] text-white text-sm rounded-lg p-2 border border-[#0000000D] placeholder:text-[#525254] focus:outline-none focus:border-primary mt-1 shadow-inner"
											required
										/>
										<button
											type="button"
											className="absolute right-3 top-[55%] translate-y-[-50%] text-[#696E77]"
											onClick={() => setShowPassword(!showPassword)}>
											{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
										</button>
									</div>
								</div>
								<div className="mb-4 mt-4 w-full">
									<label className="text-sm text-[#E9E9EB] font-medium">
										Confirm Password
									</label>
									<div className="relative">
										<input
											type={showConfirmPassword ? "text" : "password"}
											placeholder="Enter your password"
											value={form.password_confirmation}
											onChange={(e) =>
												setForm({
													...form,
													password_confirmation: e.target.value,
												})
											}
											className="w-full bg-[#00000029] text-white text-sm rounded-lg p-2 border border-[#0000000D] placeholder:text-[#525254] focus:outline-none focus:border-primary mt-1 shadow-inner"
											required
										/>
										<button
											type="button"
											className="absolute right-3 top-[55%] translate-y-[-50%] text-[#696E77]"
											onClick={() =>
												setShowConfirmPassword(!showConfirmPassword)
											}>
											{showConfirmPassword ? (
												<EyeOff size={18} />
											) : (
												<Eye size={18} />
											)}
										</button>
									</div>
								</div>
							</div>

							<button
								type="submit"
								className="w-full bg-[#C3FF9D] text-primary-1 font-inter p-3 rounded-lg mt-4"
								disabled={isLoading}>
								{isLoading ? "Signing up..." : "Sign Up"}
							</button>
						</form>
					</div>
					<div className="bg-primary p-3 mt-4 w-full text-center">
						<p className="text-[#7D7C81] text-sm">
							Already have an account?{" "}
							<Link href="/sign-in" className="underline text-white">
								Sign In
							</Link>
						</p>
					</div>

					<div className="border-[#000000] h-[2px] w-full border-[1px] my-4" />

					<div className="pb-6 w-full text-center">
						<p className="text-[#7D7C81] text-sm">
							By signing up, you agree to our{" "}
							<Link
								href="https://www.kuditrak.ng/terms-conditions"
								className="underline text-white">
								Terms of Service
							</Link>{" "}
							and{" "}
							<Link
								href="https://www.kuditrak.ng/privacy-policy"
								className="underline text-white">
								Privacy Policy
							</Link>
							.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
