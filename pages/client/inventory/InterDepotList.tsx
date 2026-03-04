import React, { useState, useEffect } from 'react';
import { Search, Plus, ArrowRightLeft, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db, auth, appId } from '../../../lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

interface Transfer {
    id: string;
    date: string;
    sourceDepotName: string;
    destDepotName: string;
    totalItems: number;
    status: string;
}

const InterDepotList = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [transfers, setTransfers] = useState<Transfer[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!auth.currentUser) return;
        const uid = auth.currentUser.uid;
        // Filter specifically for transfers if possible, or filter client side
        const unsubscribe = onSnapshot(collection(db, "artifacts", appId, "users", uid, "inventory_movements"), snap => {
            const data = snap.docs
                .map(d => ({ id: d.id, ...d.data() } as any))
                .filter(d => d.type === 'Transferência')
                .map(d => ({
                    id: d.id,
                    date: d.date,
                    sourceDepotName: d.sourceDepotName,
                    destDepotName: d.destDepotName,
                    totalItems: d.items?.length || 0,
                    status: 'Concluído'
                }));
            setTransfers(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Transferências Entre Depósitos</h1>
                    <p className="text-gray-500 dark:text-gray-400">Gerencie a movimentação de itens entre seus locais de estoque</p>
                </div>
                <Link
                    to="/app/inventory/new-inter-depot"
                    className="bg-[#6C63FF] hover:bg-[#5a52d5] text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                    <Plus size={20} />
                    Nova Transferência
                </Link>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
                <div className="mb-6 max-w-md">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar transferência..."
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
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Data</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Origem</th>
                                <th className="px-4 py-3"></th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Destino</th>
                                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Itens</th>
                                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {loading && <tr><td colSpan={6} className="text-center py-4">Carregando...</td></tr>}
                            {!loading && transfers.length === 0 && <tr><td colSpan={6} className="text-center py-4">Nenhuma transferência registrada.</td></tr>}
                            {transfers.map((t) => (
                                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300 text-sm">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} className="text-gray-400" />
                                            {new Date(t.date).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-gray-800 dark:text-gray-200 font-medium">{t.sourceDepotName}</td>
                                    <td className="py-3 px-4 text-gray-400"><ArrowRightLeft size={16} /></td>
                                    <td className="py-3 px-4 text-gray-800 dark:text-gray-200 font-medium">{t.destDepotName}</td>
                                    <td className="py-3 px-4 text-center text-gray-600 dark:text-gray-300">{t.totalItems}</td>
                                    <td className="py-3 px-4 text-center">
                                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                            {t.status}
                                        </span>
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

export default InterDepotList;
