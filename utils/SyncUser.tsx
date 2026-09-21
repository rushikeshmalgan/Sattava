import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { syncCurrentUser } from "../services/dataApi";

/**
 * Registers the signed-in user with the backend on every sign-in: the profile is created the first time, and the
 * login time is recorded. Identity comes from the Firebase ID token, so only cosmetic details are sent.
 */
export function SyncUser() {
    const { user } = useAuth();
    const uid = user?.uid;

    useEffect(() => {
        if (!user) return;

        syncCurrentUser({
            email: user.email ?? "",
            name: user.displayName ?? "",
            photo: user.photoURL ?? "",
            provider: user.providerData[0]?.providerId ?? "email",
        }).catch((err) => {
            // Not fatal: the profile is created on the first write as well, and the next sign-in tries again.
            console.error("[SyncUser] Could not register the sign-in with the backend:", err);
        });
        // Once per sign-in, not on every token refresh.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [uid]);

    return null;
}
