import React, { useState, useRef, useEffect } from "react";
import {
  Save,
  Play,
  Plus,
  MousePointer2,
  X,
  Send,
  Bot,
  MessageSquare,
  HelpCircle,
  GitFork,
  Check,
  Loader2,
  Download,
  Zap,
} from "lucide-react";
import { db, auth, appId } from "../../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import ConfirmModal, { ConfirmModalType } from "../../components/ConfirmModal";

interface Node {
  id: string;
  type: "start" | "message" | "input" | "question" | "condition" | "action";
  text: string;
  x: number;
  y: number;
}

interface Connection {
  id: string;
  from: string;
  to: string;
}

const TestModal = ({
  isOpen,
  onClose,
  nodes,
  connections,
}: {
  isOpen: boolean;
  onClose: () => void;
  nodes: Node[];
  connections: Connection[];
}) => {
  const [history, setHistory] = useState<
    { sender: "bot" | "user" | "system"; text: string }[]
  >([]);
  const [currentInput, setCurrentInput] = useState("");
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history]);

  useEffect(() => {
    if (isOpen) {
      const startNode = nodes.find((n) => n.type === "start");
      setHistory([]);
      if (startNode) {
        if (startNode.text && startNode.text !== "Início") {
          setHistory([{ sender: "bot", text: startNode.text }]);
        }
        processNode(startNode.id);
      }
    } else {
      setHistory([]);
      setCurrentNodeId(null);
    }
  }, [isOpen]);

  const processNode = (nodeId: string) => {
    const nodeConnections = connections.filter((c) => c.from === nodeId);

    if (nodeConnections.length === 0) return;

    // Simple random choice for branching nodes in preview
    const connection =
      nodeConnections[Math.floor(Math.random() * nodeConnections.length)];

    const nextNode = nodes.find((n) => n.id === connection.to);
    if (!nextNode) return;

    setCurrentNodeId(nextNode.id);

    setTimeout(() => {
      if (nextNode.type === "condition") {
        setHistory((prev) => [
          ...prev,
          { sender: "system", text: nextNode.text },
        ]);
      } else if (nextNode.type === "action") {
        setHistory((prev) => [
          ...prev,
          { sender: "system", text: `[Action] ${nextNode.text}` },
        ]);
      } else {
        setHistory((prev) => [...prev, { sender: "bot", text: nextNode.text }]);
      }

      if (nextNode.type !== "input" && nextNode.type !== "question") {
        processNode(nextNode.id);
      }
    }, 800);
  };

  const handleSend = () => {
    if (!currentInput.trim()) return;

    setHistory((prev) => [...prev, { sender: "user", text: currentInput }]);
    const text = currentInput;
    setCurrentInput("");

    if (currentNodeId) {
      processNode(currentNodeId);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[600px] animate-in zoom-in-95 duration-200 border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="bg-indigo-600 p-4 flex justify-between items-center text-white shadow-md z-10">
          <div className="flex items-center gap-2">
            <div className="bg-white/20 p-1.5 rounded-lg">
              <Bot size={20} />
            </div>
            <div>
              <h3 className="font-bold text-sm">Preview do Chatbot</h3>
              <p className="text-xs text-indigo-200">Testando fluxo atual</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-indigo-700 p-2 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#e5ddd5] dark:bg-gray-900 relative transition-colors">
          <div className="absolute inset-0 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] opacity-5 dark:opacity-[0.02] pointer-events-none"></div>

          {history.length === 0 && (
            <div className="text-center mt-10 text-gray-400 dark:text-gray-500 text-sm">
              Iniciando fluxo...
            </div>
          )}

          {history.map((msg, i) =>
            msg.sender === "system" ? (
              <div
                key={i}
                className="flex justify-center my-2 animate-in fade-in duration-300"
              >
                <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-sm">
                  {msg.text.startsWith("[Action]") ? (
                    <Zap size={12} className="text-purple-500" />
                  ) : (
                    <GitFork size={12} className="text-pink-500" />
                  )}
                  <span
                    className={`text-xs font-medium italic ${
                      msg.text.startsWith("[Action]")
                        ? "text-purple-600 dark:text-purple-400"
                        : "text-pink-600 dark:text-pink-400"
                    }`}
                  >
                    {msg.text}
                  </span>
                </div>
              </div>
            ) : (
              <div
                key={i}
                className={`flex ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                } animate-in slide-in-from-bottom-2 duration-300`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-xl text-sm shadow-sm relative ${
                    msg.sender === "user"
                      ? "bg-indigo-600 text-white rounded-tr-none"
                      : "bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-tl-none"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            )
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex gap-2 items-center">
          <input
            className="flex-1 border-0 bg-white dark:bg-gray-700 shadow-sm rounded-full px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-400"
            placeholder="Digite uma mensagem..."
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            autoFocus
          />
          <button
            onClick={handleSend}
            disabled={!currentInput.trim()}
            className="bg-indigo-600 text-white p-3 rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Component
const ChatbotBuilder = () => {
  const [nodes, setNodes] = useState<Node[]>([
    { id: "1", type: "start", text: "Início", x: 50, y: 150 },
    {
      id: "2",
      type: "message",
      text: "Olá! Como posso ajudar você hoje?",
      x: 300,
      y: 150,
    },
  ]);

  const [connections, setConnections] = useState<Connection[]>([
    { id: "c1", from: "1", to: "2" },
  ]);

  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

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

  // Load state from Firestore
  useEffect(() => {
    const loadFlow = async () => {
      if (!auth.currentUser) return;

      try {
        const docRef = doc(
          db,
          "artifacts",
          appId,
          "users",
          auth.currentUser.uid,
          "chatbot",
          "main_flow"
        );
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.nodes && data.connections) {
            setNodes(data.nodes);
            setConnections(data.connections);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar fluxo:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFlow();
  }, []);

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const docRef = doc(
        db,
        "artifacts",
        appId,
        "users",
        auth.currentUser.uid,
        "chatbot",
        "main_flow"
      );
      await setDoc(
        docRef,
        {
          nodes,
          connections,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      console.error("Erro ao salvar fluxo:", error);
      showAlert("Erro", "Não foi possível salvar o fluxo.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = () => {
    const data = JSON.stringify({ nodes, connections }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "chatbot-flow.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const addNode = (type: Node["type"]) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNode: Node = {
      id,
      type,
      text:
        type === "message"
          ? "Nova mensagem automática"
          : type === "question"
          ? "Nova pergunta"
          : type === "condition"
          ? "Nova condição"
          : type === "action"
          ? "Nova ação"
          : "Novo nó",
      x: 50 + Math.random() * 50,
      y: 50 + Math.random() * 50,
    };
    setNodes((prev) => [...prev, newNode]);
  };

  const handleMouseDown = (id: string) => {
    setDraggingNode(id);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingNode || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - 80;
    const y = e.clientY - rect.top - 40;

    setNodes((prev) =>
      prev.map((n) => (n.id === draggingNode ? { ...n, x, y } : n))
    );
  };

  const handleMouseUp = () => {
    setDraggingNode(null);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-lg relative transition-colors">
      <TestModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        nodes={nodes}
        connections={connections}
      />

      {/* Toolbar */}
      <div className="h-16 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center px-6 z-10">
        <div className="flex items-center gap-4">
          <h2 className="font-bold text-gray-800 dark:text-white">
            Fluxo de Atendimento
          </h2>
          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-2"></div>
          <div className="flex gap-2">
            <button
              onClick={() => addNode("message")}
              className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg shadow-sm text-sm hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-indigo-300 transition"
            >
              <MessageSquare size={16} className="text-blue-500" /> Mensagem
            </button>
            <button
              onClick={() => addNode("question")}
              className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg shadow-sm text-sm hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-indigo-300 transition"
            >
              <HelpCircle size={16} className="text-orange-500" /> Pergunta
            </button>
            <button
              onClick={() => addNode("condition")}
              className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg shadow-sm text-sm hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-indigo-300 transition"
            >
              <GitFork size={16} className="text-pink-500" /> Condicional
            </button>
            <button
              onClick={() => addNode("action")}
              className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg shadow-sm text-sm hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-indigo-300 transition"
            >
              <Zap size={16} className="text-purple-500" /> Ação
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold rounded-lg transition border border-gray-200 dark:border-gray-700 shadow-sm"
          >
            <Download size={18} /> Baixar Fluxo
          </button>
          <button
            onClick={() => setIsTestModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 font-semibold rounded-lg transition border border-indigo-100 dark:border-indigo-900/30"
          >
            <Play size={18} /> Testar Fluxo
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center gap-2 px-4 py-2 text-white font-semibold rounded-lg transition shadow-sm hover:shadow-md ${
              saveSuccess
                ? "bg-green-600 hover:bg-green-700"
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {isSaving ? (
              <Loader2 size={18} className="animate-spin" />
            ) : saveSuccess ? (
              <Check size={18} />
            ) : (
              <Save size={18} />
            )}
            {saveSuccess ? "Salvo!" : "Salvar"}
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="flex-1 bg-[#f8fafc] dark:bg-gray-950 relative overflow-hidden cursor-grab active:cursor-grabbing transition-colors"
        style={{
          backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Connections */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          {connections.map((conn) => {
            const fromNode = nodes.find((n) => n.id === conn.from);
            const toNode = nodes.find((n) => n.id === conn.to);
            if (!fromNode || !toNode) return null;

            // Simple Bezier curve for nicer look
            const startX = fromNode.x + 192; // Width is w-48 = 12rem = 192px
            const startY = fromNode.y + 45;
            const endX = toNode.x;
            const endY = toNode.y + 45;

            return (
              <g key={conn.id}>
                <path
                  d={`M ${startX} ${startY} C ${startX + 50} ${startY}, ${
                    endX - 50
                  } ${endY}, ${endX} ${endY}`}
                  fill="none"
                  className="stroke-slate-400 dark:stroke-slate-600 transition-colors"
                  strokeWidth="2"
                />
                <circle
                  cx={endX}
                  cy={endY}
                  r="3"
                  className="fill-slate-400 dark:fill-slate-600 transition-colors"
                />
              </g>
            );
          })}
        </svg>

        {/* Nodes */}
        {nodes.map((node) => (
          <div
            key={node.id}
            onMouseDown={(e) => {
              e.stopPropagation();
              handleMouseDown(node.id);
            }}
            style={{ left: node.x, top: node.y }}
            className={`absolute w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border-0 ring-1 ring-gray-200 dark:ring-gray-700 group hover:ring-2 transition-all z-10 ${
              node.type === "start"
                ? "hover:ring-green-400"
                : node.type === "condition"
                ? "hover:ring-pink-400"
                : node.type === "action"
                ? "hover:ring-purple-400"
                : "hover:ring-indigo-400"
            }`}
          >
            {/* Node Header */}
            <div
              className={`px-4 py-2 rounded-t-xl flex justify-between items-center ${
                node.type === "start"
                  ? "bg-gradient-to-r from-green-500 to-emerald-600"
                  : node.type === "input"
                  ? "bg-gradient-to-r from-orange-500 to-amber-600"
                  : node.type === "question"
                  ? "bg-gradient-to-r from-orange-500 to-amber-600"
                  : node.type === "condition"
                  ? "bg-gradient-to-r from-pink-500 to-rose-600"
                  : node.type === "action"
                  ? "bg-gradient-to-r from-purple-500 to-violet-600"
                  : "bg-gradient-to-r from-indigo-500 to-blue-600"
              }`}
            >
              <div className="flex items-center gap-2 text-white font-semibold text-xs uppercase tracking-wider">
                {node.type === "start" && (
                  <Play size={12} fill="currentColor" />
                )}
                {node.type === "message" && (
                  <MessageSquare size={12} fill="currentColor" />
                )}
                {node.type === "input" && <HelpCircle size={12} />}
                {node.type === "question" && <HelpCircle size={12} />}
                {node.type === "condition" && <GitFork size={12} />}
                {node.type === "action" && (
                  <Zap size={12} fill="currentColor" />
                )}
                <span>{node.type}</span>
              </div>
              <MousePointer2
                size={14}
                className="text-white/50 opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </div>

            {/* Node Body */}
            <div className="p-4">
              <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
                {node.text}
              </p>
            </div>

            {/* Ports */}
            <div className="absolute top-1/2 -right-2 w-4 h-4 bg-gray-100 dark:bg-gray-700 rounded-full border-2 border-gray-300 dark:border-gray-600 hover:border-indigo-500 dark:hover:border-indigo-500 cursor-pointer transition-colors"></div>
            {node.type !== "start" && (
              <div className="absolute top-1/2 -left-2 w-4 h-4 bg-gray-100 dark:bg-gray-700 rounded-full border-2 border-gray-300 dark:border-gray-600 hover:border-indigo-500 dark:hover:border-indigo-500 cursor-pointer transition-colors"></div>
            )}
          </div>
        ))}
      </div>

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

export default ChatbotBuilder;
