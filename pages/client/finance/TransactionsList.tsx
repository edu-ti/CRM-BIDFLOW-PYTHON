import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../../lib/api';
import { Plus, Check, Clock, Search, Filter } from 'lucide-react';
import TransactionForm from './TransactionForm';

export default function TransactionsList() {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'ALL' | 'IN' | 'OUT'>('ALL');

    // Modal states
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => {
        loadTransactions();
    }, []);

    const loadTransactions = async () => {
        try {
            setLoading(true);
            const data = await apiFetch('/finance/transactions/');
            setTransactions(data);
        } catch (error) {
            console.error("Erro ao carregar transações", error);
        } finally {
            setLoading(false);
        }
    };

    const markAsPaid = async (id: string) => {
        try {
            await apiFetch(`/finance/transactions/${id}/`, {
                method: 'PATCH',
                body: JSON.stringify({ status: 'PAID' })
            });
            loadTransactions(); // Recarrega
        } catch (error) {
            console.error("Erro ao dar baixa", error);
            alert("Falha ao marcar como pago.");
        }
    };

    const handleOpenForm = (id: string | null = null) => {
        setEditingId(id);
        setIsFormOpen(true);
    };

    const filteredData = transactions.filter(t => activeTab === 'ALL' || t.type === activeTab);

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lançamentos Financeiros</h1>
                <button
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                    onClick={() => handleOpenForm()}
                >
                    <Plus size={20} /> Novo Lançamento
                </button>
            </div>

            {isFormOpen && (
                <TransactionForm
                    transactionId={editingId}
                    onClose={() => setIsFormOpen(false)}
                    onSave={loadTransactions}
                />
            )}

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">

                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-gray-700 px-6">
                    <button
                        onClick={() => setActiveTab('ALL')}
                        className={`py-4 px-2 mr-6 text-sm font-medium border-b-2 transition-colors ${activeTab === 'ALL' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        Todos
                    </button>
                    <button
                        onClick={() => setActiveTab('IN')}
                        className={`py-4 px-2 mr-6 text-sm font-medium border-b-2 transition-colors ${activeTab === 'IN' ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        A Receber (Entradas)
                    </button>
                    <button
                        onClick={() => setActiveTab('OUT')}
                        className={`py-4 px-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'OUT' ? 'border-red-600 text-red-600 dark:text-red-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        A Pagar (Saídas)
                    </button>
                </div>

                {/* Tabelas */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700/50 dark:text-gray-300">
                            <tr>
                                <th className="px-6 py-4">Título</th>
                                <th className="px-6 py-4">Categoria</th>
                                <th className="px-6 py-4">Vencimento</th>
                                <th className="px-6 py-4 text-right">Valor</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                        A carregar lançamentos...
                                    </td>
                                </tr>
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                        Nenhum lançamento encontrado.
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((t) => (
                                    <tr key={t.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                            {t.title}
                                            {t.contact_name && <p className="text-xs text-gray-500">De: {t.contact_name}</p>}
                                        </td>
                                        <td className="px-6 py-4">{t.category_name || '-'}</td>
                                        <td className="px-6 py-4 flex items-center gap-1">
                                            <Clock size={14} className="text-gray-400" />
                                            {new Date(t.due_date).toLocaleDateString()}
                                        </td>
                                        <td className={`px-6 py-4 text-right font-bold ${t.type === 'IN' ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {t.type === 'IN' ? '+' : '-'} R$ {parseFloat(t.value).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-3 py-1 text-xs rounded-full font-medium ${t.status === 'PAID' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                                                {t.status === 'PAID' ? 'Pago' : 'Pendente'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {t.status === 'PENDING' && (
                                                <button
                                                    onClick={() => markAsPaid(t.id)}
                                                    className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium"
                                                >
                                                    Dar Baixa
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

            </div>
        </div>
    );
}
