import type { Metadata } from "next";
import { IBM_Plex_Serif, Inter } from "next/font/google";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AuthProvider from "./AuthProvider/AuthProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const ibmPlexSerif = IBM_Plex_Serif({
	subsets: ["latin"],
	weight: ["400", "700"],
	variable: "--font-ibm-plex-serif",
});

export const metadata: Metadata = {
	title: "Fincare CMS Admin Portal",
	description: "",
	icons: {
		icon: "/favicon.ico",
		apple: "/images/icon.png",
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body className={`${inter.variable} ${ibmPlexSerif.variable}`}>
				<AuthProvider>{children}</AuthProvider>
				<ToastContainer />
			</body>
		</html>
	);
}
