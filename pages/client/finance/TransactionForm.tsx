import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../../lib/api';

export default function TransactionForm({ onClose, onSave, transactionId = null }: { onClose: () => void, onSave: () => void, transactionId?: string | null }) {
    const [formData, setFormData] = useState({
        title: '',
        type: 'OUT',
        value: '',
        due_date: new Date().toISOString().split('T')[0],
        payment_date: '',
        status: 'PENDING',
        bank_account: '',
        category: '',
        contact: '',
        deal: '',
        notes: ''
    });

    const [loading, setLoading] = useState(false);
    const [bankAccounts, setBankAccounts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);

    useEffect(() => {
        loadDependencies();
        if (transactionId) {
            loadTransaction();
        }
    }, [transactionId]);

    const loadDependencies = async () => {
        try {
            const accounts = await apiFetch('/finance/bank-accounts/');
            const cats = await apiFetch('/finance/categories/');
            setBankAccounts(accounts);
            setCategories(cats);

            // Auto-select first account if available
            if (accounts.length > 0 && !formData.bank_account) {
                setFormData(prev => ({ ...prev, bank_account: accounts[0].id }));
            }
        } catch (error) {
            console.error("Erro ao carregar dependências do formulário:", error);
        }
    };

    const loadTransaction = async () => {
        try {
            setLoading(true);
            const data = await apiFetch(`/finance/transactions/${transactionId}/`);
            setFormData({
                title: data.title,
                type: data.type,
                value: data.value,
                due_date: data.due_date,
                payment_date: data.payment_date || '',
                status: data.status,
                bank_account: data.bank_account,
                category: data.category || '',
                contact: data.contact || '',
                deal: data.deal || '',
                notes: data.notes || ''
            });
        } catch (error) {
            console.error("Erro ao carregar transação:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                ...formData,
                category: formData.category || null,
                contact: formData.contact || null,
                deal: formData.deal || null,
                payment_date: formData.status === 'PAID' ? (formData.payment_date || new Date().toISOString().split('T')[0]) : null
            };

            if (transactionId) {
                await apiFetch(`/finance/transactions/${transactionId}/`, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
            } else {
                await apiFetch('/finance/transactions/', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
            }
            onSave(); // Trigger parent refresh
            onClose(); // Close modal
        } catch (error) {
            console.error("Erro ao guardar transação:", error);
            alert("Ocorreu um erro ao guardar. Verifique se criou uma Conta Bancária primeiro.");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                    {transactionId ? "Editar Lançamento" : "Novo Lançamento"}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título *</label>
                            <input
                                type="text"
                                name="title"
                                required
                                value={formData.title}
                                onChange={handleChange}
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-transparent dark:text-white"
                                placeholder="Ex: Compra de Material"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor *</label>
                            <input
                                type="number"
                                name="value"
                                step="0.01"
                                required
                                value={formData.value}
                                onChange={handleChange}
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-transparent dark:text-white"
                                placeholder="0.00"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo *</label>
                            <select
                                name="type"
                                value={formData.type}
                                onChange={handleChange}
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-transparent dark:text-white"
                            >
                                <option value="OUT">Despesa (A Pagar)</option>
                                <option value="IN">Receita (A Receber)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status *</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-transparent dark:text-white"
                            >
                                <option value="PENDING">Pendente</option>
                                <option value="PAID">Pago / Recebido</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Conta Bancária *</label>
                            <select
                                name="bank_account"
                                value={formData.bank_account}
                                onChange={handleChange}
                                required
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-transparent dark:text-white"
                            >
                                <option value="">Selecione uma conta...</option>
                                {bankAccounts.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data de Vencimento *</label>
                            <input
                                type="date"
                                name="due_date"
                                required
                                value={formData.due_date}
                                onChange={handleChange}
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-transparent dark:text-white"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition disabled:opacity-50"
                        >
                            {loading ? "A Guardar..." : "Guardar"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
