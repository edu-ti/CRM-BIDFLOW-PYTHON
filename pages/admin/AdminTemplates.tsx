import React, { useState, useEffect } from "react";
import {
  LayoutTemplate,
  MessageSquare,
  Filter,
  Play,
  Edit3,
  Trash2,
  Plus,
  X,
  Bot,
  Megaphone,
  Loader2,
  Search,
  Save,
  AlertCircle,
  GitFork,
  Tag,
  Clock,
  FileText,
  CheckSquare,
} from "lucide-react";
import { db, appId } from "../../lib/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import ConfirmModal, { ConfirmModalType } from "../../components/ConfirmModal"; // Import do Modal

// Definição estrita dos tipos permitidos
type TemplateType =
  | "Chatbot"
  | "Funil"
  | "Campanha"
  | "Respostas Prontas"
  | "Fluxo de Atendimento"
  | "Tags / Etiquetas"
  | "Sequências de Follow-up"
  | "Scripts de Vendas"
  | "Onboarding / Setup Inicial";

interface Template {
  id: string;
  name: string;
  category: string;
  type: TemplateType;
  description: string;
  createdAt: string;
}

const AdminTemplates = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Template>>({
    name: "",
    category: "",
    type: "Chatbot",
    description: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  // Estado para o Modal de Confirmação
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    type: ConfirmModalType;
    onConfirm: () => void;
    confirmText: string;
  }>({
    title: "",
    message: "",
    type: "info",
    onConfirm: () => {},
    confirmText: "Confirmar",
  });

  // 1. Carregar Templates do Firestore
  useEffect(() => {
    const q = query(
      collection(db, "artifacts", appId, "templates"),
      orderBy("name")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Template)
        );
        setTemplates(fetched);
        setIsLoading(false);
      },
      (error) => {
        console.error("Erro ao carregar templates:", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // 2. Handlers (Salvar, Editar, Deletar)
  const openModal = (tpl?: Template) => {
    if (tpl) {
      setEditingId(tpl.id);
      setFormData({ ...tpl });
    } else {
      setEditingId(null);
      setFormData({ name: "", category: "", type: "Chatbot", description: "" });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.category) {
      alert("Por favor, preencha o Nome e a Categoria.");
      return;
    }

    setIsSaving(true);
    try {
      const ref = collection(db, "artifacts", appId, "templates");
      const dataToSave = {
        name: formData.name,
        category: formData.category,
        type: formData.type || "Chatbot",
        description: formData.description || "",
        updatedAt: new Date().toISOString(),
      };

      if (editingId) {
        await updateDoc(doc(ref, editingId), dataToSave);
      } else {
        await addDoc(ref, {
          ...dataToSave,
          createdAt: new Date().toISOString(),
        });
      }
      setIsModalOpen(false);
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      alert(`Erro ao salvar: ${error.message}. Verifique as permissões.`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string, templateName: string) => {
    setConfirmConfig({
      title: "Excluir Template",
      message: `Tem certeza que deseja excluir o template "${templateName}"? Esta ação não pode ser desfeita.`,
      type: "error",
      confirmText: "Excluir",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "artifacts", appId, "templates", id));
        } catch (error) {
          console.error("Erro ao excluir:", error);
        }
      },
    });
    setIsConfirmOpen(true);
  };

  // 3. Helpers Visuais - Ícones e Cores para cada tipo
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "Chatbot":
        return (
          <Bot size={24} className="text-indigo-600 dark:text-indigo-400" />
        );
      case "Funil":
        return (
          <Filter size={24} className="text-orange-600 dark:text-orange-400" />
        );
      case "Campanha":
        return (
          <Megaphone size={24} className="text-green-600 dark:text-green-400" />
        );
      case "Respostas Prontas":
        return (
          <MessageSquare
            size={24}
            className="text-blue-500 dark:text-blue-400"
          />
        );
      case "Fluxo de Atendimento":
        return (
          <GitFork size={24} className="text-purple-500 dark:text-purple-400" />
        );
      case "Tags / Etiquetas":
        return (
          <Tag size={24} className="text-yellow-600 dark:text-yellow-400" />
        );
      case "Sequências de Follow-up":
        return <Clock size={24} className="text-teal-600 dark:text-teal-400" />;
      case "Scripts de Vendas":
        return (
          <FileText size={24} className="text-red-500 dark:text-red-400" />
        );
      case "Onboarding / Setup Inicial":
        return (
          <CheckSquare size={24} className="text-cyan-600 dark:text-cyan-400" />
        );
      default:
        return (
          <LayoutTemplate
            size={24}
            className="text-gray-600 dark:text-gray-400"
          />
        );
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Chatbot":
        return "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-100 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300";
      case "Funil":
        return "bg-orange-50 dark:bg-orange-900/30 border-orange-100 dark:border-orange-800 text-orange-700 dark:text-orange-300";
      case "Campanha":
        return "bg-green-50 dark:bg-green-900/30 border-green-100 dark:border-green-800 text-green-700 dark:text-green-300";
      case "Respostas Prontas":
        return "bg-blue-50 dark:bg-blue-900/30 border-blue-100 dark:border-blue-800 text-blue-700 dark:text-blue-300";
      case "Fluxo de Atendimento":
        return "bg-purple-50 dark:bg-purple-900/30 border-purple-100 dark:border-purple-800 text-purple-700 dark:text-purple-300";
      case "Tags / Etiquetas":
        return "bg-yellow-50 dark:bg-yellow-900/30 border-yellow-100 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300";
      case "Sequências de Follow-up":
        return "bg-teal-50 dark:bg-teal-900/30 border-teal-100 dark:border-teal-800 text-teal-700 dark:text-teal-300";
      case "Scripts de Vendas":
        return "bg-red-50 dark:bg-red-900/30 border-red-100 dark:border-red-800 text-red-700 dark:text-red-300";
      case "Onboarding / Setup Inicial":
        return "bg-cyan-50 dark:bg-cyan-900/30 border-cyan-100 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300";
      default:
        return "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300";
    }
  };

  const filteredTemplates = templates.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || t.type === filterType;
    return matchesSearch && matchesType;
  });

  if (isLoading)
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="animate-spin text-indigo-600 w-10 h-10" />
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Templates Globais
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Crie modelos prontos para agilizar o setup dos seus clientes.
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-[#6C63FF] text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition flex items-center gap-2 shadow-sm font-medium"
        >
          <Plus size={18} /> Criar Template
        </button>
      </div>

      {/* Barra de Pesquisa */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Buscar por nome ou categoria..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="all">Todos os Tipos</option>
          <option value="Chatbot">Chatbot</option>
          <option value="Funil">Funil</option>
          <option value="Campanha">Campanha</option>
          <option value="Respostas Prontas">Respostas Prontas</option>
          <option value="Fluxo de Atendimento">Fluxo de Atendimento</option>
          <option value="Tags / Etiquetas">Tags / Etiquetas</option>
          <option value="Sequências de Follow-up">
            Sequências de Follow-up
          </option>
          <option value="Scripts de Vendas">Scripts de Vendas</option>
          <option value="Onboarding / Setup Inicial">
            Onboarding / Setup Inicial
          </option>
        </select>
      </div>

      {/* Grid de Templates */}
      {filteredTemplates.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400">
          <LayoutTemplate
            size={48}
            className="mb-4 text-gray-300 dark:text-gray-600"
          />
          <p className="text-lg font-medium">Nenhum template encontrado</p>
          <p className="text-sm">
            Crie o primeiro modelo para disponibilizar aos clientes.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredTemplates.map((tpl) => (
            <div
              key={tpl.id}
              className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition group flex flex-col"
            >
              {/* Cabeçalho do Card */}
              <div className="flex justify-between items-start mb-2">
                <h3
                  className="font-bold text-gray-900 dark:text-white text-base truncate w-full"
                  title={tpl.name}
                >
                  {tpl.name}
                </h3>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-3 right-3 bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-100 dark:border-gray-700">
                  <button
                    onClick={() => handleDelete(tpl.id, tpl.name)}
                    className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Subtítulo (Tipo • Categoria) */}
              <div className="flex items-center gap-2 mb-4">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase truncate max-w-[60%] ${getTypeColor(
                    tpl.type
                  )}`}
                >
                  {tpl.type}
                </span>
                <span className="text-xs text-gray-500 truncate">
                  • {tpl.category}
                </span>
              </div>

              {/* Ícone Central */}
              <div className="flex justify-center my-4">
                <div className={`p-4 rounded-2xl bg-gray-50 dark:bg-gray-700`}>
                  {getTypeIcon(tpl.type)}
                </div>
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4 flex-1 text-center h-10">
                {tpl.description || "Sem descrição definida."}
              </p>

              {/* Botão Editar */}
              <button
                onClick={() => openModal(tpl)}
                className="w-full py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition mt-auto"
              >
                Editar Detalhes
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Criação/Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl p-0 shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
              <h3 className="font-bold text-gray-800 dark:text-white text-lg">
                {editingId ? "Editar Template" : "Novo Template"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome do Modelo
                </label>
                <input
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  placeholder="Ex: Fluxo Agendamento Clínica"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Categoria
                  </label>
                  <input
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition44"
                    placeholder="Ex: Saúde, Vendas"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tipo
                  </label>
                  <select
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        type: e.target.value as TemplateType,
                      })
                    }
                  >
                    <option value="Chatbot">Chatbot</option>
                    <option value="Funil">Funil</option>
                    <option value="Campanha">Campanha</option>
                    <option value="Respostas Prontas">Respostas Prontas</option>
                    <option value="Fluxo de Atendimento">
                      Fluxo de Atendimento
                    </option>
                    <option value="Tags / Etiquetas">Tags / Etiquetas</option>
                    <option value="Sequências de Follow-up">
                      Sequências de Follow-up
                    </option>
                    <option value="Scripts de Vendas">Scripts de Vendas</option>
                    <option value="Onboarding / Setup Inicial">
                      Onboarding / Setup Inicial
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descrição
                </label>
                <textarea
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition resize-none h-24"
                  placeholder="Descreva o objetivo deste template..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg font-medium transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 bg-[#6C63FF] text-white rounded-lg font-bold hover:bg-indigo-700 transition shadow-sm flex items-center gap-2"
              >
                {isSaving ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                {isSaving ? "Salvando..." : "Salvar Template"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
        onConfirm={confirmConfig.onConfirm}
        confirmText={confirmConfig.confirmText}
      />
    </div>
  );
};

export default AdminTemplates;
