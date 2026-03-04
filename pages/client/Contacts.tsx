import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  MoreHorizontal,
  Filter,
  X,
  Trash2,
  Edit2,
  Phone,
  Mail,
  User,
  Building2,
  MapPin,
  Briefcase,
  Loader2,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  Download,
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

// --- Interfaces ---
interface Organization {
  id: string;
  cnpj: string;
  fantasyName: string;
  socialReason: string;
  cep: string;
  address: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

interface ContactPerson {
  id: string;
  organizationId: string;
  organizationName?: string;
  name: string;
  role: string;
  sector: string;
  email: string;
  phone: string;
}

interface IndividualClient {
  id: string;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  birthDate: string;
  cep: string;
  address: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

const Contacts = () => {
  const [activeTab, setActiveTab] = useState<
    "organizations" | "contacts" | "individuals"
  >("organizations");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAPI, setIsLoadingAPI] = useState(false);

  // Data States
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [contacts, setContacts] = useState<ContactPerson[]>([]);
  const [individuals, setIndividuals] = useState<IndividualClient[]>([]);

  // Modals
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isIndividualModalOpen, setIsIndividualModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);

  // Forms
  const [orgForm, setOrgForm] = useState<Partial<Organization>>({});
  const [contactForm, setContactForm] = useState<Partial<ContactPerson>>({});
  const [individualForm, setIndividualForm] = useState<
    Partial<IndividualClient>
  >({});
  const [importFile, setImportFile] = useState<File | null>(null);

