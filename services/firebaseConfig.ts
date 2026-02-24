import { initializeApp } from 'firebase/app';
import { enableIndexedDbPersistence, getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
};

// Check if Firebase is configured
export const isFirebaseConfigured = () => {
    return !!(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.apiKey !== 'undefined');
};

let app: ReturnType<typeof initializeApp> | null = null;
let db: ReturnType<typeof getFirestore> | null = null;

export const getDb = () => {
    if (!db) {
        if (!isFirebaseConfigured()) {
            throw new Error('Firebase is not configured. Add your config values to .env.local');
        }
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);

        // Enable offline persistence (best-effort, won't throw if unavailable)
        enableIndexedDbPersistence(db).catch((err) => {
            if (err.code === 'failed-precondition') {
                console.warn('Firestore persistence unavailable: multiple tabs open');
            } else if (err.code === 'unimplemented') {
                console.warn('Firestore persistence unavailable: browser not supported');
            }
        });
    }
    return db;
};

export default getDb;
