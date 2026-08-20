"use client";

import { useCallback, useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

type ListPasskeysResult = Awaited<ReturnType<typeof authClient.passkey.listUserPasskeys>>;
export type Passkey = NonNullable<ListPasskeysResult["data"]>[number];

export function usePasskeys() {
	const [passkeys, setPasskeys] = useState<Passkey[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [addingPasskey, setAddingPasskey] = useState(false);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const loadPasskeys = useCallback(async () => {
		setIsLoading(true);
		setError(null);
		try {
			const { data, error: fetchError } = await authClient.passkey.listUserPasskeys({});
			if (fetchError) {
				setError(fetchError.message ?? "Failed to load passkeys");
				return;
			}
			setPasskeys(data ?? []);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load passkeys");
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		loadPasskeys();
	}, [loadPasskeys]);

	const handleAddPasskey = useCallback(
		async (name: string, authenticatorAttachment: "platform" | "cross-platform") => {
			setAddingPasskey(true);
			setError(null);
			try {
				const { error: addError } = await authClient.passkey.addPasskey({
					name: name || undefined,
					authenticatorAttachment,
				});
				if (addError) {
					// better-auth types `message` as string | RawError<...>, but setError
					// takes string | null — normalise before storing.
					setError(
						typeof addError.message === "string" ? addError.message : "Failed to register passkey",
					);
					return false;
				}
				// Refresh list after adding
				await loadPasskeys();
				return true;
			} catch (err) {
				const msg = err instanceof Error ? err.message : "Passkey registration failed";
				// Don't show error for cancelled prompts
				if (!msg.toLowerCase().includes("cancel") && !msg.includes("Not allowed")) {
					setError(msg);
				}
				return false;
			} finally {
				setAddingPasskey(false);
			}
		},
		[loadPasskeys],
	);

	const handleDeletePasskey = useCallback(async (id: string) => {
		setDeletingId(id);
		setError(null);
		try {
			const { error: delError } = await authClient.passkey.deletePasskey({
				id,
			});
			if (delError) {
				setError(delError.message ?? "Failed to delete passkey");
				return;
			}
			setPasskeys((prev) => prev.filter((p) => p.id !== id));
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to delete passkey");
		} finally {
			setDeletingId(null);
		}
	}, []);

	return {
		passkeys,
		isLoading,
		addingPasskey,
		deletingId,
		error,
		clearError: () => setError(null),
		handleAddPasskey,
		handleDeletePasskey,
	};
}
