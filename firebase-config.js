// Firebase projenizin yapılandırması
const firebaseConfig = {
    apiKey: "AIzaSyBN85bxThpJYifWAvsS0uqPD0C9D55uPpM",
    authDomain: "gorev-cuzdan.firebaseapp.com",
    projectId: "gorev-cuzdan",
    storageBucket: "gorev-cuzdan.appspot.com",
    messagingSenderId: "139914511950",
    appId: "1:139914511950:web:0d7c9352e410223742e51f"
};

// Firebase'i başlat
firebase.initializeApp(firebaseConfig);

// Diğer dosyalarda kullanmak için auth ve firestore örnekleri oluştur
const auth = firebase.auth();
const db = firebase.firestore();