import React, { useState, useEffect } from "react";
import {
  Plus,
  Megaphone,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  MoreHorizontal,
  Send,
  MessageCircle,
  Mail,
  Loader2,
  X,
  Trash2,
} from "lucide-react";
import { apiFetch } from "../../lib/api";
import ConfirmModal from "../../components/ConfirmModal";

interface Campaign {
  id: string;
  name: string;
  status: "Ativa" | "Pausada" | "Concluída" | "Rascunho";
  target_audience: string;
  message_content: string;
  scheduled_date: string;
  created_at: string;
  // Fields for UI demo/legacy
  sent?: number;
  openRate?: string;
  channel?: "whatsapp" | "email" | "sms";
}

const Campaigns = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState<Partial<Campaign>>({
    name: "",
    target_audience: "Todos os Clientes",
    message_content: "",
    status: "Rascunho",
  });

  const fetchCampaigns = async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch("/campaigns/");
      setCampaigns(data);
    } catch (error) {
      console.error("Erro ao carregar campanhas:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleCreateCampaign = async () => {
    if (!newCampaign.name) return;

    try {
      await apiFetch("/campaigns/", {
        method: "POST",
        body: JSON.stringify({
          ...newCampaign,
          scheduled_date: new Date().toISOString(),
        }),
      });
      fetchCampaigns();
      setIsModalOpen(false);
      setNewCampaign({
        name: "",
        target_audience: "Todos os Clientes",
        message_content: "",
        status: "Rascunho",
      });
    } catch (error) {
      console.error("Erro ao criar campanha:", error);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta campanha?")) {
      try {
        await apiFetch(`/campaigns/${id}/`, { method: "DELETE" });
        setCampaigns(campaigns.filter((c) => c.id !== id));
      } catch (error) {
        console.error("Erro ao excluir:", error);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Ativa":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
      case "Concluída":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
      case "Pausada":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "Rascunho":
        return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400";
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "whatsapp":
        return (
          <MessageCircle
            size={18}
            className="text-green-600 dark:text-green-400"
          />
        );
      case "email":
        return <Mail size={18} className="text-blue-600 dark:text-blue-400" />;
      case "sms":
        return (
          <Send size={18} className="text-purple-600 dark:text-purple-400" />
        );
      default:
        return <Megaphone size={18} />;
    }
  };

  const filteredCampaigns = campaigns.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (filterStatus === "all" || c.status === filterStatus)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Campanhas
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Gerencie seus disparos em massa e automações.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 font-medium transition shadow-sm"
        >
          <Plus size={18} /> Nova Campanha
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
            <Send size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              Total Enviado
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {campaigns
                .reduce((acc, curr) => acc + (curr.sent || 0), 0)
                .toLocaleString()}
            </p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-600 dark:text-green-400">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              Campanhas Ativas
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {campaigns.filter((c) => c.status === "active").length}
            </p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-orange-600 dark:text-orange-400">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              Agendadas
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {campaigns.filter((c) => c.status === "scheduled").length}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row gap-4 justify-between">
          <div className="relative w-full md:w-96">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Buscar campanhas..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none text-gray-600 dark:text-gray-200 bg-white dark:bg-gray-700"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">Todos os Status</option>
              <option value="Ativa">Ativas</option>
              <option value="Concluída">Concluídas</option>
              <option value="Pausada">Pausadas</option>
              <option value="Rascunho">Rascunhos</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 text-xs uppercase font-semibold">
                <th className="px-6 py-4">Nome da Campanha</th>
                <th className="px-6 py-4">Canal</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Enviados</th>
                <th className="px-6 py-4">Abertura</th>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center">
                    <Loader2 className="animate-spin inline text-indigo-600" />
                  </td>
                </tr>
              ) : filteredCampaigns.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-10 text-gray-500 dark:text-gray-400"
                  >
                    Nenhuma campanha encontrada.
                  </td>
                </tr>
              ) : (
                filteredCampaigns.map((campaign) => (
                  <tr
                    key={campaign.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition group"
                  >
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                      {campaign.name}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        {campaign.target_audience}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${getStatusColor(
                          campaign.status
                        )}`}
                      >
                        {campaign.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300 text-sm">
                      {campaign.sent?.toLocaleString() || 0}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300 text-sm">
                      {campaign.openRate || "0%"}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300 text-sm">
                      {campaign.scheduled_date ? new Date(campaign.scheduled_date).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteCampaign(campaign.id)}
                        className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-xl shadow-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                Nova Campanha
              </h3>
              <button onClick={() => setIsModalOpen(false)}>
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <input
                className="w-full border p-2 rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                placeholder="Nome da Campanha"
                value={newCampaign.name}
                onChange={(e) =>
                  setNewCampaign({ ...newCampaign, name: e.target.value })
                }
              />
              <input
                className="w-full border p-2 rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                placeholder="Público Alvo (ex: Clientes VIP)"
                value={newCampaign.target_audience}
                onChange={(e) =>
                  setNewCampaign({ ...newCampaign, target_audience: e.target.value })
                }
              />
              <textarea
                className="w-full border p-2 rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                placeholder="Conteúdo da Mensagem"
                rows={3}
                value={newCampaign.message_content}
                onChange={(e) =>
                  setNewCampaign({ ...newCampaign, message_content: e.target.value })
                }
              />
              <select
                className="w-full border p-2 rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                value={newCampaign.status}
                onChange={(e) =>
                  setNewCampaign({
                    ...newCampaign,
                    status: e.target.value as any,
                  })
                }
              >
                <option value="Rascunho">Rascunho</option>
                <option value="Ativa">Ativa (Enviar Agora)</option>
                <option value="Pausada">Pausada</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateCampaign}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Campaigns;
