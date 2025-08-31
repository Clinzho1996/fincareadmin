/** @type {import('next').NextConfig} */
const nextConfig = {
	images: {
		domains: [
			"lh3.googleusercontent.com",
			"api.kuditrak.ng",
			"ui-avatars.com",
			"api.comicscrolls.com",
			"images.squarespace-cdn.com",
			"houseplans-3d.com",
		],
	},
	experimental: {
		appDir: true,
	},
};

export default nextConfig;