  // Fetch Data
  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    const unsubOrg = onSnapshot(
      collection(db, "artifacts", appId, "users", uid, "organizations"),
      (snap) => {
        setOrganizations(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as Organization))
        );
      }
    );

    const unsubContact = onSnapshot(
      collection(db, "artifacts", appId, "users", uid, "contacts"),
      (snap) => {
        setContacts(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as ContactPerson))
        );
      }
    );

    const unsubInd = onSnapshot(
      collection(db, "artifacts", appId, "users", uid, "individuals"),
      (snap) => {
        setIndividuals(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as IndividualClient))
        );
        setIsLoading(false);
      }
    );

    return () => {
      unsubOrg();
      unsubContact();
      unsubInd();
    };
  }, []);

  // --- API Helpers ---
  const fetchCNPJ = async (cnpj: string) => {
    if (!cnpj) return;
    const cleanCNPJ = cnpj.replace(/\D/g, "");
    if (cleanCNPJ.length !== 14) return;

    setIsLoadingAPI(true);
    try {
      const response = await fetch(
        `https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`
      );
      if (!response.ok) throw new Error("CNPJ não encontrado");
      const data = await response.json();

      setOrgForm((prev) => ({
        ...prev,
        fantasyName: data.nome_fantasia || "",
        socialReason: data.razao_social || "",
        cep: data.cep || "",
        address: data.logradouro || "",
        number: data.numero || "",
        neighborhood: data.bairro || "",
        city: data.municipio || "",
        state: data.uf || "",
        complement: data.complemento || "",
      }));
    } catch (error) {
      console.error(error);
      alert("Erro ao buscar CNPJ. Verifique se está correto.");
    } finally {
      setIsLoadingAPI(false);
    }
  };

  const fetchCEP = async (cep: string, type: "org" | "ind") => {
    if (!cep) return;
    const cleanCEP = cep.replace(/\D/g, "");
    if (cleanCEP.length !== 8) return;

    setIsLoadingAPI(true);
    try {
      const response = await fetch(
        `https://viacep.com.br/ws/${cleanCEP}/json/`
      );
      const data = await response.json();

      if (!data.erro) {
        if (type === "org") {
          setOrgForm((prev) => ({
            ...prev,
            address: data.logradouro,
            neighborhood: data.bairro,
            city: data.localidade,
            state: data.uf,
          }));
        } else {
          setIndividualForm((prev) => ({
            ...prev,
            address: data.logradouro,
            neighborhood: data.bairro,
            city: data.localidade,
            state: data.uf,
          }));
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingAPI(false);
    }
  };

  // --- Handlers for Modals (Create vs Edit) ---

  const handleOpenOrgModal = (org?: Organization) => {
    if (org) {
      setEditingId(org.id);
      setOrgForm(org);
    } else {
      setEditingId(null);
      setOrgForm({});
    }
    setIsOrgModalOpen(true);
  };

  const handleOpenContactModal = (contact?: ContactPerson) => {
    if (contact) {
      setEditingId(contact.id);
      setContactForm(contact);
    } else {
      setEditingId(null);
      setContactForm({});
    }
    setIsContactModalOpen(true);
  };

  const handleOpenIndividualModal = (ind?: IndividualClient) => {
    if (ind) {
      setEditingId(ind.id);
      setIndividualForm(ind);
    } else {
      setEditingId(null);
      setIndividualForm({});
    }
    setIsIndividualModalOpen(true);
  };

  // --- Save Handlers ---

  const handleSaveOrg = async () => {
    if (!auth.currentUser) return;
    if (!orgForm.socialReason) {
      alert("Razão Social é obrigatória.");
      return;
    }

    const collectionRef = collection(
      db,
      "artifacts",
      appId,
      "users",
      auth.currentUser.uid,
      "organizations"
    );

    if (editingId) {
      await updateDoc(doc(collectionRef, editingId), orgForm);
    } else {
      await addDoc(collectionRef, orgForm);
    }

    setIsOrgModalOpen(false);
    setOrgForm({});
    setEditingId(null);
  };

  const handleSaveContact = async () => {
    if (!auth.currentUser) return;

    const org = organizations.find((o) => o.id === contactForm.organizationId);
    const dataToSave = {
      ...contactForm,
      organizationName: org?.fantasyName || org?.socialReason || "N/A",
    };

    const collectionRef = collection(
      db,
      "artifacts",
      appId,
      "users",
      auth.currentUser.uid,
      "contacts"
    );

    if (editingId) {
      await updateDoc(doc(collectionRef, editingId), dataToSave);
    } else {
      await addDoc(collectionRef, dataToSave);
    }

    setIsContactModalOpen(false);
    setContactForm({});
    setEditingId(null);
  };

  const handleSaveIndividual = async () => {
    if (!auth.currentUser) return;
    if (!individualForm.name) {
      alert("Nome é obrigatório.");
      return;
    }

    const collectionRef = collection(
      db,
      "artifacts",
      appId,
      "users",
      auth.currentUser.uid,
      "individuals"
    );

    if (editingId) {
      await updateDoc(doc(collectionRef, editingId), individualForm);
    } else {
      await addDoc(collectionRef, individualForm);
    }

    setIsIndividualModalOpen(false);
    setIndividualForm({});
    setEditingId(null);
  };

  const handleDelete = async (collectionName: string, id: string) => {
    if (!auth.currentUser) return;
    if (confirm("Tem certeza?")) {
      await deleteDoc(
        doc(
          db,
          "artifacts",
          appId,
          "users",
          auth.currentUser.uid,
          collectionName,
          id
        )
      );
    }
  };

  // --- Import Handlers ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImportFile(e.target.files[0]);
    }
  };

  const handleImport = () => {
    if (importFile) {
      setTimeout(() => {
        alert(
          `Arquivo "${importFile.name}" processado com sucesso! (Simulação)`
        );
        setIsImportModalOpen(false);
        setImportFile(null);
      }, 1000);
    } else {
      alert("Por favor, selecione um arquivo.");
    }
  };

  // --- Filter Logic (Pesquisa Corrigida e Aprimorada) ---
  const normalizeText = (text: string) => {
    return text
      ? text
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
      : "";
  };

  const cleanNumber = (text: string) => {
    return text ? text.replace(/\D/g, "") : "";
  };

  const normalizedSearch = normalizeText(searchTerm.trim());
  const cleanSearch = cleanNumber(searchTerm);

  // 1. Filtro Organizações
  const filteredOrganizations = organizations.filter((org) => {
    const matchFantasy = normalizeText(org.fantasyName).includes(
      normalizedSearch
    );
    const matchSocial = normalizeText(org.socialReason).includes(
      normalizedSearch
    );
    const matchCNPJ = cleanNumber(org.cnpj).includes(cleanSearch);

    return matchFantasy || matchSocial || (cleanSearch.length > 2 && matchCNPJ);
  });

  // 2. Filtro Contatos
  const filteredContacts = contacts.filter((contact) => {
    const matchName = normalizeText(contact.name).includes(normalizedSearch);
    const matchOrg = normalizeText(contact.organizationName).includes(
      normalizedSearch
    );
    const matchEmail = normalizeText(contact.email).includes(normalizedSearch);
    const matchPhone = cleanNumber(contact.phone).includes(cleanSearch);

    return (
      matchName ||
      matchOrg ||
      matchEmail ||
      (cleanSearch.length > 3 && matchPhone)
    );
  });

  // 3. Filtro Clientes PF
  const filteredIndividuals = individuals.filter((ind) => {
    const matchName = normalizeText(ind.name).includes(normalizedSearch);
    const matchEmail = normalizeText(ind.email).includes(normalizedSearch);
    const matchCPF = cleanNumber(ind.cpf).includes(cleanSearch);
    const matchPhone = cleanNumber(ind.phone).includes(cleanSearch);

    return (
      matchName ||
      matchEmail ||
      (cleanSearch.length > 2 && matchCPF) ||
      (cleanSearch.length > 3 && matchPhone)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Gestão de Clientes
        </h1>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Pesquisar (Nome, CPF, CNPJ...)"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center gap-2 transition"
          >
            <Upload size={16} /> Importar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {[
            { id: "organizations", label: "Organizações" },
            { id: "contacts", label: "Contatos" },
            { id: "individuals", label: "Clientes Pessoa Física" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 min-h-[400px]">
        {/* Organizations Tab */}
        {activeTab === "organizations" && (
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                Organizações
              </h3>
              <button
                onClick={() => handleOpenOrgModal()}
                className="bg-indigo-900 hover:bg-indigo-800 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition"
              >
                <Plus size={16} /> Novo Organização
              </button>
            </div>
            <div className="space-y-3">
              {filteredOrganizations.length > 0 ? (
                filteredOrganizations.map((org) => (
                  <div
                    key={org.id}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 flex justify-between items-center group transition"
                  >
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white uppercase">
                        {org.fantasyName || org.socialReason}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        CNPJ: {org.cnpj}
                      </p>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => handleOpenOrgModal(org)}
                        className="text-gray-400 hover:text-indigo-500 transition p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete("organizations", org.id)}
                        className="text-gray-400 hover:text-red-500 transition p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10">
                  <p className="text-gray-500">
                    Nenhuma organização encontrada.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Contacts Tab */}
        {activeTab === "contacts" && (
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                Contatos
              </h3>
              <button
                onClick={() => handleOpenContactModal()}
                className="bg-indigo-900 hover:bg-indigo-800 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition"
              >
                <Plus size={16} /> Novo Contato
              </button>
            </div>
            <div className="space-y-3">
              {filteredContacts.length > 0 ? (
                filteredContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 flex justify-between items-center group transition"
                  >
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white">
                        {contact.name}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                        {contact.role || "Cargo não inf."} |{" "}
                        {contact.organizationName}
                      </p>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => handleOpenContactModal(contact)}
                        className="text-gray-400 hover:text-indigo-500 transition p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete("contacts", contact.id)}
                        className="text-gray-400 hover:text-red-500 transition p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10">
                  <p className="text-gray-500">Nenhum contato encontrado.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Individuals Tab */}
        {activeTab === "individuals" && (
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                Clientes Pessoa Física
              </h3>
              <button
                onClick={() => handleOpenIndividualModal()}
                className="bg-indigo-900 hover:bg-indigo-800 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition"
              >
                <Plus size={16} /> Novo Cliente PF
              </button>
            </div>
            <div className="space-y-3">
              {filteredIndividuals.length > 0 ? (
                filteredIndividuals.map((ind) => (
                  <div
                    key={ind.id}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 flex justify-between items-center group transition"
                  >
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white uppercase">
                        {ind.name}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        CPF: {ind.cpf}
                      </p>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => handleOpenIndividualModal(ind)}
                        className="text-gray-400 hover:text-indigo-500 transition p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete("individuals", ind.id)}
                        className="text-gray-400 hover:text-red-500 transition p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10">
                  <p className="text-gray-500">Nenhum cliente PF encontrado.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* --- MODALS --- */}

      {/* Modal de Importação */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-xl shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Importar Clientes
              </h3>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Selecione o ficheiro (.xlsx ou .csv)
                </label>
                <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 flex items-center gap-2 bg-white dark:bg-gray-700">
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-200 px-3 py-1.5 rounded text-sm hover:bg-gray-200 dark:hover:bg-gray-500 transition font-medium"
                  >
                    Escolher arquivo
                  </label>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {importFile ? importFile.name : "Nenhum arquivo escolhido"}
                  </span>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".csv, .xlsx"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
                <h4 className="font-bold text-gray-800 dark:text-white mb-2 text-sm">
                  Instruções:
                </h4>
                <ul className="list-disc list-inside text-xs text-gray-600 dark:text-gray-300 space-y-1.5">
                  <li>A primeira linha da planilha deve ser o cabeçalho.</li>
                  <li>O sistema tentará identificar se a linha é PJ ou PF.</li>
                  <li>
                    <strong>Para Organização (PJ):</strong> Use as colunas{" "}
                    <code className="bg-gray-200 dark:bg-gray-600 px-1 rounded text-gray-800 dark:text-white">
                      cnpj
                    </code>{" "}
                    (obrigatório) e{" "}
                    <code className="bg-gray-200 dark:bg-gray-600 px-1 rounded text-gray-800 dark:text-white">
                      nome_fantasia
                    </code>
                    .
                  </li>
                  <li>
                    <strong>Para Cliente PF:</strong> Use a coluna{" "}
                    <code className="bg-gray-200 dark:bg-gray-600 px-1 rounded text-gray-800 dark:text-white">
                      nome
                    </code>{" "}
                    (obrigatório).
                  </li>
                  <li>
                    Colunas opcionais: email, telefone, cep, logradouro, numero,
                    bairro, cidade, estado.
                  </li>
                  <li>
                    Clientes com CNPJ/CPF, e-mail ou telefone já existentes
                    serão ignorados.
                  </li>
                </ul>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleImport}
                  className="px-6 py-2 bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg transition font-medium shadow-sm flex items-center gap-2"
                >
                  {isLoadingAPI ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Upload size={16} />
                  )}
                  Importar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Organização */}
      {isOrgModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 w-full max-w-4xl rounded-xl shadow-2xl p-6 relative my-8 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">
              {editingId ? "Editar Organização" : "Nova Organização"}
            </h3>
            <button
              onClick={() => setIsOrgModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  CNPJ
                </label>
                <div className="relative">
                  <input
                    className="w-full border p-2 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white pl-3 pr-10"
                    placeholder="00.000.000/0000-00"
                    value={orgForm.cnpj || ""}
                    onChange={(e) =>
                      setOrgForm({ ...orgForm, cnpj: e.target.value })
                    }
                  />
                  <button
                    onClick={() => fetchCNPJ(orgForm.cnpj || "")}
                    className="absolute right-2 top-2 text-indigo-600 hover:text-indigo-800 transition"
                    title="Pesquisar CNPJ"
                  >
                    {isLoadingAPI ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Search size={18} />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome Fantasia
                </label>
                <input
                  className="w-full border p-2 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={orgForm.fantasyName || ""}
                  onChange={(e) =>
                    setOrgForm({ ...orgForm, fantasyName: e.target.value })
                  }
                  placeholder="Não é obrigatório"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Razão Social*
                </label>
                <input
                  className="w-full border p-2 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={orgForm.socialReason || ""}
                  onChange={(e) =>
                    setOrgForm({ ...orgForm, socialReason: e.target.value })
                  }
                  placeholder="É obrigatório"
                />
              </div>

              <div className="md:col-span-2 grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    CEP
                  </label>
                  <div className="relative">
                    <input
                      className="w-full border p-2 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white pl-3 pr-10"
                      value={orgForm.cep || ""}
                      onChange={(e) =>
                        setOrgForm({ ...orgForm, cep: e.target.value })
                      }
                    />
                    <button
                      onClick={() => fetchCEP(orgForm.cep || "", "org")}
                      className="absolute right-2 top-2 text-indigo-600 hover:text-indigo-800 transition"
                    >
                      {isLoadingAPI ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Search size={18} />
                      )}
                    </button>
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Logradouro
                  </label>
                  <input
                    className="w-full border p-2 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={orgForm.address || ""}
                    onChange={(e) =>
                      setOrgForm({ ...orgForm, address: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="md:col-span-2 grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Número
                  </label>
                  <input
                    className="w-full border p-2 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={orgForm.number || ""}
                    onChange={(e) =>
                      setOrgForm({ ...orgForm, number: e.target.value })
                    }
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Complemento
                  </label>
                  <input
                    className="w-full border p-2 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={orgForm.complement || ""}
                    onChange={(e) =>
                      setOrgForm({ ...orgForm, complement: e.target.value })
                    }
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Bairro
                  </label>
                  <input
                    className="w-full border p-2 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={orgForm.neighborhood || ""}
                    onChange={(e) =>
                      setOrgForm({ ...orgForm, neighborhood: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="md:col-span-2 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cidade
                  </label>
                  <input
                    className="w-full border p-2 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={orgForm.city || ""}
                    onChange={(e) =>
                      setOrgForm({ ...orgForm, city: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Estado (UF)
                  </label>
                  <input
                    className="w-full border p-2 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={orgForm.state || ""}
                    onChange={(e) =>
                      setOrgForm({ ...orgForm, state: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setIsOrgModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveOrg}
                className="px-6 py-2 bg-indigo-900 text-white rounded-lg hover:bg-indigo-800 transition shadow-sm"
              >
                {editingId ? "Salvar Alterações" : "Adicionar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Novo Contato */}
      {isContactModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-xl shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">
              {editingId ? "Editar Contato" : "Novo Contato"}
            </h3>
            <button
              onClick={() => setIsContactModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Organização*
                </label>
                <select
                  className="w-full border p-2 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={contactForm.organizationId || ""}
                  onChange={(e) =>
                    setContactForm({
                      ...contactForm,
                      organizationId: e.target.value,
                    })
                  }
                >
                  <option value="">Selecione...</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.fantasyName || org.socialReason}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome*
                </label>
                <input
                  className="w-full border p-2 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={contactForm.name || ""}
                  onChange={(e) =>
                    setContactForm({ ...contactForm, name: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cargo
                  </label>
                  <input
                    className="w-full border p-2 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={contactForm.role || ""}
                    onChange={(e) =>
                      setContactForm({ ...contactForm, role: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Setor
                  </label>
                  <input
                    className="w-full border p-2 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={contactForm.sector || ""}
                    onChange={(e) =>
                      setContactForm({ ...contactForm, sector: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    className="w-full border p-2 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={contactForm.email || ""}
                    onChange={(e) =>
                      setContactForm({ ...contactForm, email: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Telefone
                  </label>
                  <input
                    className="w-full border p-2 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={contactForm.phone || ""}
                    onChange={(e) =>
                      setContactForm({ ...contactForm, phone: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setIsContactModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveContact}
                className="px-6 py-2 bg-indigo-900 text-white rounded-lg hover:bg-indigo-800 transition shadow-sm"
              >
                {editingId ? "Salvar Alterações" : "Adicionar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Novo Cliente PF */}
      {isIndividualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 w-full max-w-4xl rounded-xl shadow-2xl p-6 relative my-8 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">
              {editingId ? "Editar Cliente PF" : "Novo Cliente PF"}
            </h3>
            <button
              onClick={() => setIsIndividualModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome*
                </label>
                <input
                  className="w-full border p-2 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={individualForm.name || ""}
                  onChange={(e) =>
                    setIndividualForm({
                      ...individualForm,
                      name: e.target.value,
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    className="w-full border p-2 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={individualForm.email || ""}
                    onChange={(e) =>
                      setIndividualForm({
                        ...individualForm,
                        email: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Telefone
                  </label>
                  <input
                    className="w-full border p-2 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={individualForm.phone || ""}
                    onChange={(e) =>
                      setIndividualForm({
                        ...individualForm,
                        phone: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    CPF
                  </label>
                  <input
                    className="w-full border p-2 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={individualForm.cpf || ""}
                    onChange={(e) =>
                      setIndividualForm({
                        ...individualForm,
                        cpf: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Data de Nascimento
                  </label>
                  <input
                    type="date"
                    className="w-full border p-2 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={individualForm.birthDate || ""}
                    onChange={(e) =>
                      setIndividualForm({
                        ...individualForm,
                        birthDate: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              {/* Endereço PF */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    CEP
                  </label>
                  <div className="relative">
                    <input
                      className="w-full border p-2 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white pl-3 pr-10"
                      value={individualForm.cep || ""}
                      onChange={(e) =>
                        setIndividualForm({
                          ...individualForm,
                          cep: e.target.value,
                        })
                      }
                    />
                    <button
                      onClick={() => fetchCEP(individualForm.cep || "", "ind")}
                      className="absolute right-2 top-2 text-indigo-600 hover:text-indigo-800 transition"
                    >
                      {isLoadingAPI ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Search size={18} />
                      )}
                    </button>
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Logradouro
                  </label>
                  <input
                    className="w-full border p-2 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={individualForm.address || ""}
                    onChange={(e) =>
                      setIndividualForm({
                        ...individualForm,
                        address: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Número
                  </label>
                  <input
                    className="w-full border p-2 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={individualForm.number || ""}
                    onChange={(e) =>
                      setIndividualForm({
                        ...individualForm,
                        number: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Complemento
                  </label>
                  <input
                    className="w-full border p-2 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={individualForm.complement || ""}
                    onChange={(e) =>
                      setIndividualForm({
                        ...individualForm,
                        complement: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Bairro
                  </label>
                  <input
                    className="w-full border p-2 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={individualForm.neighborhood || ""}
                    onChange={(e) =>
                      setIndividualForm({
                        ...individualForm,
                        neighborhood: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cidade
                  </label>
                  <input
                    className="w-full border p-2 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={individualForm.city || ""}
                    onChange={(e) =>
                      setIndividualForm({
                        ...individualForm,
                        city: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Estado (UF)
                  </label>
                  <input
                    className="w-full border p-2 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={individualForm.state || ""}
                    onChange={(e) =>
                      setIndividualForm({
                        ...individualForm,
                        state: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setIsIndividualModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveIndividual}
                className="px-6 py-2 bg-indigo-900 text-white rounded-lg hover:bg-indigo-800 transition shadow-sm"
              >
                {editingId ? "Salvar Alterações" : "Adicionar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contacts;
