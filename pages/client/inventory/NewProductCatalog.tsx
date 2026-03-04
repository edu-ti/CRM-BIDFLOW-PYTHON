import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, auth, appId } from '../../../lib/firebase';
import { collection, addDoc, onSnapshot } from 'firebase/firestore';

interface PriceTable {
    id: string;
    name: string;
}

const NewProductCatalog = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [priceTables, setPriceTables] = useState<PriceTable[]>([]);
    const [formData, setFormData] = useState({
        name: '',
        priceTable: '',
        hidePrice: false,
        active: true
    });

    useEffect(() => {
        if (!auth.currentUser) return;
        const unsubscribe = onSnapshot(collection(db, "artifacts", appId, "users", auth.currentUser.uid, "inventory_price_tables"), snap => {
            setPriceTables(snap.docs.map(d => ({ id: d.id, ...d.data() } as PriceTable)));
        });
        return () => unsubscribe();
    }, []);

    const handleSave = async () => {
        if (!formData.name) { alert("Nome obrigatório"); return; }
        if (!auth.currentUser) return;
        setLoading(true);
        try {
            await addDoc(collection(db, "artifacts", appId, "users", auth.currentUser.uid, "inventory_catalogs"), formData);
            navigate(-1);
        } catch (e) { console.error(e); alert("Erro salvar"); }
        finally { setLoading(false); }
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Novo Catálogo</h1>
                        <p className="text-gray-500 dark:text-gray-400">Configure um novo catálogo de produtos</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="px-4 py-2 bg-[#6C63FF] hover:bg-[#5a52d5] text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                        {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                        Salvar
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome do Catálogo *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF] dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tabela de Preço</label>
                        <select
                            value={formData.priceTable}
                            onChange={e => setFormData({ ...formData, priceTable: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF] dark:text-white"
                        >
                            <option value="">Selecione...</option>
                            {priceTables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filtrar por Categoria</label>
                        <select className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF] dark:text-white">
                            <option value="">Todas</option>
                        </select>
                    </div>

                    <div className="md:col-span-2 space-y-3 mt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                className="rounded border-gray-300 text-[#6C63FF] focus:ring-[#6C63FF]"
                                checked={formData.hidePrice}
                                onChange={e => setFormData({ ...formData, hidePrice: e.target.checked })}
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Ocultar preços dos produtos</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" className="rounded border-gray-300 text-[#6C63FF] focus:ring-[#6C63FF]" defaultChecked />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Apenas produtos com estoque</span>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewProductCatalog;
