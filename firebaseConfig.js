import { initializeApp, getApp, getApps } from "firebase/app";
import {
  initializeAuth,
  getReactNativePersistence,
  getAuth
} from "firebase/auth";
import { initializeFirestore, persistentLocalCache } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
    apiKey: "AIzaSyDtWsIszmQI_cRCFnD29a_jb72VDGchbwE",
    authDomain: "onecall-d0bf8.firebaseapp.com",
    projectId: "onecall-d0bf8",
    storageBucket: "onecall-d0bf8.firebasestorage.app",
    messagingSenderId: "851267786422",
    appId: "1:851267786422:web:5a5ab917cd5757e8bcf817",
    measurementId: "G-2QX38MF8F5"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Auth Persistence - Sinisiguro nito na isang beses lang mag-login
let auth;
if (getApps().length > 0) {
    try {
        auth = getAuth(app);
    } catch (e) {
        auth = initializeAuth(app, {
            persistence: getReactNativePersistence(AsyncStorage)
        });
    }
} else {
    auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage)
    });
}

// Firestore with Offline Persistence
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache()
});

export { auth };
export const storage = getStorage(app);