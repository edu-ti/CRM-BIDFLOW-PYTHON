import React, { useState, useEffect, useRef } from "react";
import {
  Plus,
  Search,
  Edit2,
  Printer,
  ChevronLeft,
  ChevronRight,
  X,
  BookOpen,
  Loader2,
  Trash2,
  FileText,
  Upload,
  Image as ImageIcon,
  Check,
  User,
  Building2,
  Briefcase,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { db, auth, appId } from "../../lib/firebase"; // Caminho relativo mantido
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
import ConfirmModal, { ConfirmModalType } from "../../components/ConfirmModal"; // Caminho relativo mantido

// --- Interfaces ---

interface ProposalItemParam {
  name: string;
  value: string;
}

interface ProposalItem {
  id: string;
  description: string;
  manufacturer: string;
  model: string;
  status: "Venda" | "Locação";
  image?: string;
  detailedDescription: string;
  params: ProposalItemParam[];
  quantity: number;
  unitPrice: number;
  unit: string;
  rentDuration?: number; // Novo campo para duração da locação
}

interface ProposalTerms {
  payment: string;
  delivery: string;
  training: string;
  billing: string;
  warrantyEquipment: string;
  warrantyAccessories: string;
  installation: string;
  technicalAssistance: string;
  notes: string;
}

interface Proposal {
  id: string;
  number: string;
  date: string;
  validity: string;
  client: string;
  clientId?: string;
  contact: string;
  contactId?: string;
  document: string;
  value: number;
  status: "Rascunho" | "Enviada" | "Aprovada" | "Recusada" | "Negociando";
  stage: string;
  clientType: "PJ" | "PF";
  items: ProposalItem[];
  terms: ProposalTerms;
  createdAt: string;
  updatedAt?: string;
}

// Interfaces for fetching data
interface Organization {
  id: string;
  fantasyName: string;
  socialReason: string;
  cnpj: string;
}

interface ContactPerson {
  id: string;
  organizationId: string;
  name: string;
  email: string;
}

interface IndividualClient {
  id: string;
  name: string;
  cpf: string;
}

interface Product {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  description: string;
  price: number;
  unit: string;
  image?: string;
}

const Proposals = () => {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();

  // Aux Data State
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [contacts, setContacts] = useState<ContactPerson[]>([]);
  const [individuals, setIndividuals] = useState<IndividualClient[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Catalog Modal
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Estado de Edição/Criação
  const [editingId, setEditingId] = useState<string | null>(null);

  // Estado do Formulário Principal
  const [formData, setFormData] = useState<Partial<Proposal>>({
    number: "",
    date: new Date().toISOString().split("T")[0],
    validity: "",
    client: "",
    contact: "",
    document: "",
    value: 0,
    status: "Rascunho",
    stage: "Proposta",
    clientType: "PJ",
    items: [],
    terms: {
      billing: "Realizado diretamente pela fábrica.",
      training: "Capacitação técnica por especialistas da FR Produtos Médicos.",
      payment: "A vista",
      delivery: "Até 30 dias após a confirmação do pedido de compra.",
      warrantyEquipment: "12 meses a partir da data de emissão da nota Fiscal.",
      warrantyAccessories: "6 meses, conforme especificações do fabricante.",
      installation:
        "Realizada pela equipe técnica da FR Produtos Médicos, garantindo conformidade e segurança.",
      technicalAssistance:
        "Disponível com suporte especializado para manutenção e pós garantia.",
      notes: "Nenhuma",
    },
  });

  // Estado do Item sendo editado/adicionado
  const [currentItem, setCurrentItem] = useState<ProposalItem>({
    id: "",
    description: "",
    manufacturer: "",
    model: "",
    status: "Venda",
    detailedDescription: "",
    params: [],
    quantity: 1,
    unitPrice: 0,
    unit: "Unidade",
    image: "",
    rentDuration: 12, // Default duration
  });

  // Estado para novo parâmetro do item
  const [newParam, setNewParam] = useState({ name: "", value: "" });

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

  const showAlert = (
    title: string,
    message: string,
    type: ConfirmModalType = "info"
  ) => {
    setConfirmConfig({
      title,
      message,
      type,
      showCancel: false,
      confirmText: "OK",
      onConfirm: () => setIsConfirmOpen(false),
    });
    setIsConfirmOpen(true);
  };

  // 1. Initial Data Load
  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    // Proposals
    const qProposals = query(
      collection(db, "artifacts", appId, "users", uid, "proposals"),
      orderBy("createdAt", "desc")
    );
    const unsubProposals = onSnapshot(qProposals, (snapshot) => {
      setProposals(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Proposal))
      );
      setIsLoading(false);
    });

    // Organizations
    const unsubOrgs = onSnapshot(
      collection(db, "artifacts", appId, "users", uid, "organizations"),
      (snap) =>
        setOrganizations(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as Organization))
        )
    );

    // Contacts
    const unsubContacts = onSnapshot(
      collection(db, "artifacts", appId, "users", uid, "contacts"),
      (snap) =>
        setContacts(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as ContactPerson))
        )
    );

    // Individuals
    const unsubIndividuals = onSnapshot(
      collection(db, "artifacts", appId, "users", uid, "individuals"),
      (snap) =>
        setIndividuals(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as IndividualClient))
        )
    );

    // Products
    const unsubProducts = onSnapshot(
      collection(db, "artifacts", appId, "users", uid, "products"),
      (snap) =>
        setProducts(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product))
        )
    );

    return () => {
      unsubProposals();
      unsubOrgs();
      unsubContacts();
      unsubIndividuals();
      unsubProducts();
    };
  }, []);

  // --- Helpers ---
  const parseCurrencyString = (val: string): number => {
    if (!val) return 0;
    const cleanStr = val.replace(/[^0-9,.-]+/g, "");
    if (cleanStr.includes(",")) {
      const normalized = cleanStr.replace(/\./g, "").replace(",", ".");
      return parseFloat(normalized) || 0;
    }
    return parseFloat(cleanStr) || 0;
  };

  const calculateItemSubtotal = (item: ProposalItem): number => {
    let total = item.unitPrice;
    item.params.forEach((p) => {
      if (
        p.value &&
        (p.value.includes("R$") || !isNaN(Number(p.value.replace(",", "."))))
      ) {
        total += parseCurrencyString(p.value);
      }
    });

    // Se for locação, multiplica pela duração (meses), caso contrário é 1
    const multiplier = item.status === "Locação" ? item.rentDuration || 1 : 1;
    return total * item.quantity * multiplier;
  };

  const calculateProposalTotal = (items: ProposalItem[]) => {
    return items.reduce((acc, item) => acc + calculateItemSubtotal(item), 0);
  };

  const handlePrint = (proposal: Proposal) => {
    const url = `#/print/proposal/${proposal.id}`;
    window.open(url, "_blank");
  };

  // --- Handlers do Item Atual ---
  const handleAddItemParam = () => {
    if (newParam.name && newParam.value) {
      setCurrentItem((prev) => ({
        ...prev,
        params: [...prev.params, newParam],
      }));
      setNewParam({ name: "", value: "" });
    }
  };

  const handleRemoveItemParam = (index: number) => {
    setCurrentItem((prev) => ({
      ...prev,
      params: prev.params.filter((_, i) => i !== index),
    }));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setCurrentItem((prev) => ({ ...prev, image: url }));
    }
  };

  const handleAddItemToProposal = () => {
    if (!currentItem.description) {
      showAlert(
        "Campo Obrigatório",
        "A descrição do item é obrigatória.",
        "warning"
      );
      return;
    }

    const newItem = { ...currentItem, id: Date.now().toString() };
    const updatedItems = [...(formData.items || []), newItem];
    const totalValue = calculateProposalTotal(updatedItems);

    setFormData((prev) => ({
      ...prev,
      items: updatedItems,
      value: totalValue,
    }));

    // Reset item
    setCurrentItem({
      id: "",
      description: "",
      manufacturer: "",
      model: "",
      status: "Venda",
      detailedDescription: "",
      params: [],
      quantity: 1,
      unitPrice: 0,
      unit: "Unidade",
      image: "",
      rentDuration: 12,
    });
  };

  const handleRemoveItemFromProposal = (index: number) => {
    const updatedItems = (formData.items || []).filter((_, i) => i !== index);
    const totalValue = calculateProposalTotal(updatedItems);

    setFormData((prev) => ({
      ...prev,
      items: updatedItems,
      value: totalValue,
    }));
  };

  const handleSelectProduct = (prod: Product) => {
    setCurrentItem({
      ...currentItem,
      description: prod.name,
      manufacturer: prod.manufacturer,
      model: prod.model,
      detailedDescription: prod.description,
      unitPrice: prod.price,
      unit: prod.unit,
      image: prod.image,
    });
    setIsCatalogOpen(false);
  };

  // --- Handlers Principais ---

  const handleOpenCreate = (proposal?: Proposal) => {
    if (proposal) {
      setEditingId(proposal.id);
      setFormData({ ...proposal });
    } else {
      setEditingId(null);

      // Lógica de Geração Sequencial de Número (0001/YYYY)
      const currentYear = new Date().getFullYear();

      const currentYearProposals = proposals.filter((p) => {
        if (!p.number) return false;
        const parts = p.number.split("/");
        return parts.length === 2 && parts[1] === currentYear.toString();
      });

      let nextSeq = 1;

      if (currentYearProposals.length > 0) {
        const sequences = currentYearProposals
          .map((p) => {
            const parts = p.number.split("/");
            return parseInt(parts[0], 10);
          })
          .filter((n) => !isNaN(n));

        if (sequences.length > 0) {
          nextSeq = Math.max(...sequences) + 1;
        }
      }

      const formattedNumber = `${nextSeq
        .toString()
        .padStart(4, "0")}/${currentYear}`;

      setFormData({
        number: formattedNumber,
        date: new Date().toISOString().split("T")[0],
        validity: "",
        client: "",
        contact: "",
        document: "",
        value: 0,
        status: "Rascunho",
        stage: "Proposta",
        clientType: "PJ",
        items: [],
        terms: {
          billing: "Realizado diretamente pela fábrica.",
          training:
            "Capacitação técnica por especialistas da FR Produtos Médicos.",
          payment: "A vista",
          delivery: "Até 30 dias após a confirmação do pedido de compra.",
          warrantyEquipment:
            "12 meses a partir da data de emissão da nota Fiscal.",
          warrantyAccessories:
            "6 meses, conforme especificações do fabricante.",
          installation:
            "Realizada pela equipe técnica da FR Produtos Médicos, garantindo conformidade e segurança.",
          technicalAssistance:
            "Disponível com suporte especializado para manutenção e pós garantia.",
          notes: "Nenhuma",
        },
      });
    }
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (!formData.validity) {
      setTimeout(
        () =>
          showAlert(
            "Atenção",
            "A data de Validade da Proposta é obrigatória.",
            "warning"
          ),
        0
      );
      return;
    }
    if (!formData.client || !auth.currentUser) {
      setTimeout(
        () =>
          showAlert(
            "Atenção",
            "Selecione um cliente para prosseguir.",
            "warning"
          ),
        0
      );
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
        "proposals"
      );

      const payload = {
        ...formData,
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
      setIsCreating(false);
      showAlert("Sucesso", "Proposta salva com sucesso!", "success");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      showAlert("Erro", "Erro ao salvar. Tente novamente.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    setConfirmConfig({
      title: "Excluir Proposta",
      message: "Tem certeza que deseja excluir esta proposta?",
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
              "proposals",
              id
            )
          );
        } catch (error) {
          console.error("Erro ao excluir:", error);
          showAlert("Erro", "Não foi possível excluir a proposta.", "error");
        }
      },
    });
    setIsConfirmOpen(true);
  };

  const availableClients =
    formData.clientType === "PJ"
      ? organizations.map((o) => ({
          id: o.id,
          name: o.fantasyName || o.socialReason,
          doc: o.cnpj,
          type: "PJ",
        }))
      : individuals.map((i) => ({
          id: i.id,
          name: i.name,
          doc: i.cpf,
          type: "PF",
        }));

  const availableContacts =
    formData.clientType === "PJ" && formData.clientId
      ? contacts.filter((c) => c.organizationId === formData.clientId)
      : [];

  const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const client = availableClients.find((c) => c.id === selectedId);
    if (client) {
      setFormData({
        ...formData,
        client: client.name,
        clientId: client.id,
        document: client.doc,
        contact: "",
        contactId: "",
      });
    } else {
      setFormData({
        ...formData,
        client: "",
        clientId: "",
        document: "",
        contact: "",
        contactId: "",
      });
    }
  };

  const filteredCatalog = products.filter((p) =>
    p.name.toLowerCase().includes(catalogSearch.toLowerCase())
  );

  const filteredProposals = proposals.filter((p) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (p.client && p.client.toLowerCase().includes(searchLower)) ||
      (p.number && p.number.toLowerCase().includes(searchLower)) ||
      (p.document && p.document.includes(searchLower))
    );
  });

  const totalPages = Math.ceil(filteredProposals.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentProposals = filteredProposals.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const getStatusBadge = (status: string) => {
    let bgClass = "bg-gray-200 text-gray-800";
    if (status === "Enviada") bgClass = "bg-blue-100 text-blue-800";
    if (status === "Aprovada") bgClass = "bg-green-100 text-green-800";
    if (status === "Recusada") bgClass = "bg-red-100 text-red-800";
    if (status === "Negociando") bgClass = "bg-yellow-100 text-yellow-800";

    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${bgClass}`}
      >
        {status}
      </span>
    );
  };

  if (isCreating) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300 pb-20 font-sans">
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setIsCreating(false)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Voltar
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {editingId ? "Editar Proposta" : "Criar Nova Proposta"}
          </h1>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-8">
          {/* Parte 1: Cabeçalho */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Número da Proposta
              </label>
              <input
                type="text"
                disabled
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 cursor-not-allowed font-bold"
                value={formData.number}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Data de Criação
              </label>
              <input
                type="date"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Validade da Proposta <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                value={formData.validity}
                onChange={(e) =>
                  setFormData({ ...formData, validity: e.target.value })
                }
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as any })
                }
              >
                <option value="Rascunho">Rascunho</option>
                <option value="Enviada">Enviada</option>
                <option value="Aprovada">Aprovada</option>
                <option value="Recusada">Recusada</option>
                <option value="Negociando">Negociando</option>
              </select>
            </div>
          </div>

          {/* Selecionar Cliente */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
              Selecionar Cliente
            </h3>
            <div className="flex gap-4 mb-3">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                <input
                  type="radio"
                  name="clientType"
                  checked={formData.clientType === "PJ"}
                  onChange={() =>
                    setFormData({
                      ...formData,
                      clientType: "PJ",
                      client: "",
                      clientId: "",
                      contact: "",
                    })
                  }
                  className="text-indigo-600 focus:ring-indigo-500"
                />{" "}
                Pessoa Jurídica
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                <input
                  type="radio"
                  name="clientType"
                  checked={formData.clientType === "PF"}
                  onChange={() =>
                    setFormData({
                      ...formData,
                      clientType: "PF",
                      client: "",
                      clientId: "",
                      contact: "",
                    })
                  }
                  className="text-indigo-600 focus:ring-indigo-500"
                />{" "}
                Pessoa Física
              </label>
            </div>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 flex gap-2">
                <select
                  className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={formData.clientId || ""}
                  onChange={handleClientChange}
                >
                  <option value="">
                    Selecione{" "}
                    {formData.clientType === "PJ"
                      ? "uma organização"
                      : "um cliente"}
                    ...
                  </option>
                  {availableClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.doc})
                    </option>
                  ))}
                </select>
                <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 text-sm font-medium whitespace-nowrap shadow-sm">
                  + Novo
                </button>
              </div>

              {formData.clientType === "PJ" && (
                <div className="flex-1">
                  <select
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                    value={formData.contactId || ""}
                    onChange={(e) => {
                      const contact = availableContacts.find(
                        (c) => c.id === e.target.value
                      );
                      setFormData({
                        ...formData,
                        contact: contact ? contact.name : "",
                        contactId: contact ? contact.id : "",
                      });
                    }}
                    disabled={!formData.clientId}
                  >
                    <option value="">
                      {availableContacts.length > 0
                        ? "Selecione o contato..."
                        : formData.clientId
                        ? "Sem contatos cadastrados"
                        : "Selecione uma organização primeiro"}
                    </option>
                    {availableContacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <hr className="border-gray-200 dark:border-gray-700" />

          {/* Itens da Proposta */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              Itens da Proposta
            </h3>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-5 bg-white dark:bg-gray-800 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Campos do Item (Esquerda) */}
                <div className="md:col-span-10 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Descrição*
                      </label>
                      <input
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                        value={currentItem.description}
                        onChange={(e) =>
                          setCurrentItem({
                            ...currentItem,
                            description: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Fabricante
                      </label>
                      <input
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                        value={currentItem.manufacturer}
                        onChange={(e) =>
                          setCurrentItem({
                            ...currentItem,
                            manufacturer: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Modelo
                      </label>
                      <input
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                        value={currentItem.model}
                        onChange={(e) =>
                          setCurrentItem({
                            ...currentItem,
                            model: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Status
                      </label>
                      <select
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                        value={currentItem.status}
                        onChange={(e) => {
                          const newStatus = e.target.value as any;
                          setCurrentItem({
                            ...currentItem,
                            status: newStatus,
                            unit:
                              newStatus === "Locação"
                                ? "Mês"
                                : currentItem.unit, // Muda para Mês se locação
                            rentDuration:
                              newStatus === "Locação" ? 12 : undefined, // Padrão 12 meses
                          });
                        }}
                      >
                        <option value="Venda">Venda</option>
                        <option value="Locação">Locação</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Imagem do Item (Direita) */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Imagem
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border border-gray-300 dark:border-gray-600 rounded-lg h-[108px] bg-gray-50 dark:bg-gray-700 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 transition overflow-hidden relative"
                  >
                    {currentItem.image ? (
                      <img
                        src={currentItem.image}
                        alt="Item"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center text-gray-400 dark:text-gray-500">
                        <ImageIcon size={24} className="mb-1" />
                        <span className="text-[10px]">Imagem</span>
                      </div>
                    )}
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageSelect}
                    />
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full mt-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    Escolher
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Descrição Detalhada
                </label>
                <textarea
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none outline-none focus:ring-1 focus:ring-indigo-500"
                  rows={3}
                  value={currentItem.detailedDescription}
                  onChange={(e) =>
                    setCurrentItem({
                      ...currentItem,
                      detailedDescription: e.target.value,
                    })
                  }
                ></textarea>
              </div>

              {/* Parâmetros Adicionais */}
              <div className="pt-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Parâmetros Adicionais
                </label>
                {currentItem.params.length === 0 && (
                  <p className="text-xs text-gray-400 italic mb-3">
                    Nenhum parâmetro adicional.
                  </p>
                )}
                <div className="space-y-2 mb-3">
                  {currentItem.params.map((param, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded border border-gray-200 dark:border-gray-600"
                    >
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-200">
                        {param.name}:
                      </span>
                      <span className="text-xs text-gray-600 dark:text-gray-300 flex-1">
                        {param.value}
                      </span>
                      <button
                        onClick={() => handleRemoveItemParam(idx)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Nome do Parâmetro
                    </label>
                    <input
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="Ex: DC"
                      value={newParam.name}
                      onChange={(e) =>
                        setNewParam({ ...newParam, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Valor do Parâmetro
                    </label>
                    <input
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="Ex: R$ 4.264,00 (Somará ao total se for valor)"
                      value={newParam.value}
                      onChange={(e) =>
                        setNewParam({ ...newParam, value: e.target.value })
                      }
                    />
                  </div>
                  <button
                    onClick={handleAddItemParam}
                    className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-600 h-[42px]"
                  >
                    Adicionar
                  </button>
                </div>
              </div>

              {/* Linha de Valores */}
              <div
                className={`grid gap-4 items-end pt-4 ${
                  currentItem.status === "Locação"
                    ? "grid-cols-5"
                    : "grid-cols-4"
                }`}
              >
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Quantidade*
                  </label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                    value={currentItem.quantity}
                    onChange={(e) =>
                      setCurrentItem({
                        ...currentItem,
                        quantity: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Valor Unitário*
                  </label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                    value={currentItem.unitPrice}
                    onChange={(e) =>
                      setCurrentItem({
                        ...currentItem,
                        unitPrice: Number(e.target.value),
                      })
                    }
                  />
                </div>

                {currentItem.status === "Locação" && (
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Meses Locação
                    </label>
                    <input
                      type="number"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                      value={currentItem.rentDuration}
                      onChange={(e) =>
                        setCurrentItem({
                          ...currentItem,
                          rentDuration: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                )}

                <div className="col-span-1">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Unidade de Medida
                  </label>
                  <input
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                    value={currentItem.unit}
                    onChange={(e) =>
                      setCurrentItem({ ...currentItem, unit: e.target.value })
                    }
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Subtotal
                  </label>
                  <div className="w-full bg-gray-100 dark:bg-gray-700/50 rounded-lg p-2.5 text-sm font-bold text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 h-[42px] flex items-center">
                    R${" "}
                    {calculateItemSubtotal(currentItem).toLocaleString(
                      "pt-BR",
                      {
                        minimumFractionDigits: 2,
                      }
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mt-4">
              <div className="flex gap-3">
                <button
                  onClick={() => setIsCatalogOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 font-medium"
                >
                  <BookOpen size={16} /> Do Catálogo
                </button>
                <button
                  onClick={handleAddItemToProposal}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 font-medium"
                >
                  <Plus size={16} /> + Manual
                </button>
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                Total: R${" "}
                {(formData.value || 0).toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </div>
            </div>

            {/* Lista de Itens Já Adicionados */}
            {formData.items && formData.items.length > 0 && (
              <div className="mt-6 space-y-2">
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">
                  Itens Adicionados ({formData.items.length}):
                </h4>
                {formData.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-3 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 shadow-sm"
                  >
                    <div>
                      <p className="font-bold text-sm text-gray-900 dark:text-white">
                        {item.description}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {item.quantity} x R$ {item.unitPrice.toFixed(2)}
                        {item.status === "Locação" &&
                          ` (x${item.rentDuration || 24} Meses)`}
                        {item.params.length > 0 && " + Parâmetros"}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                        R${" "}
                        {calculateItemSubtotal(item).toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                      <button
                        onClick={() => handleRemoveItemFromProposal(idx)}
                        className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <hr className="border-gray-200 dark:border-gray-700" />

          {/* Parte 3: Termos Comerciais */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              Termos Comerciais
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Coluna 1 */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Faturamento
                  </label>
                  <textarea
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none outline-none focus:ring-1 focus:ring-indigo-500"
                    rows={2}
                    value={formData.terms?.billing}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        terms: { ...formData.terms!, billing: e.target.value },
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Condições de Pagamento
                  </label>
                  <textarea
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none outline-none focus:ring-1 focus:ring-indigo-500"
                    rows={2}
                    value={formData.terms?.payment}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        terms: { ...formData.terms!, payment: e.target.value },
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Garantia (Equipamentos)
                  </label>
                  <textarea
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none outline-none focus:ring-1 focus:ring-indigo-500"
                    rows={2}
                    value={formData.terms?.warrantyEquipment}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        terms: {
                          ...formData.terms!,
                          warrantyEquipment: e.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Instalação
                  </label>
                  <textarea
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none outline-none focus:ring-1 focus:ring-indigo-500"
                    rows={2}
                    value={formData.terms?.installation}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        terms: {
                          ...formData.terms!,
                          installation: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              </div>

              {/* Coluna 2 */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Treinamento
                  </label>
                  <textarea
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none outline-none focus:ring-1 focus:ring-indigo-500"
                    rows={2}
                    value={formData.terms?.training}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        terms: { ...formData.terms!, training: e.target.value },
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Prazo de Entrega
                  </label>
                  <textarea
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none outline-none focus:ring-1 focus:ring-indigo-500"
                    rows={2}
                    value={formData.terms?.delivery}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        terms: { ...formData.terms!, delivery: e.target.value },
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Garantia (Acessórios)
                  </label>
                  <textarea
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none outline-none focus:ring-1 focus:ring-indigo-500"
                    rows={2}
                    value={formData.terms?.warrantyAccessories}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        terms: {
                          ...formData.terms!,
                          warrantyAccessories: e.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Assistência Técnica
                  </label>
                  <textarea
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none outline-none focus:ring-1 focus:ring-indigo-500"
                    rows={2}
                    value={formData.terms?.technicalAssistance}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        terms: {
                          ...formData.terms!,
                          technicalAssistance: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Observações
              </label>
              <textarea
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none outline-none focus:ring-1 focus:ring-indigo-500"
                rows={3}
                value={formData.terms?.notes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    terms: { ...formData.terms!, notes: e.target.value },
                  })
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setIsCreating(false)}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg font-medium transition shadow-sm flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : null}
              {editingId ? "Salvar Alterações" : "Criar Proposta"}
            </button>
          </div>
        </div>

        {/* Modal de Confirmação (RENDERIZADO DENTRO DO BLOCO DE CRIAÇÃO TAMBÉM) */}
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

        {/* Modal de Catálogo */}
        {isCatalogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 w-full max-w-3xl rounded-xl shadow-2xl p-0 overflow-hidden flex flex-col max-h-[80vh]">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Selecionar Produto do Catálogo
                </h3>
                <button
                  onClick={() => setIsCatalogOpen(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                  <input
                    type="text"
                    placeholder="Buscar por nome, modelo ou fabricante..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
              <div className="overflow-y-auto p-4 space-y-2">
                {filteredCatalog.length > 0 ? (
                  filteredCatalog.map((prod) => (
                    <div
                      key={prod.id}
                      onClick={() => handleSelectProduct(prod)}
                      className="flex items-center gap-4 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer transition group"
                    >
                      <div className="w-12 h-12 bg-gray-100 dark:bg-gray-600 rounded flex items-center justify-center overflow-hidden">
                        {prod.image ? (
                          <img
                            src={prod.image}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon size={20} className="text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 dark:text-white">
                          {prod.name}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {prod.model} • {prod.manufacturer}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-indigo-600 dark:text-indigo-400">
                          R${" "}
                          {prod.price.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                        <span className="text-xs text-gray-400">
                          {prod.unit}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-8">
                    Nenhum produto encontrado.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // List View
  return (
    <div className="space-y-6 h-full flex flex-col font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Propostas
        </h1>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Pesquisar..."
              className="w-full pl-10 pr-4 py-2 bg-[#2d3748] border border-[#4a5568] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-200 placeholder-gray-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => handleOpenCreate()}
            className="bg-[#4338ca] hover:bg-[#3730a3] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition shadow-sm whitespace-nowrap"
          >
            <Plus size={18} /> Criar Nova
          </button>
        </div>
      </div>

      {/* Tabela Dark Theme (Estilo do Print) */}
      <div className="bg-[#1f2937] rounded-lg shadow-lg border border-[#374151] overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#1f2937] border-b border-[#374151]">
              <tr className="text-[#9ca3af] text-xs uppercase font-bold tracking-wider">
                <th className="px-6 py-4">Nº</th>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Contato do Cliente</th>
                <th className="px-6 py-4">CNPJ/CPF</th>
                <th className="px-6 py-4">Valor</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Etapa do Funil</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#374151] bg-[#1f2937]">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center">
                    <Loader2
                      className="animate-spin text-indigo-500 mx-auto"
                      size={32}
                    />
                  </td>
                </tr>
              ) : currentProposals.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <FileText size={48} className="text-gray-600" />
                      <p>Nenhuma proposta encontrada.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentProposals.map((proposal) => (
                  <tr
                    key={proposal.id}
                    className="hover:bg-[#374151] transition-colors group"
                  >
                    <td className="px-6 py-4 font-bold text-white">
                      {proposal.number}
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      {new Date(proposal.date).toLocaleDateString("pt-BR")}
                    </td>
                    <td
                      className="px-6 py-4 font-medium text-white truncate max-w-[200px]"
                      title={proposal.client}
                    >
                      {proposal.client}
                    </td>
                    <td className="px-6 py-4 text-gray-400">
                      {proposal.contact || "N/A"}
                    </td>
                    <td className="px-6 py-4 text-gray-400 font-mono text-xs">
                      {proposal.document || "N/A"}
                    </td>
                    <td className="px-6 py-4 font-bold text-white">
                      {proposal.value.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(proposal.status)}
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      {proposal.stage}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-3">
                        <button
                          onClick={() => handleOpenCreate(proposal)}
                          className="text-gray-400 hover:text-white transition"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handlePrint(proposal)}
                          className="text-gray-400 hover:text-white transition"
                          title="Imprimir"
                        >
                          <Printer size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(proposal.id)}
                          className="text-gray-400 hover:text-red-400 transition"
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

        {/* Footer Paginação */}
        <div className="px-6 py-4 border-t border-[#374151] bg-[#1f2937] flex justify-between items-center text-sm text-gray-400">
          <p>
            Mostrando {currentProposals.length} de {filteredProposals.length}{" "}
            propostas
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded border border-[#4a5568] hover:bg-[#374151] disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-2">
              Página {currentPage} de {totalPages || 1}
            </span>
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded border border-[#4a5568] hover:bg-[#374151] disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

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

export default Proposals;
