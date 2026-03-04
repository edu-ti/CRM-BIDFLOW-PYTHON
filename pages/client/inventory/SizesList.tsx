import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db, auth, appId } from '../../../lib/firebase';
import { collection, deleteDoc, doc, onSnapshot } from 'firebase/firestore';

interface Size {
    id: string;
    name: string;
    description: string;
}

const SizesList = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sizes, setSizes] = useState<Size[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!auth.currentUser) return;
        const uid = auth.currentUser.uid;

        const unsubscribe = onSnapshot(
            collection(db, "artifacts", appId, "users", uid, "inventory_sizes"),
            (snapshot) => {
                setSizes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Size)));
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    const handleDelete = async (id: string) => {
        if (!auth.currentUser) return;
        if (confirm('Tem certeza que deseja excluir este tamanho?')) {
            await deleteDoc(doc(db, "artifacts", appId, "users", auth.currentUser.uid, "inventory_sizes", id));
        }
    };

    const filteredSizes = sizes.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Tamanhos</h1>
                    <p className="text-gray-500 dark:text-gray-400">Gerencie os tamanhos de produtos</p>
                </div>
                <Link
                    to="/app/inventory/new-size"
                    className="bg-[#6C63FF] hover:bg-[#5a52d5] text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                    <Plus size={20} />
                    Novo Tamanho
                </Link>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
                <div className="mb-6 max-w-md">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar tamanho..."
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
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Nome</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Descrição</th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {loading ? (
                                <tr><td colSpan={3} className="text-center py-4 text-gray-500">Carregando...</td></tr>
                            ) : filteredSizes.length === 0 ? (
                                <tr><td colSpan={3} className="text-center py-4 text-gray-500">Nenhum tamanho encontrado.</td></tr>
                            ) : (
                                filteredSizes.map((s) => (
                                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="py-3 px-4 text-gray-800 dark:text-gray-200 font-medium">{s.name}</td>
                                        <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{s.description}</td>
                                        <td className="py-3 px-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleDelete(s.id)}
                                                    className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400 transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
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
};

export default SizesList;
