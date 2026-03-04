import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Plus, Trash2, Loader2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, auth, appId } from '../../../lib/firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';

const NewInterDepot = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    const [depots, setDepots] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        sourceDepotId: '',
        sourceDepotName: '',
        destDepotId: '',
        destDepotName: '',
        observation: ''
    });

    const [items, setItems] = useState<any[]>([]);
    const [currentItem, setCurrentItem] = useState({
        productId: '',
        productName: '',
        quantity: 1
    });

    useEffect(() => {
        if (!auth.currentUser) return;
        const fetchData = async () => {
            try {
                const [depotSnap, prodSnap] = await Promise.all([
                    getDocs(collection(db, "artifacts", appId, "users", auth.currentUser!.uid, "inventory_depots")),
                    getDocs(collection(db, "artifacts", appId, "users", auth.currentUser!.uid, "inventory_products"))
                ]);
                setDepots(depotSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                setProducts(prodSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (e) { console.error(e); }
            finally { setInitialLoading(false); }
        };
        fetchData();
    }, []);

    const addItem = () => {
        if (!currentItem.productId || currentItem.quantity <= 0) return;
        setItems([...items, currentItem]);
        setCurrentItem({ productId: '', productName: '', quantity: 1 });
    };

    const handleSave = async () => {
        if (!formData.sourceDepotId || !formData.destDepotId || items.length === 0) {
            alert("Preencha os depósitos e adicione itens."); return;
        }
        if (formData.sourceDepotId === formData.destDepotId) {
            alert("Os depósitos de origem e destino devem ser diferentes."); return;
        }

        setLoading(true);
        try {
            await addDoc(collection(db, "artifacts", appId, "users", auth.currentUser!.uid, "inventory_movements"), {
                type: 'Transferência',
                items,
                ...formData,
                createdAt: new Date().toISOString()
            });
            // Note: Stock update skipped for InterDepot as stock is currently global/flat in this version of Product schema.
            navigate(-1);
        } catch (e) {
            console.error(e); alert("Erro ao salvar");
        } finally { setLoading(false); }
    };

    if (initialLoading) return <div className="p-6 text-center">Carregando...</div>;

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300">
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Nova Transferência</h1>
                        <p className="text-gray-500 dark:text-gray-400">Mover itens entre depósitos</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => navigate(-1)} className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancelar</button>
                    <button onClick={handleSave} disabled={loading} className="px-4 py-2 bg-[#6C63FF] hover:bg-[#5a52d5] text-white rounded-lg flex items-center gap-2">
                        {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                        Salvar
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Depots Selection */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Origem</label>
                                <select
                                    value={formData.sourceDepotId}
                                    onChange={e => {
                                        const d = depots.find(x => x.id === e.target.value);
                                        setFormData({ ...formData, sourceDepotId: e.target.value, sourceDepotName: d?.name || '' });
                                    }}
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border rounded-lg dark:text-white"
                                >
                                    <option value="">Selecione...</option>
                                    {depots.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>
                            <div className="pt-6 text-gray-400">
                                <ArrowRight size={24} />
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Destino</label>
                                <select
                                    value={formData.destDepotId}
                                    onChange={e => {
                                        const d = depots.find(x => x.id === e.target.value);
                                        setFormData({ ...formData, destDepotId: e.target.value, destDepotName: d?.name || '' });
                                    }}
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border rounded-lg dark:text-white"
                                >
                                    <option value="">Selecione...</option>
                                    {depots.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data</label>
                            <input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border rounded-lg dark:text-white" />
                        </div>
                    </div>

                    {/* Items */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                        <h3 className="font-semibold text-gray-800 dark:text-white mb-4">Itens da Transferência</h3>
                        <div className="flex gap-2 items-end mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <div className="flex-1">
                                <label className="text-xs text-gray-500">Produto</label>
                                <select
                                    value={currentItem.productId}
                                    onChange={e => {
                                        const p = products.find(x => x.id === e.target.value);
                                        setCurrentItem({ ...currentItem, productId: e.target.value, productName: p?.name || '' });
                                    }}
                                    className="w-full px-2 py-1.5 text-sm border rounded dark:bg-gray-800 dark:text-white"
                                >
                                    <option value="">Selecione...</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div className="w-24">
                                <label className="text-xs text-gray-500">Qtd</label>
                                <input type="number" value={currentItem.quantity} onChange={e => setCurrentItem({ ...currentItem, quantity: parseFloat(e.target.value) })} className="w-full px-2 py-1.5 text-sm border rounded dark:bg-gray-800 dark:text-white" />
                            </div>
                            <button onClick={addItem} className="px-3 py-1.5 bg-[#6C63FF] text-white rounded hover:bg-[#5a52d5]"><Plus size={18} /></button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b dark:border-gray-700 text-left">
                                        <th className="py-2 text-gray-500">Produto</th>
                                        <th className="py-2 text-right text-gray-500">Qtd</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, idx) => (
                                        <tr key={idx} className="border-b dark:border-gray-700">
                                            <td className="py-2 dark:text-white">{item.productName}</td>
                                            <td className="py-2 text-right dark:text-white">{item.quantity}</td>
                                            <td className="py-2 text-right">
                                                <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewInterDepot;
