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
          .select("id, email, password, name, district, verified")
          .eq("email", credentials.email)
          .single();

        if (!candidate || !candidate.verified) return null;

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
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.district = (user as unknown as { district: string }).district;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id: string }).id = token.id as string;
        (session.user as { district: string }).district =
          token.district as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
