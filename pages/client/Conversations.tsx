import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Paperclip,
  Send,
  MoreVertical,
  Smile,
  Check,
  CheckCheck,
  Phone,
  Video,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { Conversation, Message } from "../../types";
import { db, auth, appId } from "../../lib/firebase";
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  addDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { WhatsAppService } from "../../lib/whatsappService"; // Importe o serviço

const Conversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false); // Estado de loading para envio
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Carregar Conversas (Mantido igual)
  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(
        db,
        "artifacts",
        appId,
        "users",
        auth.currentUser.uid,
        "conversations"
      ),
      orderBy("lastMessageAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().lastMessageAt
          ? new Date(doc.data().lastMessageAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "",
      })) as Conversation[];
      setConversations(fetched);
      setIsLoadingChats(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Carregar Mensagens (Mantido igual)
  useEffect(() => {
    if (!selectedChatId || !auth.currentUser) return;
    setIsLoadingMessages(true);
    const q = query(
      collection(
        db,
        "artifacts",
        appId,
        "users",
        auth.currentUser.uid,
        "conversations",
        selectedChatId,
        "messages"
      ),
      orderBy("createdAt", "asc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().createdAt
          ? new Date(doc.data().createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "",
      })) as Message[];
      setMessages(fetched);
      setIsLoadingMessages(false);
      setTimeout(
        () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
        100
      );
    });
    return () => unsubscribe();
  }, [selectedChatId]);

  // 3. Modificado: Enviar Mensagem via API e salvar no banco
  const handleSendMessage = async () => {
    if (
      !messageInput.trim() ||
      !selectedChatId ||
      !auth.currentUser ||
      isSending
    )
      return;

    setIsSending(true);
    try {
      const now = new Date().toISOString();
      const activeChat = conversations.find((c) => c.id === selectedChatId);

      // 1. Enviar para API do WhatsApp (Se tiver telefone válido)
      if (activeChat && activeChat.contactId) {
        // Assumindo que contactId guarda o telefone ou ID do contato
        // Você precisa passar o nome da instância correta da empresa.
        // Em um app real, isso viria do contexto do usuário. Vou usar "Vendas Principal" como exemplo fixo.
        try {
          await WhatsAppService.sendTextMessage(
            "Vendas Principal",
            activeChat.contactId,
            messageInput
          );
        } catch (apiError) {
          console.error("Erro API, salvando offline:", apiError);
        }
      }

      // 2. Salvar no Firestore (Histórico)
      const chatRef = doc(
        db,
        "artifacts",
        appId,
        "users",
        auth.currentUser.uid,
        "conversations",
        selectedChatId
      );
      const messagesRef = collection(chatRef, "messages");

      await addDoc(messagesRef, {
        content: messageInput,
        sender: "me",
        status: "sent",
        createdAt: now,
        type: "text",
      });

      await updateDoc(chatRef, {
        lastMessage: messageInput,
        lastMessageAt: now,
        unreadCount: 0,
      });

      setMessageInput("");
    } catch (error) {
      console.error("Erro ao enviar:", error);
    } finally {
      setIsSending(false);
    }
  };

  const activeChat = conversations.find((c) => c.id === selectedChatId);

  return (
    <div className="flex h-[calc(100vh-6rem)] bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      {/* List Panel (Esquerda) */}
      <div className="w-full md:w-1/3 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Buscar conversa..."
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-800">
          {isLoadingChats ? (
            <div className="flex justify-center p-8">
              <Loader2 className="animate-spin text-indigo-600" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              Nenhuma conversa.
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setSelectedChatId(conv.id)}
                className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition border-b border-gray-50 dark:border-gray-700/50 ${
                  selectedChatId === conv.id
                    ? "bg-indigo-50 dark:bg-indigo-900/30"
                    : ""
                }`}
              >
                <img
                  src={
                    conv.avatar ||
                    `https://ui-avatars.com/api/?name=${conv.contactName}&background=random`
                  }
                  alt={conv.contactName}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                      {conv.contactName}
                    </h4>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {conv.timestamp}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                    {conv.lastMessage}
                  </p>
                </div>
                {conv.unreadCount > 0 && (
                  <span className="bg-green-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                    {conv.unreadCount}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area (Direita) */}
      <div className="hidden md:flex flex-1 flex-col bg-[#e5ddd5] dark:bg-[#0b141a] relative">
        {selectedChatId && activeChat ? (
          <>
            <div className="bg-gray-100 dark:bg-gray-800 p-3 flex justify-between items-center border-b border-gray-200 dark:border-gray-700 z-10">
              <div className="flex items-center gap-3">
                <img
                  src={
                    activeChat.avatar ||
                    `https://ui-avatars.com/api/?name=${activeChat.contactName}`
                  }
                  className="w-10 h-10 rounded-full"
                  alt=""
                />
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-white">
                    {activeChat.contactName}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Online agora
                  </p>
                </div>
              </div>
              <div className="flex gap-4 text-gray-600 dark:text-gray-300">
                <Search size={20} className="cursor-pointer" />
                <MoreVertical size={20} className="cursor-pointer" />
              </div>
            </div>
            <div className="absolute inset-0 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] opacity-10 pointer-events-none"></div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 relative z-0">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.sender === "me" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[70%] p-3 rounded-lg shadow-sm relative ${
                      msg.sender === "me"
                        ? "bg-[#d9fdd3] dark:bg-[#005c4b] text-gray-800 dark:text-white rounded-tr-none"
                        : "bg-white dark:bg-gray-700 text-gray-800 dark:text-white rounded-tl-none"
                    }`}
                  >
                    <p className="text-sm break-words">{msg.content}</p>
                    <div className="flex justify-end items-center gap-1 mt-1">
                      <span className="text-[10px] text-gray-500 dark:text-gray-300">
                        {msg.timestamp}
                      </span>
                      {msg.sender === "me" &&
                        (msg.status === "read" ? (
                          <CheckCheck
                            size={14}
                            className="text-blue-500 dark:text-blue-300"
                          />
                        ) : (
                          <Check size={14} className="text-gray-500" />
                        ))}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 p-3 flex items-center gap-3 z-10">
              <Smile
                size={24}
                className="text-gray-500 dark:text-gray-400 cursor-pointer"
              />
              <Paperclip
                size={24}
                className="text-gray-500 dark:text-gray-400 cursor-pointer"
              />
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Digite uma mensagem"
                disabled={isSending}
                className="flex-1 bg-white dark:bg-gray-700 py-2 px-4 rounded-lg focus:outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
              <button
                onClick={handleSendMessage}
                disabled={isSending}
                className="p-2 bg-teal-600 text-white rounded-full hover:bg-teal-700 transition disabled:opacity-50"
              >
                {isSending ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Send size={20} />
                )}
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center flex-col text-center p-10 bg-gray-50 dark:bg-gray-900">
            <div className="w-64 h-64 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
              <MessageSquare
                size={64}
                className="text-gray-400 dark:text-gray-600"
              />
            </div>
            <h2 className="text-2xl font-light text-gray-600 dark:text-gray-300">
              BidFlow Web
            </h2>
            <p className="text-gray-400 dark:text-gray-500 mt-2">
              Selecione uma conversa para começar.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Conversations;
