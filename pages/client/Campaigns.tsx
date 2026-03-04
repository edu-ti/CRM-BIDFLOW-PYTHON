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
import { db, auth, appId } from "../../lib/firebase";
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import ConfirmModal from "../../components/ConfirmModal";

interface Campaign {
  id: string;
  name: string;
  channel: "whatsapp" | "email" | "sms";
  status: "active" | "completed" | "draft" | "scheduled" | "paused";
  sent: number;
  openRate: string;
  date: string;
  createdAt: string;
}

const Campaigns = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState<Partial<Campaign>>({
    name: "",
    channel: "whatsapp",
    status: "draft",
    sent: 0,
    openRate: "0%",
  });

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(
        db,
        "artifacts",
        appId,
        "users",
        auth.currentUser.uid,
        "campaigns"
      ),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date
          ? new Date(doc.data().date).toLocaleDateString()
          : "-",
      })) as Campaign[];
      setCampaigns(fetched);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCreateCampaign = async () => {
    if (!newCampaign.name || !auth.currentUser) return;

    try {
      await addDoc(
        collection(
          db,
          "artifacts",
          appId,
          "users",
          auth.currentUser.uid,
          "campaigns"
        ),
        {
          ...newCampaign,
          createdAt: new Date().toISOString(),
          date: new Date().toISOString(),
        }
      );
      setIsModalOpen(false);
      setNewCampaign({
        name: "",
        channel: "whatsapp",
        status: "draft",
        sent: 0,
        openRate: "0%",
      });
    } catch (error) {
      console.error("Erro ao criar campanha:", error);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!auth.currentUser) return;
    if (confirm("Tem certeza que deseja excluir esta campanha?")) {
      try {
        await deleteDoc(
          doc(
            db,
            "artifacts",
            appId,
            "users",
            auth.currentUser.uid,
            "campaigns",
            id
          )
        );
      } catch (error) {
        console.error("Erro ao excluir:", error);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
      case "completed":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
      case "scheduled":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300";
      case "paused":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "draft":
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
              <option value="active">Ativas</option>
              <option value="completed">Concluídas</option>
              <option value="scheduled">Agendadas</option>
              <option value="draft">Rascunhos</option>
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
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 capitalize">
                        {getChannelIcon(campaign.channel)}
                        {campaign.channel}
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
                      {campaign.openRate}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300 text-sm">
                      {campaign.date}
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
              <select
                className="w-full border p-2 rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                value={newCampaign.channel}
                onChange={(e) =>
                  setNewCampaign({
                    ...newCampaign,
                    channel: e.target.value as any,
                  })
                }
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </select>
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
                <option value="draft">Rascunho</option>
                <option value="scheduled">Agendada</option>
                <option value="active">Ativa (Enviar Agora)</option>
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
