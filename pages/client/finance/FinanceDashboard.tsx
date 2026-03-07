import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../../lib/api';
import { DollarSign, TrendingUp, TrendingDown, Wallet, Loader2, AlertCircle } from 'lucide-react';
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
    Legend
} from "recharts";

const COLORS = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6"];

export default function FinanceDashboard() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        pastDueIn: 0,
        pastDueOut: 0,
        balanceCurrent: 0, // Mock for now or derived
    });
    const [cashflowData, setCashflowData] = useState<any[]>([]);
    const [expensesData, setExpensesData] = useState<any[]>([]);

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        try {
            setLoading(true);
            const data = await apiFetch('/reports/analytics/finance/');

            setStats({
                pastDueIn: data.past_due_in,
                pastDueOut: data.past_due_out,
                balanceCurrent: 0 // Mock, would need account balance API
            });

            // Map Cashflow format
            // data.cashflow_6m = [{month: "2023-10", income: 1000, expense: 500}]
            const mappedCashflow = data.cashflow_6m.map((c: any) => {
                const [yyyy, mm] = c.month.split("-");
                const d = new Date(parseInt(yyyy), parseInt(mm) - 1, 1);
                return {
                    name: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
                    Receitas: c.income,
                    Despesas: c.expense
                };
            });
            setCashflowData(mappedCashflow);

            // Map Expenses Format
            const mappedExpenses = data.top_expenses.map((e: any) => ({
                name: e.category,
                value: e.total
            }));
            setExpensesData(mappedExpenses);

        } catch (error) {
            console.error("Erro ao carregar dashboard financeiro", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Wallet className="h-6 w-6 text-indigo-600" />
                        Dashboard Financeiro
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Visão analítica de fluxo de caixa e despesas.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between group">
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">Vencido a Receber <AlertCircle size={14} className="text-amber-500" /></p>
                        <p className="text-2xl font-bold text-emerald-600">R$ {stats.pastDueIn.toFixed(2)}</p>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-900/30 p-4 rounded-xl group-hover:scale-110 transition-transform">
                        <TrendingUp size={24} className="text-emerald-500" />
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between group">
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">Vencido a Pagar <AlertCircle size={14} className="text-red-500" /></p>
                        <p className="text-2xl font-bold text-red-600">R$ {stats.pastDueOut.toFixed(2)}</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-xl group-hover:scale-110 transition-transform">
                        <TrendingDown size={24} className="text-red-500" />
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between group">
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Saldo Histórico</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">Em breve</p>
                    </div>
                    <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-xl group-hover:scale-110 transition-transform">
                        <DollarSign size={24} className="text-indigo-500" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Cashflow Line Chart */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm col-span-1 lg:col-span-2">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Fluxo de Caixa (6 Meses)</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={cashflowData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#9ca3af" strokeOpacity={0.2} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af" }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af" }} />
                                <Tooltip
                                    formatter={(value: number) => [`R$ ${value.toFixed(2)}`, undefined]}
                                    contentStyle={{ backgroundColor: "#1f2937", borderColor: "#374151", color: "#fff" }}
                                    itemStyle={{ color: "#e5e7eb" }}
                                />
                                <Legend />
                                <Line type="monotone" dataKey="Receitas" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                <Line type="monotone" dataKey="Despesas" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Expenses Pie Chart */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Top 5 Despesas (Categorias)</h3>
                    {expensesData.length > 0 ? (
                        <div className="h-80 flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={expensesData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {expensesData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value: number) => [`R$ ${value.toFixed(2)}`, undefined]}
                                        contentStyle={{ backgroundColor: "#1f2937", borderColor: "#374151", color: "#fff" }}
                                    />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-80 flex items-center justify-center text-gray-500">
                            Sem despesas pagas para exibir.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

