import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, X, Save, Loader2 } from 'lucide-react';
import { db, auth, appId } from '../../../lib/firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc, onSnapshot } from 'firebase/firestore';

interface Status {
    id: string;
    name: string;
    color: string;
    description: string;
}

const ProductStatus = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statuses, setStatuses] = useState<Status[]>([]);
    const [loading, setLoading] = useState(true);

    // Inline editing
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<Partial<Status>>({});

    useEffect(() => {
        if (!auth.currentUser) return;
        const uid = auth.currentUser.uid;
        const unsubscribe = onSnapshot(
            collection(db, "artifacts", appId, "users", uid, "inventory_product_status"),
            (snapshot) => {
                setStatuses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Status)));
                setLoading(false);
            }
        );
        return () => unsubscribe();
    }, []);

    const handleSave = async () => {
        if (!auth.currentUser || !editForm.name) return;
        setLoading(true);
        try {
            const ref = collection(db, "artifacts", appId, "users", auth.currentUser.uid, "inventory_product_status");
            if (editForm.id) {
                await updateDoc(doc(ref, editForm.id), editForm);
            } else {
                await addDoc(ref, { ...editForm, color: editForm.color || '#808080' });
            }
            setIsEditing(false);
            setEditForm({});
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleDelete = async (id: string) => {
        if (!auth.currentUser) return;
        if (confirm("Apagar status?")) await deleteDoc(doc(db, "artifacts", appId, "users", auth.currentUser.uid, "inventory_product_status", id));
    };


    const startEdit = (status?: Status) => {
        setEditForm(status || { color: '#000000' });
        setIsEditing(true);
    };

    const filtered = statuses.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Status de Produtos</h1>
                    <p className="text-gray-500 dark:text-gray-400">Defina os possíveis status para seus produtos</p>
                </div>
                {!isEditing && (
                    <button
                        onClick={() => startEdit()}
                        className="bg-[#6C63FF] hover:bg-[#5a52d5] text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                        <Plus size={20} />
                        Novo Status
                    </button>
                )}
            </div>

            {isEditing && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 mb-4 animate-in fade-in slide-in-from-top-4">
                    <h3 className="font-bold mb-3 text-gray-800 dark:text-white">{editForm.id ? 'Editar Status' : 'Novo Status'}</h3>
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full">
                            <label className="text-xs text-gray-500 dark:text-gray-400">Nome</label>
                            <input
                                value={editForm.name || ''}
                                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF] dark:text-white"
                                placeholder="Ex: Ativo, Em Falta"
                            />
                        </div>
                        <div className="w-full md:w-32">
                            <label className="text-xs text-gray-500 dark:text-gray-400">Cor</label>
                            <input
                                type="color"
                                value={editForm.color || '#000000'}
                                onChange={e => setEditForm({ ...editForm, color: e.target.value })}
                                className="w-full h-10 p-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer"
                            />
                        </div>
                        <div className="flex-1 w-full">
                            <label className="text-xs text-gray-500 dark:text-gray-400">Descrição</label>
                            <input
                                value={editForm.description || ''}
                                onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF] dark:text-white"
                                placeholder="Breve descrição"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setIsEditing(false)} className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg text-gray-600 dark:text-gray-300">
                                <X size={20} />
                            </button>
                            <button onClick={handleSave} className="p-2 bg-[#6C63FF] hover:bg-[#5a52d5] text-white rounded-lg">
                                <Save size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            )}


            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
                {/* Same search and table structure */}
                <div className="mb-6 max-w-md">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar status..."
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
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Status</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Descrição</th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filtered.map((s) => (
                                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="py-3 px-4">
                                        <span
                                            className="px-2 py-1 rounded-full text-xs font-medium bg-opacity-20 flex items-center gap-2 w-fit"
                                            style={{ backgroundColor: s.color + '20', color: s.color }}
                                        >
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                                            {s.name}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300 text-sm">{s.description}</td>
                                    <td className="py-3 px-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => startEdit(s)} className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 transition-colors">
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(s.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
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

export default ProductStatus;
