const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");

admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// ----------------------------------------------------------------------
// CONFIGURAÇÃO DA META (OFFICIAL API)
// ----------------------------------------------------------------------
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

// ----------------------------------------------------------------------
// ROTA 1: VERIFICAÇÃO DO WEBHOOK (GET)
// ----------------------------------------------------------------------
// A Meta envia uma requisição GET para verificar se você é dono do servidor.
// Você deve retornar o código "hub.challenge" se o token bater.
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  // Verifica se a Meta enviou os parâmetros
  if (mode && token) {
    // Verifica se o token é igual ao que você definiu no .env
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("WEBHOOK_VERIFIED");
      // IMPORTANTE: Deve retornar APENAS o challenge como texto puro
      res.status(200).send(challenge);
    } else {
      console.error("Token de verificação incorreto.");
      res.sendStatus(403);
    }
  } else {
    // Se não tiver os parâmetros, retorna erro
    res.sendStatus(400);
  }
});

// ----------------------------------------------------------------------
// ROTA 2: RECEBIMENTO DE MENSAGENS (POST)
// ----------------------------------------------------------------------
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    console.log("Recebendo webhook Meta:", JSON.stringify(body, null, 2));

    // Verifica se é um evento de conta empresarial do WhatsApp
    if (body.object === "whatsapp_business_account") {
      // A estrutura da Meta é bem aninhada: entry -> changes -> value -> messages
      if (body.entry && body.entry.length > 0) {
        // Percorre as entradas (geralmente é 1, mas pode ser array)
        for (const entry of body.entry) {
          if (entry.changes && entry.changes.length > 0) {
            for (const change of entry.changes) {
              const value = change.value;

              if (value && value.messages && value.messages.length > 0) {
                const message = value.messages[0]; // Pega a primeira mensagem

                const from = message.from; // Número do cliente
                const msgType = message.type;
                let msgBody = "";

                // Verifica o tipo de mensagem para extrair o texto corretamente
                if (msgType === "text") {
                  msgBody = message.text.body;
                } else {
                  msgBody = `[${msgType.toUpperCase()}]`; // Ex: [IMAGE], [AUDIO]
                }

                // Tenta pegar o nome do contato se disponível
                let contactName = "Desconhecido";
                if (value.contacts && value.contacts.length > 0) {
                  contactName = value.contacts[0].profile.name;
                }

                console.log(
                  `Mensagem Oficial de ${contactName} (${from}): ${msgBody}`
                );

                // Salva no Firestore
                await db.collection("chats").add({
                  from: from,
                  senderName: contactName,
                  message: msgBody,
                  phoneNumberId: value.metadata.phone_number_id,
                  timestamp: admin.firestore.FieldValue.serverTimestamp(),
                  read: false,
                  platform: "meta-official",
                });
              }
            }
          }
        }
      }

      // Retorna 200 OK imediatamente para a Meta
      res.sendStatus(200);
    } else {
      // Se não for evento do WhatsApp Business, retorna 404
      res.sendStatus(404);
    }
  } catch (error) {
    console.error("Erro no processamento:", error);
    res.sendStatus(500);
  }
});

exports.whatsapp = functions.https.onRequest(app);
