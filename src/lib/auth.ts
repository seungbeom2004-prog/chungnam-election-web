import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { supabase } from "./supabase";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "이메일", type: "email" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const { data: candidate } = await supabase
          .from("Candidate")
          .select("id, email, password, name, district, verified, role")
          .eq("email", credentials.email)
          .single();

        if (!candidate) return null;
        // Admin can always log in; candidates need verified=true
        if (!candidate.verified && candidate.role !== "admin") return null;

        const isValid = await bcrypt.compare(
          credentials.password,
          candidate.password
        );

        if (!isValid) return null;

        return {
          id: candidate.id,
          email: candidate.email,
          name: candidate.name,
          district: candidate.district,
          role: candidate.role,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 60,   // 1800s — JWT expires 30 minutes after issuance/last refresh
    updateAge: 5 * 60, // 300s  — re-issue JWT every 5 min of active use (idle timeout)
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.district = user.district;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.district = token.district as string;
        session.user.role = (token.role as string) || "candidate";
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
