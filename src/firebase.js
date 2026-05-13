import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
const firebaseConfig = {
  projectId: "freespace-belgium-2024-v1",
  appId: "1:1041649470022:web:4c192caf04db5d36f49847",
  storageBucket: "freespace-belgium-2024-v1.firebasestorage.app",
  apiKey: "AIzaSyAjamcSGIW-4unXWpEd78yNgc22thNKaCk",
  authDomain: "freespace-belgium-2024-v1.firebaseapp.com",
  messagingSenderId: "1041649470022"
};
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);
