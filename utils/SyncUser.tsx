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
        console.log('[BOOT] SyncUser running');
        if (!user) return;

        let cancelled = false;
        syncCurrentUser({
            email: user.email ?? "",
            name: user.displayName ?? "",
            photo: user.photoURL ?? "",
            provider: user.providerData[0]?.providerId ?? "email",
        })
            .then(() => {
                if (!cancelled) console.log("✅ User synced");
            })
            .catch((err) => {
                console.error("❌ User sync failed", err);
            });

        return () => {
            cancelled = true;
        };
        // Once per sign-in, not on every token refresh.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [uid]);

    return null;
}
