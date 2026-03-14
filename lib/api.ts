// Mudamos para o seu domínio real
const API_BASE_URL = 'https://crm.bidflow.top/api';

/**
 * Função utilitária para fazer requisições à API do Django
 */
export async function apiFetch(endpoint: string, options: RequestInit = {}) {
    // Pega o token diretamente do localStorage para a autenticação Django JWT
    const token = localStorage.getItem('access_token') || '';

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    // Só adiciona o cabeçalho se houver um token
    if (token) {
        (headers as any)['Authorization'] = `Bearer ${token}`;
    }

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

    if (res.status === 204) {
        return null;
    }

    return res.json();
}

export async function apiFetchBlob(endpoint: string, options: RequestInit = {}) {
    // Pega o token diretamente do localStorage para a autenticação Django JWT
    const token = localStorage.getItem('access_token') || '';

    const headers: HeadersInit = {
        ...options.headers,
    };

    if (token) {
        (headers as any)['Authorization'] = `Bearer ${token}`;
    }

    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const res = await fetch(url, {
        ...options,
        headers,
    });

    if (!res.ok) {
        throw new Error(`Erro no Download (${res.status}): ${res.statusText}`);
    }

    return res.blob();
}
