import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { useEffect } from "react";
import { db } from "../firebaseConfig";
import { useAuth } from "../context/AuthContext";

export function SyncUserToFirestore() {
    const { user } = useAuth();

    useEffect(() => {
        console.log('[BOOT] SyncUserToFirestore running');
        if (!user) return;

        const syncUser = async () => {
            try {
                const userRef = doc(db, "users", user.uid);
                const existing = await Promise.race([
                    getDoc(userRef),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT: getDoc did not respond in 10s')), 10000))
                ]) as any;

                const baseData: any = {
                    id: user.uid,
                    email: user.email ?? "",
                    name: user.displayName ?? "",
                    photo: user.photoURL ?? "",
                    provider: user.providerData[0]?.providerId ?? "email",
                    lastLoginAt: serverTimestamp(),
                };

                if (!existing.exists()) {
                    baseData.createdAt = serverTimestamp();
                }

                await Promise.race([
                    setDoc(
                        userRef,
                        baseData,
                        { merge: true }
                    ),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT: setDoc did not respond in 10s')), 10000))
                ]);

                console.log("✅ User synced to Firestore");
            } catch (err) {
                console.error("❌ Firestore sync failed", err);
            }
        };

        syncUser();
    }, [user]);

    return null;
}
