"use client";

import { Eye, EyeOff } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

export default function SignIn() {
	const { status } = useSession();
	const router = useRouter();
	const searchParams = useSearchParams();
	const [showPassword, setShowPassword] = useState(false);

	// Get callbackUrl from search params or default to '/'
	const callbackUrl = searchParams.get("callbackUrl") || "/";

	const [form, setForm] = useState({ email: "", password: "" });
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		if (status === "authenticated") {
			toast.success("Login Successful!");
			router.push(callbackUrl);
		}
	}, [status, callbackUrl, router]);

	const handleSubmit = async (event) => {
		event.preventDefault();

		if (!form.email || !form.password) {
			toast.error("Please fill in all fields.");
			return;
		}

		setIsLoading(true);

		try {
			const result = await signIn("credentials", {
				redirect: false,
				email: form.email,
				password: form.password,
				callbackUrl,
			});

			console.log("SIGNIN RESULT:", result);

			if (result?.error) {
				toast.error(result.error);
			}
		} catch (error) {
			toast.error("Login failed. Please try again.");
			console.log(error);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="w-full flex flex-col lg:flex-row justify-between items-center min-h-screen bg-primary-1 ">
			<div className="w-[80%] lg:w-[65%] flex flex-col gap-10 mx-auto my-auto ">
				<div className="flex flex-col gap-3">
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
						Welcome Admin
					</p>

					<p className="text-[20px] font-normal text-white text-left font-inter">
						Enter your details to log in to your dashboard
					</p>
					<form className="w-full mt-6" onSubmit={handleSubmit}>
						<div className="mb-4">
							<label className="text-sm text-[#E9E9EB] font-medium font-inter">
								Email address
							</label>
							<input
								type="email"
								placeholder="Enter your email"
								value={form.email}
								onChange={(e) => setForm({ ...form, email: e.target.value })}
								className="w-full bg-[#126aa14f] text-white text-sm rounded-lg p-2 border border-[#0000000D] placeholder:text-[#C6DCEA] focus:outline-none focus:border-primary mt-1 shadow-inner h-[50px]"
								required
							/>
						</div>

						<div className="mb-4">
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

						<div className="flex flex-row justify-end items-center mt-2">
							<div>
								<Link href="/forgot-password" className=" text-white underline">
									Forgot Password?
								</Link>
							</div>
						</div>

						<button
							type="submit"
							className="w-full bg-[#fff] text-primary-1 font-inter p-3 rounded-lg mt-8"
							disabled={isLoading}>
							{isLoading ? "Signing in..." : "Sign In"}
						</button>
					</form>
				</div>
			</div>
		</div>
	);
}
