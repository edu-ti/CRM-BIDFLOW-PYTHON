import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, FolderTree, Folder } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db, auth, appId } from '../../../lib/firebase';
import { collection, deleteDoc, doc, onSnapshot } from 'firebase/firestore';

interface Category {
    id: string;
    name: string;
    code: string;
    parent: string;
}

const ProductCategories = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!auth.currentUser) return;
        const uid = auth.currentUser.uid;
        const unsubscribe = onSnapshot(collection(db, "artifacts", appId, "users", uid, "inventory_product_categories"), snap => {
            setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() } as Category)));
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleDelete = async (id: string) => {
        if (!auth.currentUser) return;
        if (confirm("Excluir?")) await deleteDoc(doc(db, "artifacts", appId, "users", auth.currentUser.uid, "inventory_product_categories", id));
    };


    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Categorias de Produtos</h1>
                    <p className="text-gray-500 dark:text-gray-400">Organize seus produtos em departamentos e seções</p>
                </div>
                <div className="flex gap-3">
                    <Link
                        to="/app/inventory/new-product-category"
                        className="bg-[#6C63FF] hover:bg-[#5a52d5] text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                        <Plus size={20} />
                        Nova Categoria
                    </Link>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
                <div className="mb-6 max-w-md">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar categoria..."
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
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Código</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Nome</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Categoria Pai</th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {loading && <tr><td colSpan={4} className="text-center py-4">Carregando...</td></tr>}
                            {!loading && categories.length === 0 && <tr><td colSpan={4} className="text-center py-4">Nenhuma categoria encontrada.</td></tr>}
                            {categories.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map((c) => {
                                const parentName = categories.find(p => p.id === c.parent)?.name || '-';
                                return (
                                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="py-3 px-4 text-gray-600 dark:text-gray-300 font-mono text-sm">{c.code}</td>
                                        <td className="py-3 px-4 text-gray-800 dark:text-gray-200 font-medium flex items-center gap-2">
                                            <Folder size={16} className="text-[#6C63FF]" />
                                            {c.name}
                                        </td>
                                        <td className="py-3 px-4 text-gray-500 dark:text-gray-400 text-sm">{parentName}</td>
                                        <td className="py-3 px-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 transition-colors">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(c.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400 transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ProductCategories;
