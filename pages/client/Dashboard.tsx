import React, { useEffect, useState } from "react";
import {
  Users,
  MessageSquare,
  DollarSign,
  Activity,
  Loader2,
} from "lucide-react";
import { StatCard } from "../../components/StatCard";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { db, auth, appId } from "../../lib/firebase";
import { collection, query, getDocs, where, orderBy } from "firebase/firestore";


const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    leads: 0,
    leadsChange: 0,
    messages: 0,
    sales: 0,
    revenue: 0,
    responseRate: 0,
  });
  // Adicione este estado:
  const [mensagemDjango, setMensagemDjango] = useState<string>('');

  // Adicione este useEffect logo abaixo dos outros:
  useEffect(() => {
    const fetchDjango = async () => {
      // Verifica se existe um utilizador logado no Firebase
      if (!auth.currentUser) {
        setMensagemDjango('Utilizador não autenticado no Firebase.');
        return;
      }
      try {
        // Obtém o token atualizado do Firebase (obrigatório para enviar para Django)
        const token = await auth.currentUser.getIdToken(true); // forceRefresh
        console.log("Token gerado pelo Firebase no React:", token ? token.substring(0, 20) + "..." : "VAZIO");

        const res = await fetch('http://localhost:8000/api/teste/', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          // Devolve a mensagem do Django (que inclui os dados de utilizador logado)
          setMensagemDjango(`${data.mensagem} Logado como: ${data.email || data.user_id}`);
        } else if (res.status === 401 || res.status === 403) {
          setMensagemDjango('Acesso Negado: Token inválido ou expirado.');
        } else {
          setMensagemDjango(`Erro: Ocorreu um problema no servidor (${res.status}).`);
        }
      } catch (err) {
        console.error("Erro ao contactar Django:", err);
        setMensagemDjango('Erro de conexão ao servidor Django.');
      }
    };

    // Podemos invocar após o currentUser estar disponível
    // Caso auth.currentUser seja nulo ao carregar rápido, deve ser tratado com onAuthStateChanged
    // no App.tsx ou adicionado aqui, mas sendo uma verificação inicial:
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchDjango();
      } else {
        setMensagemDjango('A aguardar login...');
      }
    });

    return () => unsubscribe();
  }, []);
  const [chartData, setChartData] = useState<any[]>([]);

  // Helpers de data
  const getLast7Days = () => {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toLocaleDateString("pt-BR", { weekday: "short" }));
    }
    return dates;
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!auth.currentUser) return;
      setLoading(true);

      try {
        const uid = auth.currentUser.uid;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLast7Days = new Date();
        startOfLast7Days.setDate(now.getDate() - 7);

        // 1. Buscar Contatos (Leads)
        const contactsRef = collection(
          db,
          "artifacts",
          appId,
          "users",
          uid,
          "contacts"
        );
        const contactsSnap = await getDocs(contactsRef);
        const contacts = contactsSnap.docs.map((doc) => ({
          ...doc.data(),
          createdAt: doc.data().createdAt,
        }));

        // Filtrar leads deste mês
        const newLeads = contacts.filter(
          (c: any) => new Date(c.createdAt) >= startOfMonth
        ).length;

        // 2. Buscar Negócios (Vendas)
        const dealsRef = collection(
          db,
          "artifacts",
          appId,
          "users",
          uid,
          "deals"
        );
        const dealsSnap = await getDocs(dealsRef);
        const deals = dealsSnap.docs.map((doc) => doc.data());

        // Filtrar vendas ganhas (stageId 's4' do Funnel.tsx é "Fechado")
        const wonDeals = deals.filter((d: any) => d.stageId === "s4");
        const totalRevenue = wonDeals.reduce(
          (acc: number, curr: any) => acc + (Number(curr.value) || 0),
          0
        );

        // 3. Buscar Conversas (Proxy para Mensagens e Taxa)
        const conversationsRef = collection(
          db,
          "artifacts",
          appId,
          "users",
          uid,
          "conversations"
        );
        const conversationsSnap = await getDocs(conversationsRef);
        const conversations = conversationsSnap.docs.map((doc) => doc.data());

        // Simulação de volume de mensagens baseada em conversas ativas (para evitar leitura excessiva de subcoleções)
        // Em produção, você usaria um contador incrementado via Cloud Functions
        const activeChats = conversations.filter(
          (c: any) => new Date(c.lastMessageAt) >= startOfMonth
        ).length;
        const estimatedMessages = activeChats * 12; // Média estimada de 12 msgs por conversa ativa

        // Taxa de Resposta (Conversas sem unreadCount > 0)
        const totalChats = conversations.length;
        const repliedChats = conversations.filter(
          (c: any) => c.unreadCount === 0
        ).length;
        const responseRate =
          totalChats > 0 ? Math.round((repliedChats / totalChats) * 100) : 100;

        setStats({
          leads: newLeads,
          leadsChange:
            contacts.length > 0
              ? Math.round((newLeads / contacts.length) * 100)
              : 0, // % do total
          messages: estimatedMessages,
          sales: wonDeals.length,
          revenue: totalRevenue,
          responseRate: responseRate,
        });

        // 4. Montar dados do gráfico (Últimos 7 dias)
        const days = getLast7Days(); // ["Seg", "Ter", ...]
        // Inicializar mapa de dados zerado
        const dataMap = days.map((day) => ({ name: day, leads: 0, vendas: 0 }));

        // Preencher Leads
        contacts.forEach((c: any) => {
          const date = new Date(c.createdAt);
          if (date >= startOfLast7Days) {
            const dayName = date.toLocaleDateString("pt-BR", {
              weekday: "short",
            });
            const dayEntry = dataMap.find((d) => d.name === dayName);
            if (dayEntry) dayEntry.leads += 1;
          }
        });

        // Preencher Vendas
        deals.forEach((d: any) => {
          if (d.stageId === "s4") {
            // Apenas vendas fechadas
            const date = new Date(d.createdAt || new Date()); // Fallback se não tiver data
            if (date >= startOfLast7Days) {
              const dayName = date.toLocaleDateString("pt-BR", {
                weekday: "short",
              });
              const dayEntry = dataMap.find((d) => d.name === dayName);
              if (dayEntry) dayEntry.vendas += 1;
            }
          }
        });

        setChartData(dataMap);
      } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Visão geral da sua operação em tempo real.
          </p>
        </div>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition shadow-sm">
          Atualizar Dados
        </button>
      </div>
      '{mensagemDjango && (
        <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
          <strong>Ligação Python:</strong> {mensagemDjango}
        </div>
      )}
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Novos Leads (Mês)"
          value={stats.leads.toString()}
          change={
            stats.leadsChange > 0 ? `+${stats.leadsChange}% do total` : "0%"
          }
          icon={Users}
          trend={stats.leads > 0 ? "up" : "neutral"}
        />
        <StatCard
          title="Msg Estimadas"
          value={stats.messages.toString()}
          change="~ Ativo"
          icon={MessageSquare}
          trend="up"
        />
        <StatCard
          title="Receita (Fechado)"
          value={stats.revenue.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
          change={`${stats.sales} vendas`}
          icon={DollarSign}
          trend={stats.sales > 0 ? "up" : "neutral"}
        />
        <StatCard
          title="Taxa de Resposta"
          value={`${stats.responseRate}%`}
          change="Geral"
          icon={Activity}
          trend={stats.responseRate > 80 ? "up" : "down"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Vendas vs Leads */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm transition-colors">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Performance: Leads x Vendas (7 Dias)
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#9ca3af"
                  strokeOpacity={0.2}
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#9ca3af" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#9ca3af" }}
                />
                <Tooltip
                  cursor={{ fill: "#f3f4f6", opacity: 0.2 }}
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    borderColor: "#374151",
                    color: "#fff",
                  }}
                  itemStyle={{ color: "#e5e7eb" }}
                />
                <Bar
                  name="Leads"
                  dataKey="leads"
                  fill="#e0e7ff"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  name="Vendas"
                  dataKey="vendas"
                  fill="#4f46e5"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Tendência de Leads */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm transition-colors">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Tendência de Novos Contatos
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#9ca3af"
                  strokeOpacity={0.2}
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#9ca3af" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#9ca3af" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    borderColor: "#374151",
                    color: "#fff",
                  }}
                  itemStyle={{ color: "#e5e7eb" }}
                />
                <Line
                  name="Leads"
                  type="monotone"
                  dataKey="leads"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#10b981" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
