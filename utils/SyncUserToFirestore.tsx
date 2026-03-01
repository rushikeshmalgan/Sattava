import { useUser } from "@clerk/clerk-expo";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useEffect } from "react";
import { db } from "../firebaseConfig";

export function SyncUserToFirestore() {
    const { user, isLoaded } = useUser();

    useEffect(() => {
        if (!isLoaded || !user) return;

        const syncUser = async () => {
            try {
                await setDoc(
                    doc(db, "users", user.id),
                    {
                        id: user.id,
                        email: user.primaryEmailAddress?.emailAddress ?? "",
                        name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
                        photo: user.imageUrl ?? "",
                        provider: user.externalAccounts[0]?.provider ?? "email",
                        createdAt: serverTimestamp(),
                        lastLoginAt: serverTimestamp(),
                    },
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
