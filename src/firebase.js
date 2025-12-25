import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
    apiKey: "AIzaSyCxgZ9FdAjjEDyRLbPCQCSl0_tsJ9d79wA",
    authDomain: "vv-idea-saver.firebaseapp.com",
    databaseURL: "https://vv-idea-saver-default-rtdb.firebaseio.com",
    projectId: "vv-idea-saver",
    storageBucket: "vv-idea-saver.firebasestorage.app",
    messagingSenderId: "432484993378",
    appId: "1:432484993378:web:b3e804851ed9880cd1043b",
    measurementId: "G-0BMH0J0QDZ"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
