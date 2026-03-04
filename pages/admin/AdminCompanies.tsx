import React, { useState, useEffect } from "react";
import {
  MoreVertical,
  Plus,
  Search,
  Filter,
  Lock,
  Power,
  Edit2,
  Play,
  Pause,
  X,
  Building,
  Mail,
  Phone,
  Shield,
  Trash2,
  Upload,
  User,
  Activity,
  Loader2,
} from "lucide-react";
import { Link } from "react-router-dom";
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

interface Company {
  id: string;
  name: string;
  domain: string;
  responsible: string;
  email: string;
  phone: string;
  plan: string;
  status: "active" | "trial" | "paused" | "overdue";
  renewal: string;
  mrr: string;
  limits: { users: number; msgs: number };
}

const AdminCompanies = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  // Modal de Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Company>>({
    name: "",
    domain: "",
    responsible: "",
    email: "",
    phone: "",
    plan: "Starter",
    status: "active",
    limits: { users: 1, msgs: 1000 },
  });

  // Estado do Modal de Confirmação
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

  // Firestore Sync
  useEffect(() => {
    const q = query(
      collection(db, "artifacts", appId, "companies"),
      orderBy("name")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Company[];
        setCompanies(fetched);
        setIsLoading(false);
      },
      (error) => {
        console.error("Erro de permissão ou conexão:", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const openModal = (company?: Company) => {
    if (company) {
      setEditingId(company.id);
      setFormData({ ...company });
    } else {
      setEditingId(null);
      setFormData({
        name: "",
        domain: "",
        responsible: "",
        email: "",
        phone: "",
        plan: "Starter",
        status: "active",
        limits: { users: 1, msgs: 1000 },
      });
    }
    setIsModalOpen(true);
    setActiveMenu(null);
  };

  const getPlanPrice = (planName: string) => {
    switch (planName) {
      case "Starter":
        return 199;
      case "Pro":
        return 499;
      case "Enterprise":
        return 999;
      default:
        return 0;
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.email) {
      alert("Preencha os campos obrigatórios");
      return;
    }

    try {
      const companiesRef = collection(db, "artifacts", appId, "companies");
      const mrrValue = getPlanPrice(formData.plan || "Starter");

      const companyData = {
        name: formData.name,
        domain:
          formData.domain ||
          `${formData.name?.toLowerCase().replace(/\s/g, "")}.bidflow.com`,
        responsible: formData.responsible || "Admin",
        email: formData.email,
        phone: formData.phone || "",
        plan: formData.plan || "Starter",
        status: formData.status || "active",
        renewal: new Date().toLocaleDateString(),
        mrr: mrrValue,
        limits: formData.limits || { users: 1, msgs: 1000 },
        updatedAt: new Date().toISOString(),
      };

      if (editingId) {
        await updateDoc(doc(companiesRef, editingId), companyData);
      } else {
        await addDoc(companiesRef, {
          ...companyData,
          createdAt: new Date().toISOString(),
        });
      }
      setIsModalOpen(false);
    } catch (error: any) {
      console.error("Erro ao salvar empresa:", error);
      alert(
        `Erro ao salvar: ${
          error.message || "Verifique o console (F12) para detalhes"
        }`
      );
    }
  };

  const handleDelete = (id: string, name: string) => {
    setConfirmConfig({
      title: "Excluir Empresa",
      message: `Tem certeza que deseja excluir a empresa "${name}"? Todos os dados (usuários, conversas, configurações) serão perdidos permanentemente.`,
      type: "error",
      confirmText: "Excluir Definitivamente",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "artifacts", appId, "companies", id));
        } catch (error: any) {
          console.error("Erro ao excluir:", error);
          alert(`Erro ao excluir: ${error.message}`);
        }
      },
    });
    setIsConfirmOpen(true);
    setActiveMenu(null);
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    try {
      await updateDoc(doc(db, "artifacts", appId, "companies", id), {
        status: currentStatus === "active" ? "paused" : "active",
      });
    } catch (error: any) {
      console.error("Erro ao alterar status:", error);
      alert(`Erro ao alterar status: ${error.message}`);
    }
    setActiveMenu(null);
  };

  const filteredCompanies = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Empresas Clientes
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Gerencie todos os tenants do sistema.
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-[#6C63FF] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 shadow-sm transition"
        >
          <Plus size={18} /> Nova Empresa
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-visible">
        {/* Header da Tabela com Busca Fixada */}
        <div className="pp-4 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row gap-4 justify-between bg-gray-50/30 dark:bg-gray-900/30">
          <div className="relative w-full md:w-96">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Buscar empresa, email ou domínio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition">
            <Filter size={18} /> Filtros
          </button>
        </div>

        <div className="overflow-visible min-h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-left bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 text-xs uppercase font-semibold border-b border-gray-200 dark:border-gray-700">
                  <th className="px-6 py-4">Empresa</th>
                  <th className="px-6 py-4">Contato Admin</th>
                  <th className="px-6 py-4">Plano</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredCompanies.length > 0 ? (
                  filteredCompanies.map((c) => (
                    <tr
                      key={c.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/30 group transition relative"
                    >
                      <td className="px-6 py-4">
                        <Link
                          to={`/admin/companies/${c.id}`}
                          className="flex items-center gap-3 group-hover:opacity-80 transition"
                        >
                          <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg border border-indigo-200 dark:border-indigo-800 shrink-0">
                            {c.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white hover:text-[#6C63FF]">
                              {c.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {c.domain}
                            </p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-900 dark:text-white font-medium flex items-center gap-1">
                            <User size={12} className="text-gray-400" />{" "}
                            {c.responsible}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Mail size={12} className="text-gray-400" />{" "}
                            {c.email}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                            ${
                              c.plan === "Enterprise"
                                ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                                : c.plan === "Pro"
                                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                            }`}
                        >
                          {c.plan}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                            c.status === "active"
                              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                              : c.status === "paused"
                              ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
                              : c.status === "overdue"
                              ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
                              : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                          }`}
                        >
                          {c.status === "active"
                            ? "Ativo"
                            : c.status === "paused"
                            ? "Pausado"
                            : c.status === "overdue"
                            ? "Inadimplente"
                            : "Trial"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenu(activeMenu === c.id ? null : c.id);
                            }}
                            className={`p-2 rounded-lg transition ${
                              activeMenu === c.id
                                ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                                : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            }`}
                          >
                            <MoreVertical size={18} />
                          </button>

                          {activeMenu === c.id && (
                            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                              <div className="py-1 flex flex-col">
                                <button
                                  onClick={() => openModal(c)}
                                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                                >
                                  <Edit2 size={16} className="text-gray-400" />{" "}
                                  Editar Detalhes
                                </button>
                                <button
                                  onClick={() => openModal(c)}
                                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                                >
                                  <Activity
                                    size={16}
                                    className="text-gray-400"
                                  />{" "}
                                  Alterar Plano
                                </button>

                                <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>

                                <button
                                  onClick={() =>
                                    handleToggleStatus(c.id, c.status)
                                  }
                                  className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 ${
                                    c.status === "active"
                                      ? "text-orange-600 dark:text-orange-400"
                                      : "text-green-600 dark:text-green-400"
                                  }`}
                                >
                                  {c.status === "active" ? (
                                    <Pause size={16} />
                                  ) : (
                                    <Play size={16} />
                                  )}
                                  {c.status === "active"
                                    ? "Pausar Cliente"
                                    : "Ativar Cliente"}
                                </button>
                                <button
                                  onClick={() => handleDelete(c.id, c.name)}
                                  className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                                >
                                  <Trash2 size={16} /> Deletar Cliente
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                        {activeMenu === c.id && (
                          <div
                            className="fixed inset-0 z-40 bg-transparent"
                            onClick={() => setActiveMenu(null)}
                          ></div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center py-10 text-gray-500 dark:text-gray-400"
                    >
                      Nenhuma empresa encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900 shrink-0">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <Building className="text-[#6C63FF]" size={20} />
                {editingId ? "Editar Empresa" : "Nova Empresa"}
              </h3>
              <button onClick={() => setIsModalOpen(false)}>
                <X
                  size={20}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="p-6 overflow-y-auto custom-scrollbar bg-white dark:bg-gray-800">
              <div className="grid grid-cols-12 gap-6">
                {/* Logo e Nome (Row 1) */}
                <div className="col-span-3 md:col-span-2">
                  <div className="aspect-square bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition group">
                    <Upload size={24} className="mb-1" />
                    <span className="text-[10px]">Logo</span>
                  </div>
                </div>
                <div className="col-span-9 md:col-span-10">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nome da Empresa *
                  </label>
                  <input
                    type="text"
                    className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder-gray-400 dark:placeholder-gray-400"
                    defaultValue={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Ex: Acme Corporation"
                  />
                </div>

                {/* Responsável e Email (Row 2) */}
                <div className="col-span-12 md:col-span-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nome do Responsável *
                  </label>
                  <div className="relative">
                    <User
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      size={16}
                    />
                    <input
                      type="text"
                      className="w-full pl-9 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder-gray-400 dark:placeholder-gray-400"
                      defaultValue={formData.responsible}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          responsible: e.target.value,
                        })
                      }
                      placeholder="Nome completo"
                    />
                  </div>
                </div>
                <div className="col-span-12 md:col-span-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email de Login *
                  </label>
                  <div className="relative">
                    <Mail
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      size={16}
                    />
                    <input
                      type="email"
                      className="w-full pl-9 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder-gray-400 dark:placeholder-gray-400"
                      defaultValue={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="admin@empresa.com"
                    />
                  </div>
                </div>

                {/* Telefone (Row 3) */}
                <div className="col-span-12">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Telefone / WhatsApp
                  </label>
                  <div className="relative">
                    <Phone
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      size={16}
                    />
                    <input
                      type="text"
                      className="w-full pl-9 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder-gray-400 dark:placeholder-gray-400"
                      defaultValue={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="+55..."
                    />
                  </div>
                </div>

                {/* Divider */}
                <div className="col-span-12 h-px bg-gray-100 dark:bg-gray-700 my-1"></div>

                {/* Plano e Status (Row 4) */}
                <div className="col-span-12 md:col-span-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Plano Contratado
                  </label>
                  <select
                    className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.plan}
                    onChange={(e) =>
                      setFormData({ ...formData, plan: e.target.value })
                    }
                  >
                    <option value="Starter">Starter</option>
                    <option value="Pro">Pro</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>
                </div>
                <div className="col-span-12 md:col-span-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status da Conta
                  </label>
                  <select
                    className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as any,
                      })
                    }
                  >
                    <option value="active">Ativo</option>
                    <option value="trial">Trial (Teste)</option>
                    <option value="paused">Pausado</option>
                    <option value="overdue">Inadimplente</option>
                  </select>
                </div>

                {/* Limites (Row 5) */}
                <div className="col-span-12 md:col-span-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Limite de Usuários
                  </label>
                  <input
                    type="number"
                    className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    defaultValue={formData.limits?.users}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        limits: {
                          ...formData.limits!,
                          users: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Limite de Mensagens
                  </label>
                  <input
                    type="number"
                    className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    defaultValue={formData.limits?.msgs}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        limits: {
                          ...formData.limits!,
                          msgs: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700 shrink-0">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg font-medium transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-[#6C63FF] text-white rounded-lg hover:bg-indigo-700 font-medium transition shadow-sm"
              >
                Salvar Empresa
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

export default AdminCompanies;
