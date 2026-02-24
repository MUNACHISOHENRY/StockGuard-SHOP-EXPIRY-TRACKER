import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { enableIndexedDbPersistence, getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY || (import.meta as any).env?.VITE_FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID || (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID || (import.meta as any).env?.VITE_FIREBASE_APP_ID,
};

// Check if Firebase is configured
export const isFirebaseConfigured = () => {
    const isConfigured = !!(
        firebaseConfig.apiKey &&
        firebaseConfig.projectId &&
        firebaseConfig.apiKey !== 'undefined' &&
        firebaseConfig.apiKey !== ''
    );

    if (isConfigured) {
        console.log("✅ Firebase configuration detected. Cloud sync enabled.");
    } else {
        console.warn("⚠️ Firebase configuration missing or incomplete. Falling back to local storage.");
        console.log("Missing fields:", Object.entries(firebaseConfig).filter(([_, v]) => !v).map(([k]) => k));
    }

    return isConfigured;
};

let app: ReturnType<typeof initializeApp> | null = null;
let db: ReturnType<typeof getFirestore> | null = null;
let auth: ReturnType<typeof getAuth> | null = null;

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

export const getAuthService = () => {
    if (!auth) {
        if (!isFirebaseConfigured()) {
            throw new Error('Firebase is not configured.');
        }
        if (!app) {
            app = initializeApp(firebaseConfig);
        }
        auth = getAuth(app);
    }
    return auth;
};

export default getDb;
