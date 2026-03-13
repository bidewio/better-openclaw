import type { TestHelpers } from "better-auth/plugins";
import { beforeAll, describe, expect, it } from "vitest";
import { getTestHelpers, testAuth } from "./fixtures/test-auth.js";

describe("Auth — email + password", () => {
	let test: TestHelpers;

	beforeAll(async () => {
		test = await getTestHelpers();
	});

	it("signs up a new user and returns a session", async () => {
		const res = await testAuth.api.signUpEmail({
			body: {
				name: "Alice",
				email: "alice@example.com",
				password: "password123",
			},
		});

		expect(res.user).toBeDefined();
		expect(res.user.email).toBe("alice@example.com");
		expect(res.user.name).toBe("Alice");
		expect(res.token).toBeTruthy();
		await test.deleteUser(res.user.id);
	});

	/**
	 * Note: test.createUser() is a factory helper — it creates a user record
	 * but does NOT create a password credential (account row). Use signUpEmail
	 * to sign up users that you later want to sign in with email + password.
	 * The test below uses the signUpEmail → signInEmail round-trip instead.
	 */
	it("signs in after signing up with email + password", async () => {
		const signUpRes = await testAuth.api.signUpEmail({
			body: {
				name: "Bob",
				email: "bob-signin@example.com",
				password: "correct-password",
			},
		});
		expect(signUpRes.user).toBeDefined();

		const signInRes = await testAuth.api.signInEmail({
			body: { email: "bob-signin@example.com", password: "correct-password" },
		});
		expect(signInRes.token).toBeTruthy();
		expect(signInRes.user.email).toBe("bob-signin@example.com");

		await test.deleteUser(signUpRes.user.id);
	});

	it("rejects sign-in with a wrong password", async () => {
		const user = test.createUser({ email: "carol@example.com" });
		await test.saveUser(user);

		await expect(
			testAuth.api.signInEmail({
				body: { email: user.email, password: "wrong-password" },
			}),
		).rejects.toThrow();

		await test.deleteUser(user.id);
	});
});

describe("Auth — session management", () => {
	let test: TestHelpers;

	beforeAll(async () => {
		test = await getTestHelpers();
	});

	it("getSession returns the authenticated user", async () => {
		const user = test.createUser({ email: "dave@example.com", name: "Dave" });
		await test.saveUser(user);

		const headers = await test.getAuthHeaders({ userId: user.id });
		const session = await testAuth.api.getSession({ headers });

		expect(session).toBeTruthy();
		expect(session?.user.id).toBe(user.id);
		expect(session?.user.email).toBe(user.email);

		await test.deleteUser(user.id);
	});

	it("getSession returns null with no credentials", async () => {
		const session = await testAuth.api.getSession({
			headers: new Headers(),
		});

		expect(session).toBeNull();
	});

	it("login helper returns session, headers, and token", async () => {
		const user = test.createUser({ email: "eve@example.com", name: "Eve" });
		await test.saveUser(user);

		const { session, user: loginUser, headers, token } = await test.login({ userId: user.id });

		expect(session.userId).toBe(user.id);
		expect(loginUser.email).toBe(user.email);
		expect(token).toBeTruthy();
		expect(headers.get("Cookie")).toBeTruthy();

		await test.deleteUser(user.id);
	});
});

describe("Auth — sign out", () => {
	let test: TestHelpers;

	beforeAll(async () => {
		test = await getTestHelpers();
	});

	it("invalidates the session after sign-out", async () => {
		const user = test.createUser({ email: "frank@example.com" });
		await test.saveUser(user);

		const { headers } = await test.login({ userId: user.id });

		// Confirm session is active
		const before = await testAuth.api.getSession({ headers });
		expect(before?.user.id).toBe(user.id);

		// Sign out
		await testAuth.api.signOut({ headers });

		// Session should now be gone
		const after = await testAuth.api.getSession({ headers });
		expect(after).toBeNull();

		await test.deleteUser(user.id);
	});
});
