import { db, appId } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

// CONFIGURAÇÕES
const API_URL = "http://localhost:8080";
// Certifique-se que esta senha é A MESMA do arquivo docker-compose.yml
const API_KEY = "g3st@03Du4rd0";

export const WhatsAppService = {
  async connectInstance(
    instanceName: string
  ): Promise<{ qrcode?: string; base64?: string; count?: number }> {
    try {
      // 1. Limpa o nome (remove espaços e acentos)
      const cleanName = instanceName.replace(/[^a-zA-Z0-9]/g, "");
      console.log(`[WA] Tentando conectar instância: ${cleanName}`);

      // 2. Tenta CRIAR a instância (SEM o campo integration que estava dando erro)
      const createResponse = await fetch(`${API_URL}/instance/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: API_KEY,
        },
        body: JSON.stringify({
          instanceName: cleanName,
          token: Math.random().toString(36).substring(7),
          qrcode: true,
          // Removido: integration: "WHATSAPP-BAILEYS" (Causava erro na v2)
        }),
      });

      const createData = await createResponse.json();

      // Se falhar a criação
      if (!createResponse.ok) {
        console.warn("[WA] Aviso na criação:", createData);
        // Ignora erro se for "já existe", senão estoura erro
        if (
          createData?.response?.message &&
          !Array.isArray(createData.response.message) &&
          !createData.response.message.includes("already exists")
        ) {
          // throw new Error(`Falha ao criar: ${JSON.stringify(createData.response)}`);
        }
      }

      // 3. Tenta CONECTAR (Buscar o QR Code)
      const connectResponse = await fetch(
        `${API_URL}/instance/connect/${cleanName}`,
        {
          method: "GET",
          headers: { apikey: API_KEY },
        }
      );

      if (!connectResponse.ok) {
        if (connectResponse.status === 404)
          throw new Error("Instância não encontrada na API.");
        if (connectResponse.status === 403)
          throw new Error("Senha da API incorreta.");
        throw new Error(`Erro ao conectar: ${connectResponse.statusText}`);
      }

      const connectData = await connectResponse.json();
      return connectData;
    } catch (error: any) {
      console.error("[WA] Erro Crítico:", error);
      throw error;
    }
  },

  async logoutInstance(instanceName: string): Promise<void> {
    const cleanName = instanceName.replace(/[^a-zA-Z0-9]/g, "");
    await fetch(`${API_URL}/instance/logout/${cleanName}`, {
      method: "DELETE",
      headers: { apikey: API_KEY },
    });
  },

  async sendTextMessage(
    instanceName: string,
    number: string,
    text: string
  ): Promise<any> {
    const cleanName = instanceName.replace(/[^a-zA-Z0-9]/g, "");
    const cleanNumber = number.replace(/\D/g, "");

    const response = await fetch(`${API_URL}/message/sendText/${cleanName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: API_KEY,
      },
      body: JSON.stringify({
        number: cleanNumber,
        options: { delay: 1200, presence: "composing", linkPreview: true },
        textMessage: { text: text },
      }),
    });
    return await response.json();
  },

  async fetchInstanceStatus(
    instanceName: string
  ): Promise<"CONNECTED" | "DISCONNECTED"> {
    const cleanName = instanceName.replace(/[^a-zA-Z0-9]/g, "");
    try {
      const response = await fetch(
        `${API_URL}/instance/connectionState/${cleanName}`,
        {
          headers: { apikey: API_KEY },
        }
      );
      const data = await response.json();
      return data.instance?.state === "open" ? "CONNECTED" : "DISCONNECTED";
    } catch (e) {
      return "DISCONNECTED";
    }
  },
};
