import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        try {
          const res = await fetch(`${process.env.API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: credentials.email, password: credentials.password }),
          });
          const data = await res.json();
          if (!res.ok || !data.success) return null;
          return {
            id: data.data.user.id,
            email: data.data.user.email,
            name: data.data.user.name,
            role: data.data.user.role,
            plan: data.data.user.plan,
            coins: data.data.user.coins,
            accessToken: data.data.token,
          };
        } catch {
          return null;
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.plan = (user as any).plan;
        token.coins = (user as any).coins;
        token.accessToken = (user as any).accessToken;
        const adminEmail = process.env.ADMIN_EMAIL;
        if (adminEmail && user.email?.toLowerCase() === adminEmail.toLowerCase()) {
          token.role = 'SUPERADMIN';
        }
      }
      if (account?.provider === 'google') {
        try {
          const res = await fetch(`${process.env.API_URL}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: account.id_token }),
          });
          const data = await res.json();
          if (res.ok && data.success) {
            token.id = data.data.user.id;
            token.role = data.data.user.role;
            token.plan = data.data.user.plan;
            token.coins = data.data.user.coins;
            token.accessToken = data.data.token;
          }
        } catch {}
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).plan = token.plan;
        (session.user as any).coins = token.coins;
        (session.user as any).accessToken = token.accessToken;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/login',
    verifyRequest: '/auth/verify-email',
  },
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET || 'xhris-host-nextauth-fallback-secret-2024',
  debug: process.env.NODE_ENV === 'development',
};
