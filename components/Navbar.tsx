import Image from "next/image";
import Link from "next/link";
import MobileNav from "./MobileNav";

const Navbar = () => {
	return (
		<nav className="flex lg:hidden md:hidden lg:flex-col flex-row items-center justify-between border-b-[1px] border-b-[#E2E4E9] px-3 py-2">
			<Link href="/" className="items-center gap-1">
				<Image
					src="/images/logo.png"
					alt="One Acre Fund Logo"
					width={200}
					height={50}
					className="w-fit justify-center h-[50px] flex flex-row "
				/>
			</Link>
			{/* clerk user management */}

			<MobileNav />
		</nav>
	);
};

export default Navbar;
