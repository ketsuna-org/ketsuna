import { browser } from '$app/environment';

type FirebaseExports = typeof import('firebase/app');

// Configuration Firebase fournie (les clés web publiques peuvent être exposées côté client)
const firebaseConfig = {
    apiKey: 'AIzaSyCPWIJa8mJHvDr1A9dQkUQlwHPdO7lJemo',
    authDomain: 'ketsuna-421923.firebaseapp.com',
    databaseURL: 'https://ketsuna-421923-default-rtdb.europe-west1.firebasedatabase.app',
    projectId: 'ketsuna-421923',
    storageBucket: 'ketsuna-421923.firebasestorage.app',
    messagingSenderId: '14900042043',
    appId: '1:14900042043:web:3ef2b89af500056ed0ff1e',
    measurementId: 'G-T15BVQ57BV'
};

let app: import('firebase/app').FirebaseApp | undefined;
let analytics: import('firebase/analytics').Analytics | undefined;
let initPromise: Promise<{ app: import('firebase/app').FirebaseApp | undefined; analytics: import('firebase/analytics').Analytics | undefined }> | null = null;

// Initialise Firebase et Analytics côté navigateur uniquement
export async function initFirebase() {
    if (!browser) return { app: undefined, analytics: undefined };
    if (initPromise) return initPromise;

    initPromise = (async () => {
        const { getApps, getApp, initializeApp }: FirebaseExports = await import('firebase/app');
        if (!getApps().length) {
            app = initializeApp(firebaseConfig);
        } else {
            app = getApp();
        }

        try {
            const { getAnalytics, isSupported } = await import('firebase/analytics');
            if (await isSupported()) {
                analytics = getAnalytics(app!);
            }
        } catch (err) {
            // Ignore l'erreur si l'environnement ne supporte pas Analytics
            analytics = undefined;
        }

        return { app, analytics };
    })();

    return initPromise;
}

export function getFirebaseInstances() {
    return { app, analytics };
}

/**
 * Sets the user ID for Google Analytics
 */
export async function setAnalyticsUserId(userId: string | null) {
    await initFirebase();
    if (!analytics) return;
    
    // Only import setUserId if analytics is initialized to avoid errors
    import('firebase/analytics').then(({ setUserId }) => {
        setUserId(analytics!, userId);
    }).catch(err => console.error("Error setting User ID:", err));
}

/**
 * Logs a custom event to Google Analytics
 */
export async function logAnalyticsEvent(eventName: string, eventParams?: { [key: string]: any }) {
    await initFirebase();
    if (!analytics) return;

    import('firebase/analytics').then(({ logEvent }) => {
        logEvent(analytics!, eventName, eventParams);
    }).catch(err => console.error("Error logging event:", err));
}
