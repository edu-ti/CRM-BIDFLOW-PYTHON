import React, { useState, useEffect } from "react";
import {
  Check,
  Plus,
  Edit,
  X,
  Trash2,
  Loader2,
  AlertCircle,
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
import ConfirmModal, { ConfirmModalType } from "../../components/ConfirmModal";

interface Plan {
  id: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  limits: {
    users: number;
    msgs: number;
  };
  recommended: boolean;
  modules: {
    chatbot: boolean;
    automation: boolean;
    api: boolean;
  };
}

const AdminPlans = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Estado do Formulário
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Plan>>({
    name: "",
    priceMonthly: 0,
    priceYearly: 0,
    limits: { users: 1, msgs: 1000 },
    modules: { chatbot: false, automation: false, api: false },
    features: [],
    recommended: false,
  });

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

  // 1. Carregar Planos do Firestore em Tempo Real
  useEffect(() => {
    const q = query(
      collection(db, "artifacts", appId, "plans"),
      orderBy("priceMonthly")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedPlans = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Plan[];
        setPlans(fetchedPlans);
        setIsLoading(false);
      },
      (error) => {
        console.error("Erro ao buscar planos:", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // 2. Função para Abrir Modal (Corrigindo o bug de vir vazio)
  const openModal = (plan?: Plan) => {
    if (plan) {
      // Modo Edição: Preenche os dados
      setEditingId(plan.id);
      setFormData({ ...plan });
    } else {
      // Modo Criação: Limpa os dados
      setEditingId(null);
      setFormData({
        name: "",
        priceMonthly: 0,
        priceYearly: 0,
        limits: { users: 1, msgs: 1000 },
        modules: { chatbot: false, automation: false, api: false },
        features: [],
        recommended: false,
      });
    }
    setIsModalOpen(true);
  };

  // 3. Função de Salvar (Corrigindo o bug de não salvar)
  const handleSave = async () => {
    if (!formData.name || !formData.priceMonthly) {
      showAlert(
        "Campos Obrigatórios",
        "Por favor, preencha o nome e o preço mensal.",
        "warning"
      );
      return;
    }

    setIsSaving(true);
    try {
      const plansRef = collection(db, "artifacts", appId, "plans");

      // Montar objeto de features para exibição visual no card
      const featuresList = [
        `${formData.limits?.users} Atendente${
          (formData.limits?.users || 0) > 1 ? "s" : ""
        }`,
        `${formData.limits?.msgs} Mensagens`,
        formData.modules?.chatbot ? "Chatbot Incluso" : null,
        formData.modules?.automation ? "Automação Avançada" : null,
        formData.modules?.api ? "API Access" : null,
      ].filter(Boolean) as string[];

      const dataToSave = {
        ...formData,
        features: featuresList,
        updatedAt: new Date().toISOString(),
      };

      if (editingId) {
        // Atualizar
        await updateDoc(doc(plansRef, editingId), dataToSave);
      } else {
        // Criar
        await addDoc(plansRef, {
          ...dataToSave,
          createdAt: new Date().toISOString(),
        });
      }
      setIsModalOpen(false);
      showAlert("Sucesso", "Plano salvo com sucesso.", "success");
    } catch (error: any) {
      console.error("Erro ao salvar plano:", error);
      showAlert("Erro", `Erro ao salvar: ${error.message}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmConfig({
      title: "Excluir Plano",
      message:
        "Tem certeza que deseja excluir este plano? Clientes associados podem ser afetados.",
      type: "error",
      confirmText: "Excluir",
      showCancel: true,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "artifacts", appId, "plans", id));
        } catch (error) {
          console.error("Erro ao excluir:", error);
          showAlert("Erro", "Erro ao excluir plano.", "error");
        }
      },
    });
    setIsConfirmOpen(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Planos e Assinaturas
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Configure os pacotes comerciais do seu SaaS.
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-[#6C63FF] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition shadow-sm font-medium"
        >
          <Plus size={18} /> Criar Novo Plano
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-indigo-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white dark:bg-gray-800 rounded-xl border p-6 flex flex-col relative transition-all hover:shadow-lg ${
                plan.recommended
                  ? "border-[#6C63FF] shadow-md ring-1 ring-indigo-100 dark:ring-indigo-900"
                  : "border-gray-200 dark:border-gray-700 shadow-sm"
              }`}
            >
              {plan.recommended && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#6C63FF] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                  Recomendado
                </span>
              )}

              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {plan.name}
                </h3>
                <div className="flex gap-2">
                  <button
                    className="text-gray-400 hover:text-[#6C63FF] dark:hover:text-indigo-400 transition"
                    onClick={() => openModal(plan)}
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition"
                    onClick={() => handleDelete(plan.id)}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                  R$ {plan.priceMonthly}
                </span>
                <span className="text-gray-500 dark:text-gray-400">/mês</span>
                {plan.priceYearly > 0 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    ou R$ {plan.priceYearly} anual
                  </p>
                )}
              </div>

              <div className="flex-1 space-y-3 mb-6">
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <Check size={16} className="text-green-500" />{" "}
                  {plan.limits.users} Atendente(s)
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <Check size={16} className="text-green-500" />{" "}
                  {plan.limits.msgs} Mensagens
                </div>
                {plan.modules.chatbot && (
                  <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <Check size={16} className="text-green-500" /> Chatbot
                    Incluso
                  </div>
                )}
                {plan.modules.automation && (
                  <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <Check size={16} className="text-green-500" /> Automação
                    Avançada
                  </div>
                )}
                {plan.modules.api && (
                  <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <Check size={16} className="text-green-500" /> API Access
                  </div>
                )}
              </div>
            </div>
          ))}
          {plans.length === 0 && (
            <div className="col-span-full p-12 text-center bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
              <AlertCircle className="mx-auto text-gray-400 mb-3" size={48} />
              <p className="text-gray-500 dark:text-gray-400">
                Nenhum plano criado.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal de Edição/Criação */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
              <h3 className="font-bold text-gray-800 dark:text-white">
                {editingId ? "Editar Plano" : "Criar Novo Plano"}
              </h3>
              <button onClick={() => setIsModalOpen(false)}>
                <X
                  size={20}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome do Plano
                </label>
                <input
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Ex: Enterprise"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Preço Mensal (R$)
                  </label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={formData.priceMonthly}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        priceMonthly: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Preço Anual (R$)
                  </label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={formData.priceYearly}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        priceYearly: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Limite Msg/Mês
                  </label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={formData.limits?.msgs}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        limits: {
                          ...formData.limits!,
                          msgs: Number(e.target.value),
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Limite Atendentes
                  </label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={formData.limits?.users}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        limits: {
                          ...formData.limits!,
                          users: Number(e.target.value),
                        },
                      })
                    }
                  />
                </div>
              </div>

              <div className="pt-2 space-y-3 border-t border-gray-100 dark:border-gray-700">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Módulos Inclusos
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded border border-transparent hover:border-gray-200 dark:hover:border-gray-600">
                  <input
                    type="checkbox" 
                    className="rounded text-indigo-600"
                    checked={formData.modules?.chatbot}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        modules: {
                          ...formData.modules!,
                          chatbot: e.target.checked,
                        },
                      })
                    }
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Chatbot Incluso</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded border border-transparent hover:border-gray-200 dark:hover:border-gray-600">
                  <input
                    type="checkbox"
                    className="rounded text-indigo-600"
                    checked={formData.modules?.automation}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        modules: {
                          ...formData.modules!,
                          automation: e.target.checked,
                        },
                      })
                    }
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Automação Avançada</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded border border-transparent hover:border-gray-200 dark:hover:border-gray-600">
                  <input
                    type="checkbox"
                    className="rounded text-indigo-600"
                    checked={formData.modules?.api}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        modules: {
                          ...formData.modules!,
                          api: e.target.checked,
                        },
                      })
                    }
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">API Access</span>
                </label>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded text-indigo-600"
                      checked={formData.recommended}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          recommended: e.target.checked,
                        })
                      }
                    />
                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                      Destacar como Recomendado
                    </span>
                  </label>
                </div>
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
                ) : null}
                Salvar Plano
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
  )
};

export default AdminPlans;
