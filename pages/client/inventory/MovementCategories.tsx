import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, X, Save } from 'lucide-react';
import { db, auth, appId } from '../../../lib/firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc, onSnapshot } from 'firebase/firestore';

interface Category {
    id: string;
    name: string;
    type: 'Entrada' | 'Saída' | 'Ambos';
}

const MovementCategories = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    // Inline edit
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<Partial<Category>>({});

    useEffect(() => {
        if (!auth.currentUser) return;
        const uid = auth.currentUser.uid;
        const unsubscribe = onSnapshot(collection(db, "artifacts", appId, "users", uid, "inventory_movement_categories"), snap => {
            setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() } as Category)));
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleSave = async () => {
        if (!auth.currentUser || !editForm.name) return;
        try {
            const ref = collection(db, "artifacts", appId, "users", auth.currentUser.uid, "inventory_movement_categories");
            if (editForm.id) await updateDoc(doc(ref, editForm.id), editForm);
            else await addDoc(ref, { ...editForm, type: editForm.type || 'Ambos' });
            setIsEditing(false); setEditForm({});
        } catch (e) { console.error(e); }
    };

    const handleDelete = async (id: string) => {
        if (!auth.currentUser) return;
        if (confirm("Excluir?")) await deleteDoc(doc(db, "artifacts", appId, "users", auth.currentUser.uid, "inventory_movement_categories", id));
    };


    const filtered = categories.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Categorias de Movimentação</h1>
                    <p className="text-gray-500 dark:text-gray-400">Classifique as entradas e saídas de estoque</p>
                </div>
                {!isEditing && (
                    <button
                        onClick={() => { setEditForm({ type: 'Ambos' }); setIsEditing(true); }}
                        className="bg-[#6C63FF] hover:bg-[#5a52d5] text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                        <Plus size={20} />
                        Nova Categoria
                    </button>
                )}
            </div>

            {isEditing && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 mb-4 animate-in fade-in slide-in-from-top-4">
                    <h3 className="font-bold mb-3 text-gray-800 dark:text-white">{editForm.id ? 'Editar Categoria' : 'Nova Categoria'}</h3>
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full">
                            <label className="text-xs text-gray-500 dark:text-gray-400">Nome da Categoria</label>
                            <input
                                value={editForm.name || ''}
                                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF] dark:text-white"
                            />
                        </div>
                        <div className="w-full md:w-48">
                            <label className="text-xs text-gray-500 dark:text-gray-400">Tipo da Movimentação</label>
                            <select
                                value={editForm.type}
                                onChange={e => setEditForm({ ...editForm, type: e.target.value as any })}
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF] dark:text-white"
                            >
                                <option value="Ambos">Ambos</option>
                                <option value="Entrada">Entrada</option>
                                <option value="Saída">Saída</option>
                            </select>
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
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Nome</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Tipo</th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filtered.map((c) => (
                                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="py-3 px-4 text-gray-800 dark:text-gray-200 font-medium">{c.name}</td>
                                    <td className="py-3 px-4">
                                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${c.type === 'Entrada' ? 'bg-green-50 text-green-600' :
                                                c.type === 'Saída' ? 'bg-red-50 text-red-600' :
                                                    'bg-blue-50 text-blue-600'
                                            }`}>
                                            {c.type}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => { setEditForm(c); setIsEditing(true); }} className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 transition-colors">
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(c.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400 transition-colors">
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

export default MovementCategories;
