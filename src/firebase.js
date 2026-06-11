import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Configuração fornecida pelo usuário
const firebaseConfig = {
  apiKey: "AIzaSyAw64-hCDywpK0MG9uQiGe9WJTav8q-ehI",
  authDomain: "cremalcontabil.firebaseapp.com",
  projectId: "cremalcontabil",
  storageBucket: "cremalcontabil.firebasestorage.app",
  messagingSenderId: "819772561166",
  appId: "1:819772561166:web:897fcdd900dc6b1205695f",
  measurementId: "G-FGEX1NMCZ8"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar Firestore (Banco de Dados)
export const db = getFirestore(app);

// Inicializar Autenticação
export const auth = getAuth(app);
