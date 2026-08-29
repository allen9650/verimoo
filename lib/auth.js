import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "./mongodb";
import Admin from "@/models/Admin";

export const authOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          await connectDB();
          const email = (credentials?.email || "").trim();
          if (!email || !credentials?.password) return null;

          const safeRegex = new RegExp(`^${email.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")}$`, "i");
          let admin = await Admin.findOne({ email: safeRegex });
          if (!admin) {
            admin = await Admin.findOne({ email });
          }

          if (!admin || !admin.passwordHash) return null;
          const valid = await bcrypt.compare(credentials.password, admin.passwordHash);
          if (!valid) return null;

          return {
            id: admin._id.toString(),
            name: admin.name || "Admin",
            email: admin.email,
            role: admin.role || "admin",
          };
        } catch (err) {
          console.error("NextAuth authorize error:", err);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role;
        session.user.id = token.id;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "verimoo-production-secret-key-2026-auth-token",
};
