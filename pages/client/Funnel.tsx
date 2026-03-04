import React, { useState, useEffect } from "react";
import {
  Plus,
  MoreHorizontal,
  GripVertical,
  DollarSign,
  Loader2,
  Trash2,
  X,
  Edit2,
  Kanban,
} from "lucide-react";
import { Deal, FunnelStage } from "../../types";
import { db, auth, appId } from "../../lib/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  writeBatch,
} from "firebase/firestore";
import ConfirmModal, { ConfirmModalType } from "../../components/ConfirmModal";

// Interface local estendida para incluir 'order' se necessário
interface ExtendedFunnelStage extends FunnelStage {
  order?: number;
}

const Funnel = () => {
  const [stages, setStages] = useState<ExtendedFunnelStage[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal Novo Negócio
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDeal, setNewDeal] = useState({
    title: "",
    value: "",
    contactName: "",
  });

  // Modal Nova Etapa
  const [isStageModalOpen, setIsStageModalOpen] = useState(false);
  const [newStageName, setNewStageName] = useState("");
  const [newStageColor, setNewStageColor] = useState("bg-gray-500");

  // Menu de Etapa
  const [activeStageMenu, setActiveStageMenu] = useState<string | null>(null);

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

  // Cores disponíveis para as etapas
  const stageColors = [
    { name: "Azul", class: "bg-blue-500" },
    { name: "Amarelo", class: "bg-yellow-500" },
    { name: "Roxo", class: "bg-purple-500" },
    { name: "Verde", class: "bg-green-500" },
    { name: "Vermelho", class: "bg-red-500" },
    { name: "Rosa", class: "bg-pink-500" },
    { name: "Laranja", class: "bg-orange-500" },
    { name: "Cinza", class: "bg-gray-500" },
  ];

  // 1. Carregar Etapas (Stages)
  useEffect(() => {
    if (!auth.currentUser) return;

    const stagesRef = collection(
      db,
      "artifacts",
      appId,
      "users",
      auth.currentUser.uid,
      "funnel_stages"
    );
    const q = query(stagesRef, orderBy("order", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        // Se não houver etapas, cria as padrões
        const initialStages = [
          { name: "Novo Lead", color: "bg-blue-500", order: 0 },
          { name: "Em Contato", color: "bg-yellow-500", order: 1 },
          { name: "Proposta Enviada", color: "bg-purple-500", order: 2 },
          { name: "Fechado", color: "bg-green-500", order: 3 },
        ];
        initialStages.forEach((stage) => addDoc(stagesRef, stage));
      } else {
        const fetchedStages = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ExtendedFunnelStage[];
        setStages(fetchedStages);
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Carregar Negócios (Deals)
  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, "artifacts", appId, "users", auth.currentUser.uid, "deals")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedDeals = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Deal[];
      setDeals(fetchedDeals);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    e.dataTransfer.setData("dealId", dealId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    const dealId = e.dataTransfer.getData("dealId");
    if (!dealId || !auth.currentUser) return;

    // Optimistic Update
    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, stageId } : d))
    );

    try {
      const dealDoc = doc(
        db,
        "artifacts",
        appId,
        "users",
        auth.currentUser.uid,
        "deals",
        dealId
      );
      await updateDoc(dealDoc, { stageId });
    } catch (error) {
      console.error("Failed to move deal:", error);
    }
  };

  // --- Funções de Negócios (Deals) ---

  const handleAddDeal = async () => {
    if (
      !newDeal.title ||
      !newDeal.value ||
      !auth.currentUser ||
      stages.length === 0
    )
      return;

    try {
      await addDoc(
        collection(
          db,
          "artifacts",
          appId,
          "users",
          auth.currentUser.uid,
          "deals"
        ),
        {
          title: newDeal.title,
          value: Number(newDeal.value),
          contactName: newDeal.contactName,
          stageId: stages[0].id, // Primeiro estágio por padrão
          createdAt: new Date().toISOString(),
        }
      );
      setIsModalOpen(false);
      setNewDeal({ title: "", value: "", contactName: "" });
    } catch (error) {
      console.error("Error creating deal:", error);
    }
  };

  const handleDeleteDeal = (id: string) => {
    if (!auth.currentUser) return;

    setConfirmConfig({
      title: "Excluir Negócio",
      message: "Tem certeza que deseja excluir este negócio?",
      type: "error",
      confirmText: "Excluir",
      showCancel: true,
      onConfirm: async () => {
        try {
          await deleteDoc(
            doc(
              db,
              "artifacts",
              appId,
              "users",
              auth.currentUser!.uid,
              "deals",
              id
            )
          );
        } catch (e) {
          console.error("Error deleting deal:", e);
        }
      },
    });
    setIsConfirmOpen(true);
  };

  // --- Funções de Etapas (Stages) ---

  const handleAddStage = async () => {
    if (!newStageName || !auth.currentUser) return;

    try {
      await addDoc(
        collection(
          db,
          "artifacts",
          appId,
          "users",
          auth.currentUser.uid,
          "funnel_stages"
        ),
        {
          name: newStageName,
          color: newStageColor,
          order: stages.length, // Adiciona ao final
        }
      );
      setIsStageModalOpen(false);
      setNewStageName("");
      setNewStageColor("bg-gray-500");
    } catch (error) {
      console.error("Error creating stage:", error);
    }
  };

  const handleDeleteStage = (stageId: string) => {
    if (!auth.currentUser) return;

    // Verificar se existem deals nesta etapa
    const dealsInStage = deals.filter((d) => d.stageId === stageId);

    const confirmMessage =
      dealsInStage.length > 0
        ? `Esta etapa contém ${dealsInStage.length} negócios. Eles também serão excluídos. Deseja continuar?`
        : "Tem certeza que deseja excluir esta etapa?";

    setConfirmConfig({
      title: "Excluir Etapa",
      message: confirmMessage,
      type: "error",
      confirmText: "Excluir Etapa",
      showCancel: true,
      onConfirm: async () => {
        try {
          // Excluir a etapa
          await deleteDoc(
            doc(
              db,
              "artifacts",
              appId,
              "users",
              auth.currentUser!.uid,
              "funnel_stages",
              stageId
            )
          );

          // Excluir (ou mover) os negócios da etapa - aqui optamos por excluir para simplificar,
          // mas em produção poderia mover para a primeira coluna ou arquivar.
          const batch = writeBatch(db);
          dealsInStage.forEach((d) => {
            const dealRef = doc(
              db,
              "artifacts",
              appId,
              "users",
              auth.currentUser!.uid,
              "deals",
              d.id
            );
            batch.delete(dealRef);
          });
          await batch.commit();

          setActiveStageMenu(null);
        } catch (e) {
          console.error("Error deleting stage:", e);
        }
      },
    });
    setIsConfirmOpen(true);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          Funil de Vendas
        </h1>
        <div className="flex gap-3">
          <button
            onClick={() => setIsStageModalOpen(true)}
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium text-sm"
          >
            <Kanban size={16} /> Nova Etapa
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 font-medium text-sm transition"
          >
            <Plus size={16} /> Novo Negócio
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
        </div>
      ) : (
        <div className="flex-1 flex gap-6 overflow-x-auto pb-4 items-start">
          {stages.map((stage) => {
            const stageDeals = deals.filter((d) => d.stageId === stage.id);
            const totalValue = stageDeals.reduce(
              (acc, curr) => acc + (curr.value || 0),
              0
            );

            return (
              <div
                key={stage.id}
                className="min-w-[300px] w-[300px] flex flex-col bg-gray-100 dark:bg-gray-800/50 rounded-xl p-3 border border-transparent dark:border-gray-700 h-full max-h-full"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                {/* Header da Etapa */}
                <div className="flex justify-between items-center mb-3 px-1 relative">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div
                      className={`w-3 h-3 rounded-full flex-shrink-0 ${stage.color}`}
                    ></div>
                    <h3
                      className="font-semibold text-gray-700 dark:text-gray-200 truncate"
                      title={stage.name}
                    >
                      {stage.name}
                    </h3>
                    <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full text-xs font-bold">
                      {stageDeals.length}
                    </span>
                  </div>

                  {/* Menu Três Pontinhos */}
                  <div className="relative">
                    <button
                      onClick={() =>
                        setActiveStageMenu(
                          activeStageMenu === stage.id ? null : stage.id
                        )
                      }
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                    >
                      <MoreHorizontal size={16} />
                    </button>

                    {activeStageMenu === stage.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10 cursor-default"
                          onClick={() => setActiveStageMenu(null)}
                        ></div>
                        <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                          <button
                            className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                            onClick={() => handleDeleteStage(stage.id)}
                          >
                            <Trash2 size={14} /> Excluir Etapa
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="mb-3 px-1">
                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    Total Estimado
                  </p>
                  <p className="text-sm font-bold text-gray-800 dark:text-white">
                    {totalValue.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </p>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar pr-1">
                  {stageDeals.map((deal) => (
                    <div
                      key={deal.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, deal.id)}
                      className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 cursor-grab active:cursor-grabbing hover:shadow-md transition group relative"
                    >
                      <button
                        onClick={() => handleDeleteDeal(deal.id)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                      <div className="flex justify-between items-start mb-2">
                        <span className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold uppercase rounded">
                          Negócio
                        </span>
                        <GripVertical
                          size={14}
                          className="text-gray-300 dark:text-gray-600"
                        />
                      </div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">
                        {deal.title}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 truncate">
                        {deal.contactName}
                      </p>
                      <div className="flex items-center gap-1 text-gray-700 dark:text-gray-300 font-medium text-sm bg-gray-50 dark:bg-gray-900/50 p-1.5 rounded w-fit">
                        <DollarSign size={14} />
                        {deal.value.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Coluna "Adicionar Etapa" (Opcional, visualmente indica fim do funil) */}
          <button
            onClick={() => setIsStageModalOpen(true)}
            className="min-w-[50px] flex flex-col items-center justify-center h-full opacity-50 hover:opacity-100 transition group"
          >
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 group-hover:text-indigo-600">
              <Plus size={24} />
            </div>
          </button>
        </div>
      )}

      {/* Modal Novo Negócio */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-xl shadow-2xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                Novo Negócio
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Título
                </label>
                <input
                  className="w-full border p-2 rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Ex: Contrato Anual"
                  value={newDeal.title}
                  onChange={(e) =>
                    setNewDeal({ ...newDeal, title: e.target.value })
                  }
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Valor
                </label>
                <input
                  className="w-full border p-2 rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="0.00"
                  type="number"
                  value={newDeal.value}
                  onChange={(e) =>
                    setNewDeal({ ...newDeal, value: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Cliente
                </label>
                <input
                  className="w-full border p-2 rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Nome do Cliente"
                  value={newDeal.contactName}
                  onChange={(e) =>
                    setNewDeal({ ...newDeal, contactName: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddDeal}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition shadow-sm"
              >
                Criar Negócio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Etapa */}
      {isStageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-xl shadow-2xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                Nova Etapa do Funil
              </h3>
              <button
                onClick={() => setIsStageModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Nome da Etapa
                </label>
                <input
                  className="w-full border p-2 rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Ex: Negociação"
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Cor de Identificação
                </label>
                <div className="flex flex-wrap gap-2">
                  {stageColors.map((color) => (
                    <button
                      key={color.class}
                      onClick={() => setNewStageColor(color.class)}
                      className={`w-8 h-8 rounded-full ${
                        color.class
                      } transition-transform hover:scale-110 ${
                        newStageColor === color.class
                          ? "ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-gray-800 scale-110"
                          : ""
                      }`}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setIsStageModalOpen(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddStage}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition shadow-sm"
              >
                Adicionar Etapa
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

export default Funnel;
