import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter, Eye, ArrowUpRight, ArrowDownLeft, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db, auth, appId } from '../../../lib/firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore'; // Added orderBy

interface Movement {
    id: string;
    type: string;
    date: string;
    categoryName: string; // Stored for easier display
    entity: string;
    totalValue: number;
    depotName: string;
}

const MovementsList = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [movements, setMovements] = useState<Movement[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!auth.currentUser) return;
        const uid = auth.currentUser.uid;
        // Simple query, ordering might need composite index. If it fails, remove orderBy
        // const q = query(collection(db, "artifacts", appId, "users", uid, "inventory_movements"), orderBy('date', 'desc'), limit(50));
        // For safety against missing indexes, just fetching all and sorting client side for this demo
        const unsubscribe = onSnapshot(collection(db, "artifacts", appId, "users", uid, "inventory_movements"), snap => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Movement));
            data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setMovements(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Movimentações</h1>
                    <p className="text-gray-500 dark:text-gray-400">Histórico de entradas e saídas</p>
                </div>
                <div className="flex gap-3">
                    <button className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors">
                        <Filter size={20} />
                        Filtros
                    </button>
                    <Link
                        to="/app/inventory/new-movement"
                        className="bg-[#6C63FF] hover:bg-[#5a52d5] text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                        <Plus size={20} />
                        Nova Movimentação
                    </Link>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
                <div className="mb-6 max-w-md">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por documento, fornecedor..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF] dark:text-white"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-gray-700">
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Tipo</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Data</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Categoria</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Origem/Destino</th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Valor Total</th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {loading && <tr><td colSpan={6} className="text-center py-4">Carregando...</td></tr>}
                            {!loading && movements.length === 0 && <tr><td colSpan={6} className="text-center py-4">Nenhuma movimentação registrada.</td></tr>}
                            {movements.map((m) => (
                                <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="py-3 px-4">
                                        <span className={`px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 w-fit ${m.type === 'Entrada' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                                            }`}>
                                            {m.type === 'Entrada' ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                                            {m.type}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300 text-sm">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} className="text-gray-400" />
                                            {new Date(m.date).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300 text-sm">{m.categoryName || '-'}</td>
                                    <td className="py-3 px-4 text-gray-800 dark:text-gray-200 font-medium">{m.entity || '-'}</td>
                                    <td className="py-3 px-4 text-right text-gray-800 dark:text-gray-200 font-medium">
                                        R$ {Number(m.totalValue || 0).toFixed(2)}
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                        <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 transition-colors">
                                            <Eye size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default MovementsList;
