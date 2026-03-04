import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Upload, Plus, X, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, auth, appId } from '../../../lib/firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';

const NewProduct = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('dados');
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    // Dependency Data
    const [brands, setBrands] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [statuses, setStatuses] = useState<any[]>([]);
    const [units, setUnits] = useState<any[]>([]);
    const [sizes, setSizes] = useState<any[]>([]);
    const [labels, setLabels] = useState<any[]>([]);

    // Form Data
    const [formData, setFormData] = useState({
        // Dados Gerais
        name: '',
        sku: '',
        barcode: '',
        brandId: '',
        categoryId: '',
        statusId: '',
        unitId: '',
        sizeId: '',
        description: '',

        // Stock & Price
        costPrice: 0,
        markup: 0,
        salePrice: 0,
        minStock: 0,
        maxStock: 0,
        quantity: 0, // Initial stock

        // Details
        weight: '',
        dimensions: '',
        labelIds: [] as string[],

        // Fiscal (Simplified)
        ncm: '',
        cest: '',
        origin: '0',
    });

    useEffect(() => {
        if (!auth.currentUser) return;
        const uid = auth.currentUser.uid;

        const fetchData = async () => {
            try {
                const [brandsSnap, catsSnap, statsSnap, unitsSnap, sizesSnap, labelsSnap] = await Promise.all([
                    getDocs(collection(db, "artifacts", appId, "users", uid, "inventory_brands")),
                    getDocs(collection(db, "artifacts", appId, "users", uid, "inventory_product_categories")),
                    getDocs(collection(db, "artifacts", appId, "users", uid, "inventory_product_status")),
                    getDocs(collection(db, "artifacts", appId, "users", uid, "inventory_units")),
                    getDocs(collection(db, "artifacts", appId, "users", uid, "inventory_sizes")),
                    getDocs(collection(db, "artifacts", appId, "users", uid, "inventory_labels")),
                ]);

                setBrands(brandsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                setCategories(catsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                setStatuses(statsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                setUnits(unitsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                setSizes(sizesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                setLabels(labelsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

            } catch (error) {
                console.error("Error fetching dependencies:", error);
            } finally {
                setInitialLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const calculatePrice = (cost: number, markup: number) => {
        const sale = cost * (1 + markup / 100);
        handleChange('salePrice', parseFloat(sale.toFixed(2)));
    };

    const handleSave = async () => {
        if (!formData.name) { alert("Nome é obrigatório"); return; }
        if (!auth.currentUser) return;
        setLoading(true);

        try {
            // Enforce status name saving for easier list display
            const statusObj = statuses.find(s => s.id === formData.statusId);
            const productData = {
                ...formData,
                onHandQty: formData.quantity,
                reservedQty: 0,
                quantity: formData.quantity, // Legacy
                status: statusObj ? statusObj.name : 'Indefinido',
                createdAt: new Date().toISOString()
            };

            await addDoc(collection(db, "artifacts", appId, "users", auth.currentUser.uid, "inventory_products"), productData);
            navigate(-1);
        } catch (e) {
            console.error(e);
            alert("Erro ao salvar produto");
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) return <div className="p-6 flex justify-center"><Loader2 className="animate-spin text-gray-500" /></div>;

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
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Novo Produto</h1>
                        <p className="text-gray-500 dark:text-gray-400">Cadastre um novo produto ao estoque</p>
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
                        className="px-4 py-2 bg-[#6C63FF] hover:bg-[#5a52d5] text-white rounded-lg flex items-center gap-2 transition-colors"
                    >
                        {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                        Salvar
                    </button>
                </div>
            </div>

            <div className="flex gap-6">
                {/* Main Content */}
                <div className="flex-1 space-y-6">
                    {/* Tabs */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="flex border-b border-gray-100 dark:border-gray-700">
                            {['Dados', 'Fiscal', 'Composição', 'Qualidade'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab.toLowerCase())}
                                    className={`px-6 py-4 text-sm font-medium transition-colors ${activeTab === tab.toLowerCase()
                                        ? 'text-[#6C63FF] border-b-2 border-[#6C63FF] bg-gray-50 dark:bg-gray-700/50'
                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        <div className="p-6">
                            {activeTab === 'dados' && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome do Produto *</label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={e => handleChange('name', e.target.value)}
                                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF] dark:text-white"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SKU</label>
                                            <input type="text" value={formData.sku} onChange={e => handleChange('sku', e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF] dark:text-white" />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Código de Barras (EAN)</label>
                                            <input type="text" value={formData.barcode} onChange={e => handleChange('barcode', e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF] dark:text-white" />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Marca</label>
                                            <select value={formData.brandId} onChange={e => handleChange('brandId', e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF] dark:text-white">
                                                <option value="">Selecione...</option>
                                                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoria</label>
                                            <select value={formData.categoryId} onChange={e => handleChange('categoryId', e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF] dark:text-white">
                                                <option value="">Selecione...</option>
                                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unidade</label>
                                            <select value={formData.unitId} onChange={e => handleChange('unitId', e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF] dark:text-white">
                                                <option value="">Selecione...</option>
                                                {units.map(u => <option key={u.id} value={u.id}>{u.acro} - {u.name}</option>)}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tamanho</label>
                                            <select value={formData.sizeId} onChange={e => handleChange('sizeId', e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF] dark:text-white">
                                                <option value="">Selecione...</option>
                                                {sizes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="border-t border-gray-100 dark:border-gray-700 pt-6">
                                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Preços e Estoque</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Preço de Custo</label>
                                                <input
                                                    type="number"
                                                    value={formData.costPrice}
                                                    onChange={e => {
                                                        const val = parseFloat(e.target.value);
                                                        handleChange('costPrice', val);
                                                        calculatePrice(val, formData.markup);
                                                    }}
                                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF] dark:text-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Markup (%)</label>
                                                <input
                                                    type="number"
                                                    value={formData.markup}
                                                    onChange={e => {
                                                        const val = parseFloat(e.target.value);
                                                        handleChange('markup', val);
                                                        calculatePrice(formData.costPrice, val);
                                                    }}
                                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF] dark:text-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Preço de Venda</label>
                                                <input type="number" value={formData.salePrice} readOnly className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-500 cursor-not-allowed" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estoque Inicial</label>
                                                <input type="number" value={formData.quantity} onChange={e => handleChange('quantity', parseFloat(e.target.value))} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF] dark:text-white" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {/* Other tabs intentionally left simplified/placeholder for brevity as per "real data" focus on core fields first */}
                            {activeTab !== 'dados' && (
                                <div className="text-center py-10 text-gray-500">
                                    Conteúdo da aba {activeTab} (Implementação futura)
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="w-80 space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                        <h3 className="font-semibold text-gray-800 dark:text-white mb-4">Imagem do Produto</h3>
                        <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl h-48 flex flex-col items-center justify-center text-gray-400 hover:border-[#6C63FF] hover:text-[#6C63FF] transition-colors cursor-pointer bg-gray-50 dark:bg-gray-900">
                            <Upload size={32} className="mb-2" />
                            <span className="text-sm">Upload de imagem</span>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                        <h3 className="font-semibold text-gray-800 dark:text-white mb-4">Status</h3>
                        <div className="space-y-4">
                            <select value={formData.statusId} onChange={e => handleChange('statusId', e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF] dark:text-white">
                                <option value="">Selecione Status...</option>
                                {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>

                            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Etiquetas</label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {/* Simplified Label Selection */}
                                    {labels.map(l => (
                                        <button
                                            key={l.id}
                                            onClick={() => {
                                                const newLabels = formData.labelIds.includes(l.id)
                                                    ? formData.labelIds.filter(id => id !== l.id)
                                                    : [...formData.labelIds, l.id];
                                                handleChange('labelIds', newLabels);
                                            }}
                                            className={`px-2 py-1 rounded text-xs border ${formData.labelIds.includes(l.id) ? 'border-[#6C63FF] bg-[#6C63FF]/10 text-[#6C63FF]' : 'border-gray-200 text-gray-500'}`}
                                        >
                                            {l.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewProduct;
