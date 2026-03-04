import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Plus, Trash2, Calendar, Search, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, auth, appId } from '../../../lib/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, increment } from 'firebase/firestore';

const NewMovement = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    // Data Sources
    const [products, setProducts] = useState<any[]>([]);
    const [depots, setDepots] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);

    // Form State
    const [header, setHeader] = useState({
        type: 'Entrada',
        date: new Date().toISOString().split('T')[0],
        categoryId: '',
        categoryName: '',
        depotId: '',
        depotName: '',
        document: '',
        entity: '', // Supplier/Recipient
        observation: ''
    });

    // Item Line State
    const [items, setItems] = useState<any[]>([]);
    const [currentItem, setCurrentItem] = useState({
        productId: '',
        quantity: 1,
        unitPrice: 0
    });

    useEffect(() => {
        if (!auth.currentUser) return;
        const fetchData = async () => {
            const uid = auth.currentUser!.uid;
            try {
                const [prodSnap, depotSnap, catSnap] = await Promise.all([
                    getDocs(collection(db, "artifacts", appId, "users", uid, "inventory_products")),
                    getDocs(collection(db, "artifacts", appId, "users", uid, "inventory_depots")),
                    getDocs(collection(db, "artifacts", appId, "users", uid, "inventory_movement_categories"))
                ]);
                setProducts(prodSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                setDepots(depotSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                setCategories(catSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (e) { console.error(e); }
            finally { setInitialLoading(false); }
        };
        fetchData();
    }, []);

    const addItem = () => {
        if (!currentItem.productId || currentItem.quantity <= 0) return;
        const prod = products.find(p => p.id === currentItem.productId);
        if (!prod) return;

        setItems([...items, {
            ...currentItem,
            productName: prod.name,
            total: currentItem.quantity * currentItem.unitPrice
        }]);
        setCurrentItem({ productId: '', quantity: 1, unitPrice: 0 });
    };

    const removeItem = (idx: number) => {
        setItems(items.filter((_, i) => i !== idx));
    };

    const handleProductSelect = (id: string) => {
        const prod = products.find(p => p.id === id);
        if (prod) {
            setCurrentItem({
                ...currentItem,
                productId: id,
                unitPrice: header.type === 'Entrada' ? prod.costPrice : prod.salePrice
            });
        } else {
            setCurrentItem({ ...currentItem, productId: id });
        }
    };

    const handleSave = async () => {
        if (!header.depotId || items.length === 0) { alert("Preencha depósito e adicione itens"); return; }
        if (!auth.currentUser) return;

        setLoading(true);
        try {
            const totalValue = items.reduce((acc, curr) => acc + curr.total, 0);

            // 1. Save Movement Record
            await addDoc(collection(db, "artifacts", appId, "users", auth.currentUser.uid, "inventory_movements"), {
                ...header,
                items,
                totalValue,
                createdAt: new Date().toISOString()
            });

            // 2. Update Stock (Sequential)
            for (const item of items) {
                const prodRef = doc(db, "artifacts", appId, "users", auth.currentUser.uid, "inventory_products", item.productId);
                const change = header.type === 'Entrada' ? item.quantity : -item.quantity;
                await updateDoc(prodRef, {
                    quantity: increment(change)
                });
            }

            navigate(-1);
        } catch (e) {
            console.error(e);
            alert("Erro ao processar movimentação");
        } finally {
            setLoading(false);
        }
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
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Nova Movimentação</h1>
                        <p className="text-gray-500 dark:text-gray-400">Registre uma entrada ou saída</p>
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
                {/* Header Form */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                        <h3 className="font-semibold text-gray-800 dark:text-white mb-4">Dados da Movimentação</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Tipo</label>
                                <select
                                    value={header.type}
                                    onChange={e => setHeader({ ...header, type: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border rounded-lg dark:text-white"
                                >
                                    <option value="Entrada">Entrada</option>
                                    <option value="Saída">Saída</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Data</label>
                                <input type="date" value={header.date} onChange={e => setHeader({ ...header, date: e.target.value })} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border rounded-lg dark:text-white" />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs text-gray-500 mb-1">Depósito</label>
                                <select
                                    value={header.depotId}
                                    onChange={e => {
                                        const depot = depots.find(d => d.id === e.target.value);
                                        setHeader({ ...header, depotId: e.target.value, depotName: depot?.name || '' });
                                    }}
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border rounded-lg dark:text-white"
                                >
                                    <option value="">Selecione...</option>
                                    {depots.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Categoria</label>
                                <select
                                    value={header.categoryId}
                                    onChange={e => {
                                        const cat = categories.find(c => c.id === e.target.value);
                                        setHeader({ ...header, categoryId: e.target.value, categoryName: cat?.name || '' });
                                    }}
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border rounded-lg dark:text-white"
                                >
                                    <option value="">Selecione...</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Nº Documento</label>
                                <input type="text" value={header.document} onChange={e => setHeader({ ...header, document: e.target.value })} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border rounded-lg dark:text-white" />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs text-gray-500 mb-1">{header.type === 'Entrada' ? 'Fornecedor' : 'Destinatário'}</label>
                                <input type="text" value={header.entity} onChange={e => setHeader({ ...header, entity: e.target.value })} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border rounded-lg dark:text-white" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                        <h3 className="font-semibold text-gray-800 dark:text-white mb-4">Itens</h3>

                        {/* Add Item Row */}
                        <div className="flex gap-2 items-end mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <div className="flex-1">
                                <label className="text-xs text-gray-500">Produto</label>
                                <select
                                    value={currentItem.productId}
                                    onChange={e => handleProductSelect(e.target.value)}
                                    className="w-full px-2 py-1.5 text-sm border rounded dark:bg-gray-800 dark:text-white"
                                >
                                    <option value="">Selecione...</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku})</option>)}
                                </select>
                            </div>
                            <div className="w-20">
                                <label className="text-xs text-gray-500">Qtd</label>
                                <input
                                    type="number"
                                    value={currentItem.quantity}
                                    onChange={e => setCurrentItem({ ...currentItem, quantity: parseFloat(e.target.value) })}
                                    className="w-full px-2 py-1.5 text-sm border rounded dark:bg-gray-800 dark:text-white"
                                />
                            </div>
                            <div className="w-24">
                                <label className="text-xs text-gray-500">Un. R$</label>
                                <input
                                    type="number"
                                    value={currentItem.unitPrice}
                                    onChange={e => setCurrentItem({ ...currentItem, unitPrice: parseFloat(e.target.value) })}
                                    className="w-full px-2 py-1.5 text-sm border rounded dark:bg-gray-800 dark:text-white"
                                />
                            </div>
                            <button
                                onClick={addItem}
                                className="px-3 py-1.5 bg-[#6C63FF] text-white rounded hover:bg-[#5a52d5]"
                            >
                                <Plus size={18} />
                            </button>
                        </div>

                        {/* Items Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b dark:border-gray-700 text-left">
                                        <th className="py-2 text-gray-500 font-medium">Produto</th>
                                        <th className="py-2 text-right text-gray-500 font-medium">Qtd</th>
                                        <th className="py-2 text-right text-gray-500 font-medium">Un.</th>
                                        <th className="py-2 text-right text-gray-500 font-medium">Total</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, idx) => (
                                        <tr key={idx} className="border-b dark:border-gray-700">
                                            <td className="py-2 dark:text-white">{item.productName}</td>
                                            <td className="py-2 text-right dark:text-white">{item.quantity}</td>
                                            <td className="py-2 text-right dark:text-white">{item.unitPrice.toFixed(2)}</td>
                                            <td className="py-2 text-right dark:text-white">{item.total.toFixed(2)}</td>
                                            <td className="py-2 text-right">
                                                <button onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Summary Side */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                        <h3 className="font-semibold text-gray-800 dark:text-white mb-4">Resumo</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                <span>Total de Itens</span>
                                <span>{items.reduce((acc, curr) => acc + curr.quantity, 0)}</span>
                            </div>
                            <div className="flex justify-between text-lg font-bold text-gray-800 dark:text-white pt-3 border-t dark:border-gray-700">
                                <span>Valor Total</span>
                                <span>R$ {items.reduce((acc, curr) => acc + curr.total, 0).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewMovement;
