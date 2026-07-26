import { useUser } from "@clerk/clerk-expo";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { useEffect } from "react";
import { db } from "../firebaseConfig";

export function SyncUserToFirestore() {
    const { user, isLoaded } = useUser();

    useEffect(() => {
        console.log('[BOOT] SyncUserToFirestore running');
        if (!isLoaded || !user) return;

        const syncUser = async () => {
            try {
                const userRef = doc(db, "users", user.id);
                const existing = await Promise.race([
                    getDoc(userRef),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT: getDoc did not respond in 10s')), 10000))
                ]) as any;

                const baseData: any = {
                    id: user.id,
                    email: user.primaryEmailAddress?.emailAddress ?? "",
                    name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
                    photo: user.imageUrl ?? "",
                    provider: user.externalAccounts[0]?.provider ?? "email",
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
    }, [isLoaded, user]);

    return null;
}
