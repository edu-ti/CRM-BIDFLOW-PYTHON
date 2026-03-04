import React, { useEffect, useState } from "react";
import { StatCard } from "../../components/StatCard";
import {
  DollarSign,
  Building2,
  Server,
  AlertCircle,
  Clock,
  Loader2,
} from "lucide-react";
import {
  LineChart,
  Line,
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
import { db, appId } from "../../lib/firebase";
import { collection, onSnapshot, query } from "firebase/firestore";

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    mrr: 0,
    activeClients: 0,
    trialClients: 0,
    overdueClients: 0,
    instances: 0,
  });

  const [planDistribution, setPlanDistribution] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);

  // Check dark mode
  useEffect(() => {
    if (typeof document !== "undefined") {
      setIsDark(document.documentElement.classList.contains("dark"));
      const observer = new MutationObserver(() => {
        setIsDark(document.documentElement.classList.contains("dark"));
      });
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });
      return () => observer.disconnect();
    }
  }, []);

  const chartTheme = {
    grid: isDark ? "#374151" : "#e2e8f0",
    text: isDark ? "#9ca3af" : "#64748b",
    tooltipBg: isDark ? "#1f2937" : "#ffffff",
    tooltipBorder: isDark ? "#374151" : "#e2e8f0",
    tooltipText: isDark ? "#f3f4f6" : "#1e293b",
  };

  useEffect(() => {
    try {
      const companiesRef = collection(db, "artifacts", appId, "companies");
      const q = query(companiesRef);

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          try {
            let mrr = 0;
            let active = 0;
            let trial = 0;
            let overdue = 0;
            const plans: Record<string, number> = {
              Starter: 0,
              Pro: 0,
              Enterprise: 0,
            };

            snapshot.forEach((doc) => {
              const data = doc.data();
              if (data.status === "active") active++;
              if (data.status === "trial") trial++;
              if (data.status === "overdue") overdue++;

              let price = 0;
              if (typeof data.mrr === "number") {
                price = data.mrr;
              } else if (typeof data.mrr === "string") {
                const clean = data.mrr.replace(/[^\d,]/g, "").replace(",", ".");
                price = parseFloat(clean) || 0;
              }

              if (data.status === "active") {
                mrr += price;
              }

              const planName = data.plan || "Starter";
              plans[planName] = (plans[planName] || 0) + 1;
            });

            const pieData = Object.keys(plans)
              .map((key) => ({
                name: key,
                value: plans[key],
                color:
                  key === "Enterprise"
                    ? "#10b981"
                    : key === "Pro"
                    ? "#6366f1"
                    : "#94a3b8",
              }))
              .filter((i) => i.value > 0);

            setStats((prev) => ({
              ...prev,
              mrr,
              activeClients: active,
              trialClients: trial,
              overdueClients: overdue,
              instances: active,
            }));

            setPlanDistribution(
              pieData.length > 0
                ? pieData
                : [{ name: "Sem dados", value: 1, color: "#e2e8f0" }]
            );
            setIsLoading(false);
          } catch (err) {
            console.error("Erro de processamento:", err);
            setIsLoading(false);
          }
        },
        (err) => {
          console.error("Erro Firestore:", err);
          setError("Falha na conexão.");
          setIsLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (e) {
      setIsLoading(false);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Dashboard Master
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Visão geral da operação.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="MRR (Receita Mensal)"
          value={stats.mrr.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
          icon={DollarSign}
          trend="up"
          change="Recorrente"
        />
        <StatCard
          title="Clientes Ativos"
          value={stats.activeClients.toString()}
          icon={Building2}
          trend="up"
        />
        <StatCard
          title="Em Trial"
          value={stats.trialClients.toString()}
          icon={Clock}
          trend="neutral"
        />
        <StatCard
          title="Inadimplentes"
          value={stats.overdueClients.toString()}
          icon={AlertCircle}
          trend={stats.overdueClients > 0 ? "down" : "neutral"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6">
            Receita (Simulado)
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={[
                  { name: "Jan", value: stats.mrr * 0.8 },
                  { name: "Fev", value: stats.mrr * 0.9 },
                  { name: "Mar", value: stats.mrr },
                ]}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={chartTheme.grid}
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartTheme.text }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartTheme.text }}
                  tickFormatter={(v) => `R$${v}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: chartTheme.tooltipBg,
                    borderColor: chartTheme.tooltipBorder,
                    color: chartTheme.tooltipText,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#6C63FF"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6">
            Planos
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={planDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {planDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: chartTheme.tooltipBg,
                    borderColor: chartTheme.tooltipBorder,
                    color: chartTheme.tooltipText,
                  }}
                />
                <Legend verticalAlign="bottom" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
