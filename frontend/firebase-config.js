// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBMOjun4FHAv_O58aHJrzN3FVwf5UhdfU8",
  authDomain: "startip-evaluator.firebaseapp.com",
  projectId: "startip-evaluator",
  storageBucket: "startip-evaluator.firebasestorage.app",
  messagingSenderId: "120437694033",
  appId: "1:120437694033:web:4029553c1fb45092372270"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
export { auth, db };