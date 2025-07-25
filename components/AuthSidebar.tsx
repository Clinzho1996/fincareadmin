"use client";

import Image from "next/image";

const AuthSidebar = () => {
	return (
		<section className="sticky left-0 top-0 flex w-full flex-col justify-between">
			<Image
				src="/images/log.jpg"
				alt="Auth Sidebar"
				width={454}
				height={1000}
				className="h-full w-full object-cover "
			/>
		</section>
	);
};

export default AuthSidebar;
