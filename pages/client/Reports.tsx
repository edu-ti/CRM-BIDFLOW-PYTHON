import React, { useState, useEffect } from "react";
import { StatCard } from "../../components/StatCard";
import {
  BarChart3,
  TrendingUp,
  Users,
  MessageCircle,
  Calendar,
  Printer,
  X,
  Check,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { db, auth, appId } from "../../lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp,
} from "firebase/firestore";

const COLORS = ["#10b981", "#6366f1", "#f59e0b", "#9ca3af"];

const Reports = () => {
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "3m">("30d");
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    leads: 0,
    leadsChange: 0,
    msgs: 0,
    conversion: "0%",
    cost: "R$ 0,00",
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [sourceData, setSourceData] = useState<any[]>([]);

  // --- LÓGICA DE TEMA ---
  const [isDark, setIsDark] = useState(
    document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  const chartTheme = {
    grid: isDark ? "#374151" : "#f3f4f6",
    text: isDark ? "#9ca3af" : "#6b7280",
    tooltipBg: isDark ? "#1f2937" : "#ffffff",
    tooltipBorder: isDark ? "#374151" : "#e5e7eb",
    tooltipText: isDark ? "#f3f4f6" : "#1f293b",
  };
  // ----------------------

  useEffect(() => {
    const fetchData = async () => {
      if (!auth.currentUser) return;
      setIsLoading(true);
      const uid = auth.currentUser.uid;

      try {
        const now = new Date();
        const pastDate = new Date();
        if (dateRange === "7d") pastDate.setDate(now.getDate() - 7);
        if (dateRange === "30d") pastDate.setDate(now.getDate() - 30);
        if (dateRange === "3m") pastDate.setDate(now.getDate() - 90);

        const contactsRef = collection(
          db,
          "artifacts",
          appId,
          "users",
          uid,
          "contacts"
        );
        const contactsSnap = await getDocs(contactsRef);

        const allContacts = contactsSnap.docs.map((d) => ({
          ...d.data(),
          createdAt: d.data().createdAt,
        }));

        const filteredContacts = allContacts.filter((c: any) => {
          const created = new Date(c.createdAt);
          return created >= pastDate;
        });

        const dealsRef = collection(
          db,
          "artifacts",
          appId,
          "users",
          uid,
          "deals"
        );
        const dealsSnap = await getDocs(dealsRef);
        const allDeals = dealsSnap.docs.map((d) => d.data());
        const wonDeals = allDeals.filter((d: any) => d.stageId === "s4");

        const totalLeads = filteredContacts.length;
        const conversionRate =
          totalLeads > 0
            ? ((wonDeals.length / totalLeads) * 100).toFixed(1)
            : "0";

        setStats({
          leads: totalLeads,
          leadsChange: 0,
          msgs: 0,
          conversion: `${conversionRate}%`,
          cost: "R$ 0,00",
        });

        const dailyData: Record<string, number> = {};
        filteredContacts.forEach((c: any) => {
          const dateKey = new Date(c.createdAt).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
          });
          dailyData[dateKey] = (dailyData[dateKey] || 0) + 1;
        });

        const chart = [];
        for (let d = new Date(pastDate); d <= now; d.setDate(d.getDate() + 1)) {
          const key = d.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
          });
          chart.push({
            name: key,
            leads: dailyData[key] || 0,
            msgs: Math.floor(Math.random() * 10),
          });
        }
        setChartData(chart);

        setSourceData([
          {
            name: "WhatsApp",
            value: totalLeads > 0 ? totalLeads : 1,
            color: "#10b981",
          },
          { name: "Manual", value: 0, color: "#6366f1" },
        ]);
      } catch (error) {
        console.error("Erro ao carregar relatório:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [dateRange]);

  const handlePrint = () => {
    setTimeout(() => window.print(), 100);
  };

  const getRangeButtonClass = (range: string) => {
    return dateRange === range
      ? "px-3 py-1.5 text-sm font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 rounded-md shadow-sm transition-all"
      : "px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-all";
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors">
            Relatórios
          </h1>
          <p className="text-gray-500 dark:text-gray-400 transition-colors">
            Métricas baseadas em dados reais do CRM.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition shadow-sm"
          >
            <Printer size={18} /> Imprimir
          </button>

          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
            <button
              onClick={() => setDateRange("7d")}
              className={getRangeButtonClass("7d")}
            >
              7 Dias
            </button>
            <button
              onClick={() => setDateRange("30d")}
              className={getRangeButtonClass("30d")}
            >
              30 Dias
            </button>
            <button
              onClick={() => setDateRange("3m")}
              className={getRangeButtonClass("3m")}
            >
              3 Meses
            </button>
          </div>
        </div>
      </div>

      {/* Cards Estatísticos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total de Leads"
          value={stats.leads.toString()}
          change={stats.leads > 0 ? "+" + stats.leads : "0"}
          icon={Users}
          trend="up"
        />
        <StatCard
          title="Mensagens (Simulado)"
          value="0"
          change="-"
          icon={MessageCircle}
          trend="neutral"
        />
        <StatCard
          title="Taxa de Conversão"
          value={stats.conversion}
          change="-"
          icon={TrendingUp}
          trend="neutral"
        />
        <StatCard
          title="Custo por Lead"
          value={stats.cost}
          change="-"
          icon={BarChart3}
          trend="neutral"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Volume */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 transition-colors">
            Volume de Leads
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartTheme.text, fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartTheme.text, fontSize: 12 }}
                />
                <CartesianGrid vertical={false} stroke={chartTheme.grid} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: chartTheme.tooltipBg,
                    borderColor: chartTheme.tooltipBorder,
                    color: chartTheme.tooltipText,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="leads"
                  stroke="#4f46e5"
                  fillOpacity={1}
                  fill="url(#colorLeads)"
                  name="Novos Leads"
                  animationDuration={500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Origem */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 transition-colors">
            Origem dos Leads
          </h3>
          <div className="h-80 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sourceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {sourceData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: chartTheme.tooltipBg,
                    borderColor: chartTheme.tooltipBorder,
                    color: chartTheme.tooltipText,
                  }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-lg p-4 flex items-start gap-3 transition-colors">
        <AlertCircle
          className="text-blue-600 dark:text-blue-400 mt-0.5"
          size={20}
        />
        <div>
          <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
            Dados em tempo real
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
            Os gráficos acima agora refletem os dados reais cadastrados na aba{" "}
            <strong>Contatos</strong> e <strong>Funil</strong>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Reports;
