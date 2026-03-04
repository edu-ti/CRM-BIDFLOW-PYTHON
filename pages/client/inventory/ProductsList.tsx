import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter, Eye, Edit2, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db, auth, appId } from '../../../lib/firebase';
import { collection, deleteDoc, doc, onSnapshot } from 'firebase/firestore';

interface Product {
    id: string;
    name: string;
    sku: string;
    quantity: number; // Legacy/Total
    onHandQty?: number; // Physical
    reservedQty?: number; // Reserved
    costPrice: number;
    salePrice: number;
    status: string;
}

const ProductsList = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!auth.currentUser) return;
        const uid = auth.currentUser.uid;
        const unsubscribe = onSnapshot(collection(db, "artifacts", appId, "users", uid, "inventory_products"), snap => {
            setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleDelete = async (id: string) => {
        if (!auth.currentUser) return;
        if (confirm("Excluir produto?")) await deleteDoc(doc(db, "artifacts", appId, "users", auth.currentUser.uid, "inventory_products", id));
    };


    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Produtos</h1>
                    <p className="text-gray-500 dark:text-gray-400">Gerencie seu catálogo de produtos</p>
                </div>
                <div className="flex gap-3">
                    <button className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors">
                        <Filter size={20} />
                        Filtros
                    </button>
                    <Link
                        to="/app/inventory/new-product"
                        className="bg-[#6C63FF] hover:bg-[#5a52d5] text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                        <Plus size={20} />
                        Novo Produto
                    </Link>
                    {/* Dev Helper for Simulator */}
                    <Link
                        to="/app/inventory/orders-simulator"
                        className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                        Simulador de Pedidos
                    </Link>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
                <div className="mb-6 max-w-md">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por nome, SKU, código..."
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
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Produto</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">SKU</th>
                                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Físico</th>
                                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Reservado</th>
                                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Disponível</th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Venda</th>
                                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Status</th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {loading && <tr><td colSpan={8} className="text-center py-4">Carregando...</td></tr>}
                            {!loading && products.length === 0 && <tr><td colSpan={8} className="text-center py-4">Nenhum produto cadastrado.</td></tr>}
                            {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku?.includes(searchTerm)).map((p) => {
                                // Calculate derived values for display if they are missing
                                const onHand = p.onHandQty ?? p.quantity ?? 0;
                                const reserved = p.reservedQty ?? 0;
                                const available = onHand - reserved;

                                return (
                                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="py-3 px-4 text-gray-800 dark:text-gray-200 font-medium">{p.name}</td>
                                        <td className="py-3 px-4 text-gray-600 dark:text-gray-300 text-sm font-mono">{p.sku}</td>

                                        {/* Stock Columns */}
                                        <td className="py-3 px-4 text-center font-medium dark:text-gray-200">{onHand}</td>
                                        <td className="py-3 px-4 text-center text-orange-600 font-medium">{reserved > 0 ? reserved : '-'}</td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`px-2 py-1 rounded-md text-xs font-bold ${available > 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                }`}>
                                                {available}
                                            </span>
                                        </td>

                                        <td className="py-3 px-4 text-right text-gray-800 dark:text-gray-200 font-medium">R$ {Number(p.salePrice || 0).toFixed(2)}</td>
                                        <td className="py-3 px-4 text-center">
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                                                {p.status || '-'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 transition-colors">
                                                    <Eye size={16} />
                                                </button>
                                                <button className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 transition-colors">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(p.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400 transition-colors">
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

export default ProductsList;
