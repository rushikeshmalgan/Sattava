import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { Alert } from 'react-native';
import { db } from '../firebaseConfig';

export const saveUserToFirestore = async (userId: string, email: string, name?: string) => {
    console.log(`[Firebase Debug] Attempting to save user to Firestore... ID: ${userId}, Email: ${email}`);
    if (!userId) {
        console.warn('[Firebase Debug] No userId provided!');
        return;
    }

    try {
        console.log(`[Firebase Debug] Getting reference for user document...`);
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);
        console.log(`[Firebase Debug] Document exists? ${userDoc.exists()}`);

        if (userDoc.exists()) {
            await updateDoc(userRef, {
                lastLoginAt: new Date(),
                ...(name ? { name } : {}),
            });
            console.log('User document updated in Firestore!');
        } else {
            await setDoc(userRef, {
                email,
                name: name || '',
                createdAt: new Date(),
                lastLoginAt: new Date(),
            });
            console.log('New user document created in Firestore!');
        }
    } catch (error: any) {
        if (error?.message?.includes('permission-denied') || error?.code === 'permission-denied') {
            Alert.alert(
                "Firebase Permission Denied!",
                "Could not save user because of Firestore Security Rules. Please go to your Firebase Console -> Firestore Database -> Rules, and set them to 'allow read, write: if true;' to test.",
                [{ text: "OK" }]
            );
            console.warn('Firebase Permission Denied. User not saved due to database rules.');
        } else {
            console.warn('Error saving user to Firestore: ', error);
        }
    }
};
