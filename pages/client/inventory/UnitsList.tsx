import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, X, Save, Loader2 } from 'lucide-react';
import { db, auth, appId } from '../../../lib/firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc, onSnapshot } from 'firebase/firestore';

interface Unit {
    id: string;
    name: string;
    acro: string;
    active: boolean;
}

const UnitsList = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [units, setUnits] = useState<Unit[]>([]);
    const [loading, setLoading] = useState(true);

    // Inline editing/creating state
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<Partial<Unit>>({});

    useEffect(() => {
        if (!auth.currentUser) return;
        const uid = auth.currentUser.uid;

        const unsubscribe = onSnapshot(
            collection(db, "artifacts", appId, "users", uid, "inventory_units"),
            (snapshot) => {
                setUnits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Unit)));
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    const handleSave = async () => {
        if (!auth.currentUser || !editForm.name || !editForm.acro) return;
        setLoading(true);

        try {
            const collectionRef = collection(db, "artifacts", appId, "users", auth.currentUser.uid, "inventory_units");
            if (editForm.id) {
                await updateDoc(doc(collectionRef, editForm.id), editForm);
            } else {
                await addDoc(collectionRef, { ...editForm, active: true });
            }
            setIsEditing(false);
            setEditForm({});
        } catch (error) {
            console.error("Error saving unit", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!auth.currentUser) return;
        if (confirm('Tem certeza que deseja excluir?')) {
            await deleteDoc(doc(db, "artifacts", appId, "users", auth.currentUser.uid, "inventory_units", id));
        }
    };

    const startEdit = (unit?: Unit) => {
        setEditForm(unit || {});
        setIsEditing(true);
    };

    const filteredUnits = units.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.acro.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Unidades de Medida</h1>
                    <p className="text-gray-500 dark:text-gray-400">Gerencie as unidades de medida dos produtos</p>
                </div>
                {!isEditing && (
                    <button
                        onClick={() => startEdit()}
                        className="bg-[#6C63FF] hover:bg-[#5a52d5] text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                        <Plus size={20} />
                        Nova Unidade
                    </button>
                )}
            </div>

            {isEditing && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 mb-4 animate-in fade-in slide-in-from-top-4">
                    <h3 className="font-bold mb-3 text-gray-800 dark:text-white">{editForm.id ? 'Editar Unidade' : 'Nova Unidade'}</h3>
                    <div className="flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="text-xs text-gray-500 dark:text-gray-400">Nome</label>
                            <input
                                value={editForm.name || ''}
                                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF] dark:text-white"
                                placeholder="Ex: Quilograma"
                            />
                        </div>
                        <div className="w-24">
                            <label className="text-xs text-gray-500 dark:text-gray-400">Sigla</label>
                            <input
                                value={editForm.acro || ''}
                                onChange={e => setEditForm({ ...editForm, acro: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF] dark:text-white"
                                placeholder="Ex: KG"
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
                <div className="mb-6 max-w-md">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar unidade..."
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
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Sigla</th>
                                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Status</th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filteredUnits.length === 0 ? (
                                <tr><td colSpan={4} className="text-center py-4 text-gray-500">Nenhuma unidade encontrada.</td></tr>
                            ) : (
                                filteredUnits.map((u) => (
                                    <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="py-3 px-4 text-gray-800 dark:text-gray-200 font-medium">{u.name}</td>
                                        <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{u.acro}</td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.active
                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                }`}>
                                                {u.active ? 'Ativa' : 'Inativa'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => startEdit(u)}
                                                    className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 transition-colors"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(u.id)}
                                                    className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400 transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UnitsList;
