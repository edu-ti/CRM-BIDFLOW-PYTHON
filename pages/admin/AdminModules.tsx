import React, { useState, useEffect } from "react";
import {
  Box,
  Home,
  Stethoscope,
  ShoppingBag,
  Wrench,
  MessageSquare,
  FileText,
  Edit2,
  Loader2,
  Save,
  X,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { db, appId } from "../../lib/firebase";
import {
  collection,
  onSnapshot,
  updateDoc,
  doc,
  query,
  orderBy,
  setDoc,
} from "firebase/firestore";
import ConfirmModal, { ConfirmModalType } from "../../components/ConfirmModal";

interface Module {
  id: string;
  name: string;
  description: string;
  price: number;
  active: boolean;
  iconKey: string;
}

const initialModules: Module[] = [
  {
    id: "real_estate",
    name: "Imobiliária",
    description: "CRM específico para corretores e imobiliárias.",
    price: 99,
    active: true,
    iconKey: "home",
  },
  {
    id: "health",
    name: "Clínicas & Estética",
    description: "Agendamento e prontuário eletrônico.",
    price: 129,
    active: true,
    iconKey: "stethoscope",
  },
  {
    id: "delivery",
    name: "Delivery",
    description: "Gestão de pedidos e cardápio digital.",
    price: 79,
    active: false,
    iconKey: "shopping-bag",
  },
  {
    id: "tech",
    name: "Assistência Técnica",
    description: "Ordens de serviço e status de reparo.",
    price: 89,
    active: false,
    iconKey: "wrench",
  },
  {
    id: "chatbot_pro",
    name: "Chatbot Pro (IA)",
    description: "Inteligência Artificial avançada para atendimento.",
    price: 199,
    active: true,
    iconKey: "message-square",
  },
  {
    id: "proposals",
    name: "Gerador de Propostas",
    description: "Criação automática de PDFs e contratos.",
    price: 49,
    active: true,
    iconKey: "file-text",
  },
];

const AdminModules = () => {
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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

  // 1. Carregar Módulos
  useEffect(() => {
    const modulesRef = collection(db, "artifacts", appId, "modules");
    const q = query(modulesRef, orderBy("name"));

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        if (snapshot.empty) {
          // Criar dados iniciais se a coleção estiver vazia
          try {
            for (const mod of initialModules) {
              await setDoc(doc(modulesRef, mod.id), mod);
            }
          } catch (e) {
            console.error("Erro ao criar módulos iniciais:", e);
          }
        } else {
          const fetchedModules = snapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() } as Module)
          );
          setModules(fetchedModules);
        }
        setIsLoading(false);
      },
      (err) => {
        console.error("Erro ao carregar módulos:", err);
        setError("Erro de permissão. Verifique as regras do Firebase.");
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const getIcon = (key: string) => {
    switch (key) {
      case "home":
        return <Home size={24} />;
      case "stethoscope":
        return <Stethoscope size={24} />;
      case "shopping-bag":
        return <ShoppingBag size={24} />;
      case "wrench":
        return <Wrench size={24} />;
      case "message-square":
        return <MessageSquare size={24} />;
      case "file-text":
        return <FileText size={24} />;
      default:
        return <Box size={24} />;
    }
  };

  const handleToggle = async (mod: Module) => {
    try {
      await updateDoc(doc(db, "artifacts", appId, "modules", mod.id), {
        active: !mod.active,
      });
    } catch (error) {
      console.error("Erro ao alterar status:", error);
      showAlert("Erro", "Erro ao atualizar. Verifique a conexão.", "error");
    }
  };

  const handleEdit = (mod: Module) => {
    setEditingModule({ ...mod });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingModule) return;
    setIsSaving(true);
    try {
      await updateDoc(
        doc(db, "artifacts", appId, "modules", editingModule.id),
        {
          name: editingModule.name,
          description: editingModule.description,
          price: Number(editingModule.price),
          active: editingModule.active,
        }
      );
      setIsModalOpen(false);
      showAlert("Sucesso", "Módulo salvo com sucesso.", "success");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      showAlert("Erro", "Erro ao salvar módulo.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading)
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="animate-spin text-indigo-600 w-10 h-10" />
      </div>
    );

  if (error)
    return (
      <div className="flex flex-col justify-center items-center h-96 dark:text-red-400 text-red-600 gap-2">
        <AlertCircle className="w-12 h-12" />
        <p className="font-medium">Acesso Negado</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Módulos & Add-ons
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Gerencie os módulos verticais disponíveis para contratação.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((mod) => (
          <div
            key={mod.id}
            className={`bg-white dark:bg-gray-800 rounded-xl border shadow-sm p-6 flex flex-col transition-all hover:shadow-md ${
              mod.active
                ? "border-indigo-200 dark:border-indigo-800 ring-1 ring-indigo-50 dark:ring-indigo-900"
                : "border-gray-200 dark:border-gray-700 opacity-80 hover:opacity-100"
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div
                className={`p-3 rounded-xl ${
                  mod.active
                    ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                }`}
              >
                {getIcon(mod.iconKey)}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(mod)}
                  className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition"
                  title="Editar Módulo"
                >
                  <Edit2 size={18} />
                </button>

                <button
                  onClick={() => handleToggle(mod)}
                  className={`transition-colors ${
                    mod.active
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-gray-300 dark:text-gray-600"
                  }`}
                  title={mod.active ? "Desativar" : "Ativar"}
                >
                  {mod.active ? (
                    <ToggleRight size={36} />
                  ) : (
                    <ToggleLeft size={36} />
                  )}
                </button>
              </div>
            </div>

            <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-1">
              {mod.name}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 flex-1 leading-relaxed">
              {mod.description}
            </p>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center mt-auto">
              <span className="font-bold text-gray-800 dark:text-gray-200 text-lg">
                R$ {mod.price}{" "}
                <span className="text-xs text-gray-400 font-normal">/mês</span>
              </span>
              <span
                className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wide ${
                  mod.active
                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                }`}
              >
                {mod.active ? "Ativo" : "Inativo"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Edição */}
      {isModalOpen && editingModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
              <h3 className="font-bold text-gray-800 dark:text-white text-lg">
                Editar Módulo
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                  Nome do Módulo
                </label>
                <input
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={editingModule.name}
                  onChange={(e) =>
                    setEditingModule({ ...editingModule, name: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                  Descrição
                </label>
                <textarea
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={3}
                  value={editingModule.description}
                  onChange={(e) =>
                    setEditingModule({
                      ...editingModule,
                      description: e.target.value,
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                    Preço Mensal (R$)
                  </label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-indigo-500 font-medium bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={editingModule.price}
                    onChange={(e) =>
                      setEditingModule({
                        ...editingModule,
                        price: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                    Status
                  </label>
                  <select
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={editingModule.active ? "true" : "false"}
                    onChange={(e) =>
                      setEditingModule({
                        ...editingModule,
                        active: e.target.value === "true",
                      })
                    }
                  >
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="ppx-6 py-4 bg-gray-50 dark:bg-gray-900 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition shadow-sm flex items-center gap-2"
              >
                {isSaving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                Salvar Alterações
              </button>
            </div>
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

export default AdminModules;
