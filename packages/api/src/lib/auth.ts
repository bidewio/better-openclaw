import { dash, sentinel } from "@better-auth/infra";
import { passkey } from "@better-auth/passkey";
import { db, schema } from "@better-openclaw/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink, openAPI } from "better-auth/plugins";
import {
	buildMagicLinkEmail,
	buildResetPasswordEmail,
	buildVerificationEmail,
	buildWelcomeEmail,
	sendEmail,
} from "./email.js";

const trustedOrigins = process.env.WEB_URL?.split(",") ?? [
	"http://localhost:3654",
	"http://localhost:3456",
	"http://localhost:3000",
];

const authSecret = process.env.BETTER_AUTH_SECRET;
if (!authSecret && process.env.NODE_ENV === "production") {
	throw new Error(
		"BETTER_AUTH_SECRET is required in production. Set a random 32+ character string.",
	);
}

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",
		schema: {
			user: schema.user,
			session: schema.session,
			account: schema.account,
			verification: schema.verification,
		},
	}),
	secret: authSecret ?? "dev-only-insecure-secret-do-not-use-in-prod",
	baseURL: process.env.API_URL ?? "http://localhost:3456",
	basePath: "/api/auth",
	trustedOrigins: trustedOrigins,
	// ── Email + password ──────────────────────────────────────────────────────
	emailAndPassword: {
		enabled: true,
		autoSignIn: true,
		// Send password reset email
		sendResetPassword: async ({ user, url }) => {
			const { subject, html } = buildResetPasswordEmail(user.name, url);
			void sendEmail({ to: user.email, subject, html });
		},
	},

	// ── Email verification on sign-up ─────────────────────────────────────────
	emailVerification: {
		sendOnSignUp: true,
		autoSignInAfterVerification: true,
		sendVerificationEmail: async ({ user, url }) => {
			const { subject, html } = buildVerificationEmail(user.name, url);
			void sendEmail({ to: user.email, subject, html });
		},
	},

	// ── OAuth social providers ────────────────────────────────────────────────
	socialProviders: {
		...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
			? {
					github: {
						clientId: process.env.GITHUB_CLIENT_ID,
						clientSecret: process.env.GITHUB_CLIENT_SECRET,
					},
				}
			: {}),
		...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
			? {
					google: {
						clientId: process.env.GOOGLE_CLIENT_ID,
						clientSecret: process.env.GOOGLE_CLIENT_SECRET,
						accessType: "offline",
						prompt: "select_account consent",
					},
				}
			: {}),
	},

	// ── Welcome email on first sign-up ────────────────────────────────────────
	databaseHooks: {
		user: {
			create: {
				after: async (user) => {
					const { subject, html } = buildWelcomeEmail(user.name);
					void sendEmail({ to: user.email, subject, html });
				},
			},
		},
	},

	// ── Plugins ──────────────────────────────────────────────────────────────
	plugins: [
		openAPI(),
		// Magic link sign-in (passwordless)
		magicLink({
			sendMagicLink: async ({ email, url }) => {
				const { subject, html } = buildMagicLinkEmail(email, url);
				void sendEmail({ to: email, subject, html });
			},
			expiresIn: 15 * 60, // 15 minutes
		}),
		dash({
			apiKey: process.env.BETTER_AUTH_API_KEY,
		}),
		sentinel({
			apiKey: process.env.BETTER_AUTH_API_KEY,
		}),
		// Passkey / WebAuthn (biometrics + hardware keys)
		passkey(),
	],
});

export type Auth = typeof auth;
