import React, { useState, useEffect, useRef } from "react";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  ChevronDown,
  X,
  Upload,
  Loader2,
  Package,
  ImageIcon,
  Filter,
} from "lucide-react";
import { db, auth, appId } from "../../lib/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import ConfirmModal, { ConfirmModalType } from "../../components/ConfirmModal";

interface Product {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  description: string;
  price: number;
  unit: string;
  image?: string; // URL ou Base64
  createdAt: string;
}

const Catalog = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedManufacturer, setSelectedManufacturer] = useState("Todos");
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);

  // Estado para controlar erros de carregamento de imagem por produto
  const [imageLoadErrors, setImageLoadErrors] = useState<
    Record<string, boolean>
  >({});

  // Modal e Formulário
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({
    name: "",
    manufacturer: "",
    model: "",
    description: "",
    price: 0,
    unit: "Unidade",
    image: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Confirmação
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    type: ConfirmModalType;
    onConfirm?: () => void;
    confirmText?: string;
    showCancel?: boolean;
  }>({
    title: "",
    message: "",
    type: "info",
  });

  // 1. Carregar Produtos do Firestore
  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(
        db,
        "artifacts",
        appId,
        "users",
        auth.currentUser.uid,
        "products"
      ),
      orderBy("name")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedProducts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Product[];
      setProducts(fetchedProducts);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Lógica de Filtros e Busca
  const manufacturers = Array.from(
    new Set(products.map((p) => p.manufacturer).filter(Boolean))
  ).sort();

  const filteredProducts = products.filter((p) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(searchLower) ||
      p.model.toLowerCase().includes(searchLower) ||
      p.manufacturer.toLowerCase().includes(searchLower);

    const matchesManufacturer =
      selectedManufacturer === "Todos" ||
      p.manufacturer === selectedManufacturer;

    return matchesSearch && matchesManufacturer;
  });

  // 3. Handlers do Formulário
  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingId(product.id);
      setFormData({ ...product });
    } else {
      setEditingId(null);
      setFormData({
        name: "",
        manufacturer: "",
        model: "",
        description: "",
        price: 0,
        unit: "Unidade",
        image: "",
      });
    }
    setIsModalOpen(true);
  };

  // Função auxiliar para converter arquivo em Base64
  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        // Converte para Base64 para persistir corretamente no Firestore (para uso leve)
        const base64 = await convertToBase64(file);
        setFormData((prev) => ({ ...prev, image: base64 }));
      } catch (error) {
        console.error("Erro ao converter imagem:", error);
      }
    }
  };

  const handleSave = async () => {
    if (!formData.name || !auth.currentUser) {
      alert("Nome do produto é obrigatório.");
      return;
    }

    setIsSaving(true);
    try {
      const collectionRef = collection(
        db,
        "artifacts",
        appId,
        "users",
        auth.currentUser.uid,
        "products"
      );

      const payload = {
        name: formData.name,
        manufacturer: formData.manufacturer || "Genérico",
        model: formData.model || "",
        description: formData.description || "",
        price: Number(formData.price) || 0,
        unit: formData.unit || "Unidade",
        image: formData.image || "",
        updatedAt: new Date().toISOString(),
      };

      if (editingId) {
        await updateDoc(doc(collectionRef, editingId), payload);
      } else {
        await addDoc(collectionRef, {
          ...payload,
          createdAt: new Date().toISOString(),
        });
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Erro ao salvar produto:", error);
      alert("Erro ao salvar. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (product: Product) => {
    setConfirmConfig({
      title: "Excluir Produto",
      message: `Tem certeza que deseja excluir "${product.name}"?`,
      type: "error",
      confirmText: "Excluir",
      showCancel: true,
      onConfirm: async () => {
        if (!auth.currentUser) return;
        try {
          await deleteDoc(
            doc(
              db,
              "artifacts",
              appId,
              "users",
              auth.currentUser.uid,
              "products",
              product.id
            )
          );
        } catch (error) {
          console.error("Erro ao excluir:", error);
        }
      },
    });
    setIsConfirmOpen(true);
  };

  const handleImageError = (productId: string) => {
    setImageLoadErrors((prev) => ({ ...prev, [productId]: true }));
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header e Filtros */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Catálogo de Produtos
        </h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          {/* Barra de Pesquisa */}
          <div className="relative flex-1 sm:w-64">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Pesquisar produtos..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filtro de Fornecedor (Dropdown Funcional) */}
          <div className="relative">
            <button
              onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
              className="w-full sm:w-auto px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center justify-between gap-2 min-w-[180px] transition"
            >
              <span className="truncate">
                {selectedManufacturer === "Todos"
                  ? "Todos Fornecedores"
                  : selectedManufacturer}
              </span>
              <ChevronDown
                size={14}
                className={`transition-transform ${
                  isFilterMenuOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isFilterMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsFilterMenuOpen(false)}
                ></div>
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                  <div className="py-1 max-h-60 overflow-y-auto custom-scrollbar">
                    <button
                      onClick={() => {
                        setSelectedManufacturer("Todos");
                        setIsFilterMenuOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${
                        selectedManufacturer === "Todos"
                          ? "text-indigo-600 font-medium bg-indigo-50 dark:bg-indigo-900/20"
                          : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      Todos Fornecedores
                    </button>
                    {manufacturers.map((m) => (
                      <button
                        key={m}
                        onClick={() => {
                          setSelectedManufacturer(m);
                          setIsFilterMenuOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${
                          selectedManufacturer === m
                            ? "text-indigo-600 font-medium bg-indigo-50 dark:bg-indigo-900/20"
                            : "text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                    {manufacturers.length === 0 && (
                      <p className="px-4 py-2 text-xs text-gray-400 italic">
                        Sem fornecedores cadastrados
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => handleOpenModal()}
            className="bg-indigo-900 hover:bg-indigo-800 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition whitespace-nowrap shadow-sm"
          >
            <Plus size={18} /> Novo Produto
          </button>
        </div>
      </div>

      {/* Tabela de Produtos */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 uppercase text-xs font-semibold sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4">Imagem</th>
                <th className="px-6 py-4">Produto</th>
                <th className="px-6 py-4">Fabricante</th>
                <th className="px-6 py-4">Valor Unitário</th>
                <th className="px-6 py-4">Unidade</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <Loader2
                      className="animate-spin text-indigo-600 mx-auto"
                      size={32}
                    />
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-12 text-center text-gray-500 dark:text-gray-400"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Package
                        size={48}
                        className="text-gray-300 dark:text-gray-600"
                      />
                      <p>Nenhum produto encontrado.</p>
                      {searchTerm && (
                        <p className="text-xs">
                          Tente limpar os filtros de busca.
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr
                    key={product.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition group"
                  >
                    <td className="px-6 py-4">
                      <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden border border-gray-200 dark:border-gray-600">
                        {product.image && !imageLoadErrors[product.id] ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover"
                            onError={() => handleImageError(product.id)}
                          />
                        ) : (
                          <ImageIcon size={20} className="text-gray-400" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p
                          className="font-bold text-gray-900 dark:text-white uppercase line-clamp-1"
                          title={product.name}
                        >
                          {product.name}
                        </p>
                        <p
                          className="text-xs text-gray-500 dark:text-gray-400 uppercase line-clamp-1"
                          title={product.model}
                        >
                          {product.model || "S/ Modelo"}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300 uppercase font-medium">
                      {product.manufacturer}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                      {product.price.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                      {product.unit}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenModal(product)}
                          className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(product)}
                          className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition"
                          title="Excluir"
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
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 text-xs text-gray-500 dark:text-gray-400 flex justify-between">
          <span>Total de Produtos: {filteredProducts.length}</span>
          <span>Mostrando todos os registros</span>
        </div>
      </div>

      {/* Modal Novo/Editar Produto */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 w-full max-w-4xl rounded-2xl shadow-2xl p-0 relative animate-in zoom-in-95 duration-200 border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900 rounded-t-2xl">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                {editingId ? (
                  <Edit2 size={18} className="text-indigo-500" />
                ) : (
                  <Plus size={18} className="text-indigo-500" />
                )}
                {editingId ? "Editar Produto" : "Novo Produto no Catálogo"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Coluna da Esquerda - Dados (8 cols) */}
                <div className="md:col-span-8 space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                      Nome do Produto*
                    </label>
                    <input
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Ex: Cardioversor V3"
                      autoFocus
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                        Fabricante
                      </label>
                      <input
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition"
                        value={formData.manufacturer}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            manufacturer: e.target.value,
                          })
                        }
                        placeholder="Ex: Instramed"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                        Modelo
                      </label>
                      <input
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition"
                        value={formData.model}
                        onChange={(e) =>
                          setFormData({ ...formData, model: e.target.value })
                        }
                        placeholder="Ex: Cardiomax Lite"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                      Descrição Detalhada
                    </label>
                    <textarea
                      rows={4}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition resize-none"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      placeholder="Especificações técnicas, detalhes..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                        Valor Unitário (R$)*
                      </label>
                      <input
                        type="number"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition font-bold"
                        placeholder="0.00"
                        value={formData.price}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            price: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                        Unidade de Medida
                      </label>
                      <input
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition"
                        value={formData.unit}
                        onChange={(e) =>
                          setFormData({ ...formData, unit: e.target.value })
                        }
                        placeholder="Un, Cx, Kg..."
                      />
                    </div>
                  </div>
                </div>

                {/* Coluna da Direita - Imagem (4 cols) */}
                <div className="md:col-span-4">
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                    Imagem do Produto
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl h-64 flex flex-col items-center justify-center text-center cursor-pointer transition-all group relative overflow-hidden ${
                      formData.image
                        ? "border-indigo-500 bg-gray-50 dark:bg-gray-900"
                        : "border-gray-300 dark:border-gray-600 hover:border-indigo-500 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageSelect}
                    />

                    {formData.image ? (
                      <>
                        <img
                          src={formData.image}
                          alt="Preview"
                          className="absolute inset-0 w-full h-full object-contain p-2"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <p className="text-white text-sm font-medium flex items-center gap-2">
                            <Edit2 size={16} /> Trocar Imagem
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="p-4">
                        <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                          <Upload size={24} />
                        </div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Escolher Imagem
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          PNG, JPG (Max 2MB)
                        </p>
                      </div>
                    )}
                  </div>
                  {formData.image && (
                    <button
                      onClick={() => setFormData({ ...formData, image: "" })}
                      className="mt-2 text-xs text-red-500 hover:underline w-full text-center"
                    >
                      Remover Imagem
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700 rounded-b-2xl">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg text-sm font-bold transition shadow-sm flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : null}
                {editingId ? "Salvar Alterações" : "Criar Produto"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
        onConfirm={confirmConfig.onConfirm}
        confirmText={confirmConfig.confirmText}
        showCancel={confirmConfig.showCancel}
      />
    </div>
  );
};

export default Catalog;
