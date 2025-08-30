// app/api/auth/[...nextauth]/route.js
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const handler = NextAuth({
	providers: [
		CredentialsProvider({
			id: "admin-credentials",
			name: "Admin Credentials",
			credentials: {
				email: { label: "Email", type: "text" },
				password: { label: "Password", type: "password" },
			},
			async authorize(credentials) {
				try {
					const { email, password } = credentials;

					// Call our admin login API
					const res = await fetch(
						`${process.env.NEXTAUTH_URL}/api/admin/auth/login`,
						{
							method: "POST",
							body: JSON.stringify({ email, password }),
							headers: { "Content-Type": "application/json" },
						}
					);

					const data = await res.json();

					// Ensure the request was successful
					if (!res.ok || data.status !== "success") {
						console.error("Admin authentication failed:", data.error);
						return null;
					}

					// Return a properly structured user object
					return {
						id: data.data.admin._id,
						name: data.data.admin.name,
						email: data.data.admin.email,
						role: data.data.admin.role,
						permissions: data.data.admin.permissions,
						accessToken: data.data.token,
					};
				} catch (error) {
					console.error("Error in admin authorize function:", error);
					return null;
				}
			},
		}),
	],
	callbacks: {
		async jwt({ token, user }) {
			if (user) {
				token.accessToken = user.accessToken;
				token.role = user.role;
				token.permissions = user.permissions;
			}
			return token;
		},
		async session({ session, token }) {
			session.accessToken = token.accessToken;
			session.user.role = token.role;
			session.user.permissions = token.permissions;
			return session;
		},
		async redirect({ url, baseUrl }) {
			// Redirect to admin dashboard after login
			if (url.startsWith(baseUrl)) {
				return `${baseUrl}/`;
			}
			return baseUrl;
		},
	},
	pages: {
		signIn: "/sign-in", // Custom admin sign-in page
		error: "/sign-in", // Custom error page
	},
	session: {
		strategy: "jwt",
		maxAge: 24 * 60 * 60, // 24 hours
	},
	secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
