// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBN85bxThpJYifWAvsS0uqPD0C9D55uPpM",
  authDomain: "gorev-cuzdan.firebaseapp.com",
  projectId: "gorev-cuzdan",
  storageBucket: "gorev-cuzdan.firebasestorage.app",
  messagingSenderId: "139914511950",
  appId: "1:139914511950:web:0d7c9352e410223742e51f",
  measurementId: "G-FV2YZCT93N"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);