import { useUser } from "@clerk/clerk-expo";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { useEffect } from "react";
import { db } from "../firebaseConfig";

export function SyncUserToFirestore() {
    const { user, isLoaded } = useUser();

    useEffect(() => {
        if (!isLoaded || !user) return;

        const syncUser = async () => {
            try {
                const userRef = doc(db, "users", user.id);
                const existing = await getDoc(userRef);

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

                await setDoc(
                    userRef,
                    baseData,
                    { merge: true }
                );

                console.log("✅ User synced to Firestore");
            } catch (err) {
                console.error("❌ Firestore sync failed", err);
            }
        };

        syncUser();
    }, [isLoaded, user]);

    return null;
}
