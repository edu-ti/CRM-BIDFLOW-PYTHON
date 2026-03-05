import { auth } from './firebase'; // Ajusta dependendo de onde está o teu firebase.ts

const API_BASE_URL = 'http://localhost:8000/api';

/**
 * Função utilitária para fazer requisições à API do Django
 * Garante que o Token JWT do Firebase é injetado no cabeçalho Authorization
 */
export async function apiFetch(endpoint: string, options: RequestInit = {}) {
    // Garante que o utilizado está logado e injeta o token
    if (!auth.currentUser) {
        throw new Error("Utilizador não autenticado no Firebase.");
    }

    const token = await auth.currentUser.getIdToken();

    // Configura os cabeçalhos por omissão
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
    };

    // Formata o URL final
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const res = await fetch(url, {
        ...options,
        headers,
    });

    if (!res.ok) {
        let errorData;
        try {
            errorData = await res.json();
        } catch {
            errorData = { detail: res.statusText };
        }
        throw new Error(`Erro na API (${res.status}): ${JSON.stringify(errorData)}`);
    }

    // Algumas chamadas como DELETE não devolvem JSON
    if (res.status === 204) {
        return null;
    }

    return res.json();
}
