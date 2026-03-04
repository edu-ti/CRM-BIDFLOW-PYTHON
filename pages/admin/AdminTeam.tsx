import React, { useState, useEffect } from "react";
import {
  User,
  Shield,
  Mail,
  Trash2,
  Plus,
  X,
  Check,
  Loader2,
  AlertCircle,
  Edit2,
  Link as LinkIcon,
  Copy,
  Ban,
  Power,
} from "lucide-react";
import { db, appId } from "../../lib/firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
} from "firebase/firestore";
import ConfirmModal, { ConfirmModalType } from "../../components/ConfirmModal"; // Importe o Modal

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "superadmin" | "admin" | "support" | "finance";
  permissions: {
    finance: boolean;
    support: boolean;
    tech: boolean;
    sales: boolean;
  };
  status: "active" | "pending" | "inactive";
  createdAt: string;
}

const AdminTeam = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Estado para o Link de Convite
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

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

  const [newMember, setNewMember] = useState({
    name: "",
    email: "",
    permissions: {
      finance: false,
      support: true,
      tech: false,
      sales: false,
    },
  });

  // 1. Carregar Membros do Firestore
  useEffect(() => {
    const q = query(
      collection(db, "artifacts", appId, "team"),
      orderBy("name")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as TeamMember)
        );
        setMembers(fetched);
        setIsLoading(false);
      },
      (error) => {
        console.error("Erro ao carregar equipe:", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // 2. Handlers
  const handleOpenModal = (member?: TeamMember) => {
    setInviteLink(null);
    setIsCopied(false);

    if (member) {
      setEditingId(member.id);
      setNewMember({
        name: member.name,
        email: member.email,
        permissions: member.permissions,
      });
    } else {
      setEditingId(null);
      setNewMember({
        name: "",
        email: "",
        permissions: {
          finance: false,
          support: true,
          tech: false,
          sales: false,
        },
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!newMember.name || !newMember.email) {
      alert("Por favor, preencha o nome e o email.");
      return;
    }

    setIsSaving(true);
    try {
      const collectionRef = collection(db, "artifacts", appId, "team");
      const memberData = {
        name: newMember.name,
        email: newMember.email,
        role: "admin",
        permissions: newMember.permissions,
        updatedAt: new Date().toISOString(),
      };

      if (editingId) {
        await updateDoc(doc(collectionRef, editingId), memberData);
        setIsModalOpen(false);
      } else {
        const docRef = await addDoc(collectionRef, {
          ...memberData,
          status: "pending",
          createdAt: new Date().toISOString(),
        });

        // CORREÇÃO AQUI: Alterado para apontar para /master em vez de /login
        // Adicionado '#' para suportar HashRouter corretamente
        const generatedLink = `${window.location.origin}/#/master?invite=${
          docRef.id
        }&email=${encodeURIComponent(newMember.email)}`;
        setInviteLink(generatedLink);
      }
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      alert(`Erro ao salvar: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    setConfirmConfig({
      title: "Remover Membro",
      message: `Tem certeza que deseja remover ${name} da equipe?`,
      type: "error",
      confirmText: "Remover",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "artifacts", appId, "team", id));
        } catch (error) {
          console.error("Erro ao excluir:", error);
        }
      },
    });
    setIsConfirmOpen(true);
  };

  const handleToggleStatus = (member: TeamMember) => {
    const newStatus = member.status === "active" ? "inactive" : "active";
    const actionText =
      member.status === "active" ? "desativar (bloquear)" : "ativar";

    setConfirmConfig({
      title: `${member.status === "active" ? "Bloquear" : "Ativar"} Membro`,
      message: `Deseja realmente ${actionText} o acesso de ${member.name}?`,
      type: "warning",
      confirmText: member.status === "active" ? "Bloquear" : "Ativar",
      onConfirm: async () => {
        try {
          await updateDoc(doc(db, "artifacts", appId, "team", member.id), {
            status: newStatus,
          });
        } catch (error) {
          console.error("Erro ao alterar status:", error);
          alert("Erro ao alterar status.");
        }
      },
    });
    setIsConfirmOpen(true);
  };

  const togglePermission = (key: keyof typeof newMember.permissions) => {
    setNewMember((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key],
      },
    }));
  };

  const copyToClipboard = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400";
      case "inactive":
        return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400";
      default:
        return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Ativo";
      case "inactive":
        return "Inativo";
      default:
        return "Pendente";
    }
  };

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
            Equipe Interna
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Gerencie quem tem acesso administrativo ao BidFlow Master.
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-[#6C63FF] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition shadow-sm font-medium"
        >
          <Plus size={18} /> Convidar Membro
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase font-semibold border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="p-4">Membro</th>
              <th className="p-4">Permissões</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {members.map((member) => (
              <tr
                key={member.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition group"
              >
                <td className="p-4 flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border ${
                      member.status === "inactive"
                        ? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-600"
                        : "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800"
                    }`}
                  >
                    {member.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p
                      className={`font-bold ${
                        member.status === "inactive"
                          ? "text-gray-400 dark:text-gray-500"
                          : "text-gray-900 dark:text-white"
                      }`}
                    >
                      {member.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {member.email}
                    </p>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex gap-2 flex-wrap">
                    {member.permissions.finance && (
                      <span className="px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded text-xs border border-green-100 dark:border-green-800">
                        Financeiro
                      </span>
                    )}
                    {member.permissions.support && (
                      <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded text-xs border border-blue-100 dark:border-blue-800">
                        Suporte
                      </span>
                    )}
                    {member.permissions.tech && (
                      <span className="px-2 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded text-xs border border-purple-100 dark:border-purple-800">
                        Técnico
                      </span>
                    )}
                    {member.permissions.sales && (
                      <span className="px-2 py-1 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 rounded text-xs border border-orange-100 dark:border-orange-800">
                        Comercial
                      </span>
                    )}
                    {!Object.values(member.permissions).some(Boolean) && (
                      <span className="text-gray-400 dark:text-gray-500 text-xs italic">
                        Sem permissões
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${getStatusColor(
                      member.status
                    )}`}
                  >
                    {getStatusLabel(member.status)}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleToggleStatus(member)}
                      className={`p-2 rounded-lg transition ${
                        member.status === "active"
                          ? "text-green-600 dark:text-green-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400"
                          : "text-gray-400 dark:text-gray-500 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400"
                      }`}
                      title={
                        member.status === "active"
                          ? "Bloquear Acesso"
                          : "Ativar Acesso"
                      }
                    >
                      {member.status === "active" ? (
                        <Ban size={18} />
                      ) : (
                        <Power size={18} />
                      )}
                    </button>

                    <button
                      onClick={() => handleOpenModal(member)}
                      className="p-2 text-gray-400 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition"
                      title="Editar Membro"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(member.id, member.name)}
                      className="p-2 text-gray-400 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                      title="Remover Membro"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="p-8 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/30"
                >
                  <User
                    className="mx-auto mb-2 text-gray-300 dark:text-gray-600"
                    size={32}
                  />
                  <p>Nenhum membro na equipe.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl p-0 shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
              <h3 className="font-bold text-gray-800 dark:text-white text-lg">
                {inviteLink
                  ? "Convite Gerado!"
                  : editingId
                  ? "Editar Membro"
                  : "Convidar Membro"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {!inviteLink ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nome
                    </label>
                    <input
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition"
                      placeholder="Ex: Edu"
                      value={newMember.name}
                      onChange={(e) =>
                        setNewMember({ ...newMember, name: e.target.value })
                      }
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition"
                      placeholder="email@exemplo.com"
                      value={newMember.email}
                      onChange={(e) =>
                        setNewMember({ ...newMember, email: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Permissões
                    </label>
                    <div className="space-y-3 bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                      <div
                        className="flex items-center gap-3 cursor-pointer group select-none"
                        onClick={() => togglePermission("finance")}
                      >
                        <div
                          className={`w-5 h-5 rounded border flex items-center justify-center transition ${
                            newMember.permissions.finance
                              ? "bg-[#6C63FF] border-[#6C63FF]"
                              : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-500 group-hover:border-[#6C63FF]"
                          }`}
                        >
                          {newMember.permissions.finance && (
                            <Check size={12} className="text-white" />
                          )}
                        </div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Financeiro
                        </span>
                      </div>
                      <div
                        className="flex items-center gap-3 cursor-pointer group select-none"
                        onClick={() => togglePermission("support")}
                      >
                        <div
                          className={`w-5 h-5 rounded border flex items-center justify-center transition ${
                            newMember.permissions.support
                              ? "bg-[#6C63FF] border-[#6C63FF]"
                              : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-500 group-hover:border-[#6C63FF]"
                          }`}
                        >
                          {newMember.permissions.support && (
                            <Check size={12} className="text-white" />
                          )}
                        </div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Suporte
                        </span>
                      </div>
                      <div
                        className="flex items-center gap-3 cursor-pointer group select-none"
                        onClick={() => togglePermission("tech")}
                      >
                        <div
                          className={`w-5 h-5 rounded border flex items-center justify-center transition ${
                            newMember.permissions.tech
                              ? "bg-[#6C63FF] border-[#6C63FF]"
                              : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-500 group-hover:border-[#6C63FF]"
                          }`}
                        >
                          {newMember.permissions.tech && (
                            <Check size={12} className="text-white" />
                          )}
                        </div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Técnico
                        </span>
                      </div>
                      <div
                        className="flex items-center gap-3 cursor-pointer group select-none"
                        onClick={() => togglePermission("sales")}
                      >
                        <div
                          className={`w-5 h-5 rounded border flex items-center justify-center transition ${
                            newMember.permissions.sales
                              ? "bg-[#6C63FF] border-[#6C63FF]"
                              : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-500 group-hover:border-[#6C63FF]"
                          }`}
                        >
                          {newMember.permissions.sales && (
                            <Check size={12} className="text-white" />
                          )}
                        </div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Comercial
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                    <LinkIcon
                      size={32}
                      className="text-green-600 dark:text-green-400"
                    />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    Membro Adicionado!
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    Copie o link abaixo e envie para{" "}
                    <strong>{newMember.name}</strong> para que ele possa acessar
                    a plataforma.
                  </p>
                  <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                    <input
                      readOnly
                      value={inviteLink}
                      className="flex-1 bg-transparent text-sm text-gray-600 dark:text-gray-300 outline-none"
                    />
                    <button
                      onClick={copyToClipboard}
                      className={`p-2 rounded-md transition ${
                        isCopied
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400"
                      }`}
                      title="Copiar Link"
                    >
                      {isCopied ? <Check size={18} /> : <Copy size={18} />}
                    </button>
                  </div>
                  {isCopied && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-medium">
                      Link copiado!
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
              {!inviteLink ? (
                <>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg font-medium transition"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full sm:w-auto px-6 py-2 bg-[#6C63FF] text-white rounded-lg font-bold hover:bg-indigo-700 transition shadow-sm flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : null}
                    {isSaving
                      ? "Salvando..."
                      : editingId
                      ? "Salvar Alterações"
                      : "Criar e Gerar Link"}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-full px-6 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition"
                >
                  Concluído
                </button>
              )}
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

export default AdminTeam;