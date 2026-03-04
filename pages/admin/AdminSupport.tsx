import React, { useState, useEffect, useRef } from "react";
import {
  LifeBuoy,
  MessageCircle,
  Clock,
  CheckCircle,
  X,
  Send,
  Plus,
  Loader2,
  User,
  Shield,
} from "lucide-react";
import { db, appId, auth } from "../../lib/firebase";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import ConfirmModal, { ConfirmModalType } from "../../components/ConfirmModal";

interface TicketMessage {
  id: string;
  content: string;
  sender: "admin" | "client"; // Quem enviou
  createdAt: any; // Timestamp do Firestore
}

interface Ticket {
  id: string;
  subject: string;
  status: "OPEN" | "PENDING" | "RESOLVED" | "CLOSED";
  priority: "low" | "medium" | "high";
  companyName: string; // Nome da empresa cliente
  updatedAt: any;
}

const AdminSupport = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Confirm Modal State
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    type: ConfirmModalType;
    onConfirm?: () => void;
    confirmText?: string;
    showCancel?: boolean;
  }>({
    title: "",
    message: "",
    type: "info",
  });

  const showAlert = (
    title: string,
    message: string,
    type: ConfirmModalType = "info"
  ) => {
    setConfirmConfig({
      title,
      message,
      type,
      showCancel: false,
      confirmText: "OK",
      onConfirm: () => setIsConfirmOpen(false),
    });
    setIsConfirmOpen(true);
  };

  // 1. Carregar Lista de Tickets
  useEffect(() => {
    // Busca todos os tickets ordenados pela última atualização
    const q = query(
      collection(db, "artifacts", appId, "tickets"),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTickets = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Ticket[];
      setTickets(fetchedTickets);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Carregar Mensagens do Ticket Selecionado
  useEffect(() => {
    if (!selectedTicket) {
      setMessages([]);
      return;
    }

    const messagesRef = collection(
      db,
      "artifacts",
      appId,
      "tickets",
      selectedTicket.id,
      "messages"
    );
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as TicketMessage[];
      setMessages(fetchedMessages);

      // Scroll para o fim
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    });

    return () => unsubscribe();
  }, [selectedTicket]);

  // 3. Enviar Mensagem (Admin)
  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !selectedTicket) return;

    try {
      // 1. Adicionar mensagem à sub-coleção
      await addDoc(
        collection(
          db,
          "artifacts",
          appId,
          "tickets",
          selectedTicket.id,
          "messages"
        ),
        {
          content: newMessage,
          sender: "admin",
          createdAt: new Date().toISOString(), // Usando string ISO para simplificar ordenação no front sem converters
        }
      );

      // 2. Atualizar o ticket "pai" (para subir na lista e mudar status)
      await updateDoc(
        doc(db, "artifacts", appId, "tickets", selectedTicket.id),
        {
          status: "PENDING", // Muda status para indicar que admin respondeu
          updatedAt: new Date().toISOString(),
        }
      );

      setNewMessage("");
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      showAlert("Erro", "Erro ao enviar mensagem.", "error");
    }
  };

  // Função de Teste: Criar um Ticket "Falso" vindo de um Cliente
  const handleCreateTestTicket = async () => {
    const subjects = [
      "Problema na API WhatsApp",
      "Dúvida sobre Fatura",
      "Erro no Chatbot",
      "Solicitação de Aumento de Limite",
    ];
    const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];

    try {
      // Cria o Ticket
      const ticketRef = await addDoc(
        collection(db, "artifacts", appId, "tickets"),
        {
          subject: randomSubject,
          status: "OPEN",
          priority: "medium",
          companyName: "Cliente Teste Ltda",
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        }
      );

      // Adiciona a primeira mensagem do cliente
      await addDoc(
        collection(db, "artifacts", appId, "tickets", ticketRef.id, "messages"),
        {
          content: `Olá, estou precisando de ajuda com: ${randomSubject}. Poderiam verificar?`,
          sender: "client",
          createdAt: new Date().toISOString(),
        }
      );
    } catch (error) {
      console.error(error);
      showAlert("Erro", "Erro ao criar ticket de teste.", "error");
    }
  };

  // Helper para status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return (
          <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full font-bold">
            Aberto
          </span>
        );
      case "PENDING":
        return (
          <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full font-bold">
            Respondido
          </span>
        );
      case "RESOLVED":
        return (
          <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-bold">
            Resolvido
          </span>
        );
      default:
        return (
          <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full font-bold">
            {status}
          </span>
        );
    }
  };

  if (isLoading)
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="animate-spin text-indigo-600 w-10 h-10" />
      </div>
    );

  return (
    <div className="space-y-6 h-[calc(100vh-6rem)] flex flex-col">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Suporte & Tickets
        </h1>
        {/* Botão apenas para teste rápido, já que não temos a tela do cliente aqui */}
        <button
          onClick={handleCreateTestTicket}
          className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center gap-2"
        >
          <Plus size={16} /> Simular Ticket de Cliente
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex-1 flex flex-col">
        <div className="overflow-y-auto flex-1">
          {tickets.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
              <LifeBuoy
                size={48}
                className="mb-4 text-gray-300 dark:text-gray-600"
              />
              <p>Nenhum ticket aberto.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex gap-4 cursor-pointer items-center transition-colors"
                >
                  <div
                    className={`p-3 rounded-full ${
                      ticket.status === "OPEN"
                        ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                        : "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                    }`}
                  >
                    <MessageCircle size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {ticket.subject}
                      </h3>
                      {getStatusBadge(ticket.status)}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {ticket.companyName} • Atualizado em{" "}
                      {new Date(ticket.updatedAt).toLocaleDateString()} às{" "}
                      {new Date(ticket.updatedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Chat */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bbg-white dark:bg-gray-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[600px] animate-in zoom-in-95">
            {/* Header do Chat */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  Ticket #{selectedTicket.id.substring(0, 6).toUpperCase()}
                  {getStatusBadge(selectedTicket.status)}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedTicket.companyName} - {selectedTicket.subject}
                </p>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 bg-white dark:bg-gray-700 p-1 rounded-full shadow-sm"
              >
                <X size={20} />
              </button>
            </div>

            {/* Área de Mensagens */}
            <div className="flex-1 bg-[#f3f4f6] dark:bg-gray-900 p-4 overflow-y-auto space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.sender === "admin" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-xl text-sm shadow-sm relative ${
                      msg.sender === "admin"
                        ? "bg-indigo-600 text-white -whiterounded-tr-none"
                        : "bg-white dark:bg-indigo-900 text-gray-800 dark:text-white rounded-tl-none"
                    }`}
                  >
                    {/* Identificação Opcional */}
                    <div className="text-[10px] opacity-70 mb-1 font-bold flex items-center gap-1">
                      {msg.sender === "admin" ? (
                        <>
                          <Shield size={10} /> Suporte
                        </>
                      ) : (
                        <>
                          <User size={10} /> Cliente
                        </>
                      )}
                    </div>
                    {msg.content}
                    <div
                      className={`text-[10px] mt-1 text-right ${
                        msg.sender === "admin"
                          ? "text-indigo-200"
                          : "text-gray-400 dark:text-gray-500"
                      }`}
                    >
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form
              onSubmit={handleSendMessage}
              className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex gap-3"
            >
              <input
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 transition bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="Digite sua resposta..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                autoFocus
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="bg-indigo-600 text-white p-3 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={20} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
        onConfirm={confirmConfig.onConfirm}
        confirmText={confirmConfig.confirmText}
        showCancel={confirmConfig.showCancel}
      />
    </div>
  );
};

export default AdminSupport;
