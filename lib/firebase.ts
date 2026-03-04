import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Declaração das variáveis globais injetadas pelo ambiente (se estiver usando no ambiente AI Studio)
declare global {
  var __firebase_config: any;
  var __app_id: string;
  var __initial_auth_token: string;
}

// Configuração dinâmica:
// 1. Tenta usar a config injetada pelo ambiente (Preview)
// 2. Se não existir, usa as credenciais reais do seu projeto (Local/Produção)
const firebaseConfig =
  typeof __firebase_config !== "undefined"
    ? JSON.parse(__firebase_config)
    : {
        apiKey: "AIzaSyAxvQHPAyYQSMk1Bq4AE1J5sCOdJHtmONk",
        authDomain: "bidflow-crm.firebaseapp.com",
        projectId: "bidflow-crm",
        storageBucket: "bidflow-crm.firebasestorage.app",
        messagingSenderId: "157893988488",
        appId: "1:157893988488:web:e0f60479353964651acf3d",
        measurementId: "G-NBDMZ1M08L",
      };

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Analytics (inicializa apenas se estiver no navegador)
export const analytics =
  typeof window !== "undefined" ? getAnalytics(app) : null;

// ID do app para separar dados se necessário, ou usar 'default'
export const appId = typeof __app_id !== "undefined" ? __app_id : "bidflow-crm";
export const initialAuthToken =
  typeof __initial_auth_token !== "undefined" ? __initial_auth_token : null;
