// firebase-config.js

const firebaseConfig = {
  apiKey: "AIzaSyCBLihKSEyzIypPAILk7twHL3inmtkE0ms",
  authDomain: "kkuljaem-korea.firebaseapp.com",
  projectId: "kkuljaem-korea",
  storageBucket: "kkuljaem-korea.firebasestorage.app",
  messagingSenderId: "149780711902",
  appId: "1:149780711902:web:1734535cbf96b2ca02f54f",
  measurementId: "G-JK6NVC5CVE"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();