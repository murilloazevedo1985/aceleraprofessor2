// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDyBpGRDz_8-zHYBMOELwh0tP97ELfjHlk",
  authDomain: "gen-lang-client-0555465572.firebaseapp.com",
  projectId: "gen-lang-client-0555465572",
  storageBucket: "gen-lang-client-0555465572.firebasestorage.app",
  messagingSenderId: "84495601426",
  appId: "1:84495601426:web:0585195ea2d2886a5b2dcb",
  measurementId: "G-KD4Q4BJJCB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);