"use client";
import Loader from "@/components/Loader";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";

const HomeLayout = ({ children }: { children: ReactNode }) => {
	const session = useSession();
	const router = useRouter();

	useEffect(() => {
		// Redirect unauthenticated users to login page
		if (session?.status === "unauthenticated") {
			router.replace("/sign-in");
		}
	}, [session?.status, router]);

	if (session?.status === "loading") {
		return <Loader />;
	}
	return (
		<main>
			<div className="flex">
				<Sidebar />
				<section className="flex min-h-screen flex-1 flex-col pb-6">
					<div className="w-full flex flex-col gap-3">
						<Navbar />
						{children}
					</div>
				</section>
			</div>
		</main>
	);
};

export default HomeLayout;
