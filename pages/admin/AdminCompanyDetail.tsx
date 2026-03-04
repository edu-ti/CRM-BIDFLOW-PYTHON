import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Box,
  FileText,
  Activity,
  Shield,
  MessageSquare,
  Zap,
  Loader2,
  AlertCircle,
  Edit2,
  Save,
  X,
  Search,
  MapPin,
  Plus,
  Trash2,
  Mail,
  CheckCircle2,
  Smartphone,
  RefreshCw,
  Power,
  QrCode,
  Download,
  ExternalLink,
  CreditCard,
  Calendar,
  BarChart3,
  ToggleLeft,
  ToggleRight,
  FileCheck,
  ChevronDown,
  UploadCloud,
  Eye,
} from "lucide-react";
import { db, appId } from "../../lib/firebase";
import {
  doc,
  onSnapshot,
  updateDoc,
  collection,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  setDoc,
} from "firebase/firestore";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import ConfirmModal, { ConfirmModalType } from "../../components/ConfirmModal";
import { WhatsAppService } from "../../lib/whatsappService"; // Importe o serviço criado

// --- Interfaces ---

interface CompanyAddress {
  cep: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  complement?: string;
}

interface Company {
  id: string;
  name: string;
  domain: string;
  responsible: string;
  email: string;
  phone: string;
  plan: string;
  status: "active" | "trial" | "paused" | "overdue";
  renewal: string;
  mrr: number;
  limits: { users: number; msgs: number };
  createdAt?: string;
  document?: string;
  documentType?: "CPF" | "CNPJ";
  address?: CompanyAddress;
  modules?: Record<string, boolean>;
}

interface CompanyUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "agent";
  status: "active" | "inactive";
}

interface WhatsAppInstance {
  id: string;
  name: string;
  status: "CONNECTED" | "DISCONNECTED" | "QRCODE" | "PAIRING";
  phoneNumber?: string;
  batteryLevel?: number;
  lastSync?: string;
  qrCodeBase64?: string; // Novo campo para exibir o QR
}

interface Invoice {
  id: string;
  amount: number;
  status: "PAID" | "PENDING" | "OVERDUE" | "CANCELLED";
  dueDate: string;
  paidAt?: string;
  pdfUrl?: string;
}

interface Log {
  id: string;
  action: string;
  user: string;
  details: string;
  createdAt: string;
  type: "info" | "warning" | "error";
}

interface Contract {
  id: string;
  title: string;
  status: "active" | "expired" | "pending";
  signedAt?: string;
  url?: string;
  fileName?: string;
}

// Mock Data
const usageData = [
  { name: "01", msgs: 400 },
  { name: "05", msgs: 300 },
  { name: "10", msgs: 550 },
  { name: "15", msgs: 450 },
  { name: "20", msgs: 700 },
  { name: "25", msgs: 600 },
  { name: "30", msgs: 900 },
];

const availableModules = [
  {
    id: "chatbot",
    name: "Chatbot Pro",
    description: "Construtor de fluxos e automação",
    price: 199,
  },
  {
    id: "crm_funnel",
    name: "Funil de Vendas",
    description: "Kanban ilimitado e gestão de leads",
    price: 0,
  },
  {
    id: "api_access",
    name: "API de Integração",
    description: "Webhooks e acesso externo",
    price: 99,
  },
  {
    id: "campaigns",
    name: "Campanhas em Massa",
    description: "Disparos de mensagens em lote",
    price: 149,
  },
];

const AdminCompanyDetail = () => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("overview");
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Estados Gerais
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Company>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [apiLoading, setApiLoading] = useState(false);

  // Sub-coleções
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);

  // NOVO: Estado para armazenar os planos vindos do banco
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);

  // Modais
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState<Partial<CompanyUser>>({
    role: "agent",
    status: "active",
  });
  const [isInstanceModalOpen, setIsInstanceModalOpen] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState("");
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [invoiceForm, setInvoiceForm] = useState<Partial<Invoice>>({
    status: "PENDING",
    amount: 0,
    dueDate: "",
  });

  // Modal Plano
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("");

  // Modal Contrato e Upload
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [newContractTitle, setNewContractTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estado do Modal de Confirmação
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    type: ConfirmModalType;
    onConfirm: () => void;
    confirmText: string;
  }>({
    title: "",
    message: "",
    type: "info",
    onConfirm: () => {},
    confirmText: "Confirmar",
  });

  // Helpers para o Modal
  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    type: ConfirmModalType = "warning"
  ) => {
    setConfirmConfig({
      title,
      message,
      type,
      showCancel: true,
      confirmText: "Confirmar",
      onConfirm: async () => {
        await onConfirm();
        setIsConfirmOpen(false);
      },
    });
    setIsConfirmOpen(true);
  };

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

  // --- LÓGICA DE TEMA PARA GRÁFICOS ---
  const [isDark, setIsDark] = useState(
    document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  const chartTheme = {
    grid: isDark ? "#374151" : "#f3f4f6",
    text: isDark ? "#9ca3af" : "#6b7280",
    tooltipBg: isDark ? "#1f2937" : "#ffffff",
    tooltipBorder: isDark ? "#374151" : "#e5e7eb",
    tooltipText: isDark ? "#f3f4f6" : "#1f293b",
    cursor: isDark ? "#374151" : "#f9fafb",
  };
  // -------------------------------------

  useEffect(() => {
    if (!id) return;

    const companyRef = doc(db, "artifacts", appId, "companies", id);
    const unsubCompany = onSnapshot(companyRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as Company;
        setCompany(data);
        if (!isEditing) setEditForm(JSON.parse(JSON.stringify(data)));
      } else setCompany(null);
      setIsLoading(false);
    });

    const usersRef = collection(
      db,
      "artifacts",
      appId,
      "companies",
      id,
      "users"
    );
    const unsubUsers = onSnapshot(query(usersRef, orderBy("name")), (snap) => {
      setUsers(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as CompanyUser))
      );
    });

    const instRef = collection(
      db,
      "artifacts",
      appId,
      "companies",
      id,
      "instances"
    );
    const unsubInst = onSnapshot(instRef, (snap) => {
      setInstances(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as WhatsAppInstance))
      );
    });

    const invRef = collection(
      db,
      "artifacts",
      appId,
      "companies",
      id,
      "invoices"
    );
    const unsubInv = onSnapshot(
      query(invRef, orderBy("dueDate", "desc")),
      (snap) => {
        const data = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() } as Invoice)
        );
        setInvoices(data);
      }
    );

    const logsRef = collection(db, "artifacts", appId, "companies", id, "logs");
    const unsubLogs = onSnapshot(
      query(logsRef, orderBy("createdAt", "desc")),
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Log));
        setLogs(data);
      }
    );

    const contractsRef = collection(
      db,
      "artifacts",
      appId,
      "companies",
      id,
      "contracts"
    );
    const unsubContracts = onSnapshot(contractsRef, (snap) => {
      const data = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as Contract)
      );
      setContracts(data);
    });
    // NOVO: Buscar Planos do Firestore (Global)
    const plansRef = collection(db, "artifacts", appId, "plans");
    const unsubPlans = onSnapshot(
      query(plansRef, orderBy("priceMonthly")),
      (snap) => {
        const fetchedPlans = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() } as any)
        );
        setAvailablePlans(fetchedPlans);
      }
    );

    return () => {
      unsubCompany();
      unsubUsers();
      unsubInst();
      unsubInv();
      unsubLogs();
      unsubContracts();
      unsubPlans(); // Adicionado unsubPlans
    };
  }, [id, isEditing]);

  // --- Helpers ---
  const toggleModule = async (moduleId: string, currentValue: boolean) => {
    if (!id || !company) return;
    try {
      const currentModules = company.modules || {};
      await updateDoc(doc(db, "artifacts", appId, "companies", id), {
        modules: { ...currentModules, [moduleId]: !currentValue },
      });
    } catch (error) {
      console.error(error);
    }
  };

  const fetchCNPJ = async (cnpj: string) => {
    const cleanCNPJ = cnpj.replace(/\D/g, "");
    if (cleanCNPJ.length !== 14) return;
    setApiLoading(true);
    try {
      const response = await fetch(
        `https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`
      );
      if (!response.ok) throw new Error("CNPJ não encontrado");
      const data = await response.json();
      setEditForm((prev) => ({
        ...prev,
        name: data.nome_fantasia || data.razao_social,
        phone: data.ddd_telefone_1 || prev.phone,
        email: data.email || prev.email,
        address: {
          cep: data.cep,
          street: data.logradouro,
          number: data.numero,
          neighborhood: data.bairro,
          city: data.municipio,
          state: data.uf,
          complement: data.complemento,
        },
      }));
    } catch (error) {
      console.error(error);
      alert("Erro ao buscar CNPJ.");
    } finally {
      setApiLoading(false);
    }
  };

  const fetchCEP = async (cep: string) => {
    const cleanCEP = cep.replace(/\D/g, "");
    if (cleanCEP.length !== 8) return;
    setApiLoading(true);
    try {
      const response = await fetch(
        `https://viacep.com.br/ws/${cleanCEP}/json/`
      );
      const data = await response.json();
      if (!data.erro) {
        setEditForm((prev) => ({
          ...prev,
          address: {
            ...prev.address!,
            street: data.logradouro,
            neighborhood: data.bairro,
            city: data.localidade,
            state: data.uf,
            cep: cleanCEP,
          },
        }));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setApiLoading(false);
    }
  };

  const handleSaveCompany = async () => {
    if (!id || !editForm) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, "artifacts", appId, "companies", id), {
        ...editForm,
        updatedAt: new Date().toISOString(),
      });
      setIsEditing(false);
    } catch (error: any) {
      alert(`Erro: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Alterado para usar availablePlans do estado
  const handleUpdatePlan = async () => {
    if (!id || !selectedPlan) return;
    setIsSaving(true);
    try {
      const planDetails = availablePlans.find((p) => p.name === selectedPlan);
      if (planDetails) {
        await updateDoc(doc(db, "artifacts", appId, "companies", id), {
          plan: selectedPlan,
          limits: {
            users: planDetails.limits.users,
            msgs: planDetails.limits.msgs,
          },
          mrr: planDetails.priceMonthly,
          updatedAt: new Date().toISOString(),
        });
        handleAddLog(
          "Alteração de Plano",
          `Plano alterado para ${selectedPlan}`
        );
      }
      setIsPlanModalOpen(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  // --- Handlers Users ---
  const openUserModal = (user?: CompanyUser) => {
    if (user) {
      setEditingUserId(user.id);
      setUserForm({ ...user });
    } else {
      setEditingUserId(null);
      setUserForm({ name: "", email: "", role: "agent", status: "active" });
    }
    setIsUserModalOpen(true);
  };
  const handleSaveUser = async () => {
    if (!id || !userForm.name) return;
    try {
      const ref = collection(db, "artifacts", appId, "companies", id, "users");
      if (editingUserId) await updateDoc(doc(ref, editingUserId), userForm);
      else
        await addDoc(ref, { ...userForm, createdAt: new Date().toISOString() });
      setIsUserModalOpen(false);
    } catch (e) {
      console.error(e);
    }
  };
  const handleDeleteUser = (uid: string, userName: string) => {
    setConfirmConfig({
      title: "Excluir Usuário",
      message: `Tem certeza que deseja remover o usuário ${userName}? Esta ação não pode ser desfeita.`,
      type: "error",
      confirmText: "Excluir",
      onConfirm: async () => {
        if (!id) return;
        try {
          await deleteDoc(
            doc(db, "artifacts", appId, "companies", id, "users", uid)
          );
        } catch (e) {
          console.error(e);
        }
      },
    });
    setIsConfirmOpen(true);
  };

  // --- Handlers Instances (LÓGICA REAL ADICIONADA) ---
  const handleAddInstance = async () => {
    if (!id || !newInstanceName) return;
    try {
      await addDoc(
        collection(db, "artifacts", appId, "companies", id, "instances"),
        {
          name: newInstanceName,
          status: "DISCONNECTED",
          phoneNumber: "",
          batteryLevel: 0,
          createdAt: new Date().toISOString(),
        }
      );
      setNewInstanceName("");
      setIsInstanceModalOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleManageInstance = (inst: WhatsAppInstance) => {
    if (!id) return;

    if (inst.status === "CONNECTED") {
      showConfirm(
        "Desconectar Instância",
        `Deseja realmente desconectar a instância ${inst.name}?`,
        async () => {
          try {
            // 1. Desconecta na API
            await WhatsAppService.logoutInstance(inst.name);

            // 2. Atualiza no Firebase
            const ref = doc(
              db,
              "artifacts",
              appId,
              "companies",
              id,
              "instances",
              inst.id
            );
            await updateDoc(ref, {
              status: "DISCONNECTED",
              phoneNumber: "",
              batteryLevel: 0,
              qrCodeBase64: null,
            });
          } catch (e) {
            console.error(e);
          }
        },
        "warning"
      );
    } else {
      // Conectar: Buscar QR Code Real
      const connect = async () => {
        try {
          const ref = doc(
            db,
            "artifacts",
            appId,
            "companies",
            id,
            "instances",
            inst.id
          );

          // Atualiza status local para "Gerando QR"
          await updateDoc(ref, { status: "PAIRING" });

          // Chama a API Real
          const data = await WhatsAppService.connectInstance(inst.name);

          if (data && data.base64) {
            // Salva o QR code no documento para o frontend exibir
            await updateDoc(ref, {
              status: "QRCODE",
              qrCodeBase64: data.base64,
            });

            // NOTA: Em produção, você teria um Webhook ouvindo "connection.update"
            // para mudar o status para CONNECTED automaticamente no banco.
            // Para este exemplo, o usuário precisaria atualizar a página ou você faria um polling.
          }
        } catch (e) {
          console.error("Erro ao conectar:", e);
          alert(
            "Erro ao conectar com a API do WhatsApp. Verifique as configurações."
          );
          const ref = doc(
            db,
            "artifacts",
            appId,
            "companies",
            id,
            "instances",
            inst.id
          );
          await updateDoc(ref, { status: "DISCONNECTED" });
        }
      };
      connect();
    }
  };

  const handleDeleteInstance = (iid: string, instName: string) => {
    showConfirm(
      "Excluir Instância",
      `Tem certeza que deseja excluir ${instName}?`,
      async () => {
        if (!id) return;
        try {
          await deleteDoc(
            doc(db, "artifacts", appId, "companies", id, "instances", iid)
          );
        } catch (e) {
          console.error(e);
        }
      },
      "error"
    );
  };

  // --- Handlers Invoices ---
  const openInvoiceModal = (inv?: Invoice) => {
    if (inv) {
      setEditingInvoiceId(inv.id);
      setInvoiceForm({ ...inv });
    } else {
      setEditingInvoiceId(null);
      setInvoiceForm({
        amount: 0,
        status: "PENDING",
        dueDate: new Date().toISOString().split("T")[0],
      });
    }
    setIsInvoiceModalOpen(true);
  };
  const handleSaveInvoice = async () => {
    if (!id || !invoiceForm.amount) return;
    try {
      const ref = collection(
        db,
        "artifacts",
        appId,
        "companies",
        id,
        "invoices"
      );
      if (editingInvoiceId)
        await updateDoc(doc(ref, editingInvoiceId), invoiceForm);
      else
        await addDoc(ref, {
          ...invoiceForm,
          createdAt: new Date().toISOString(),
        });
      setIsInvoiceModalOpen(false);
    } catch (e) {
      console.error(e);
    }
  };
  const handleDownloadInvoice = () => {
    alert("Download do PDF iniciado...");
  };

  // --- Handlers Contracts ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleAddContract = async () => {
    if (!id || !newContractTitle) return;
    try {
      // Simulação de URL de upload
      const mockUrl = selectedFile
        ? URL.createObjectURL(selectedFile)
        : "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";

      await addDoc(
        collection(db, "artifacts", appId, "companies", id, "contracts"),
        {
          title: newContractTitle,
          status: "active",
          signedAt: new Date().toISOString(),
          url: mockUrl,
          fileName: selectedFile ? selectedFile.name : "contrato_gerado.pdf",
          createdAt: new Date().toISOString(),
        }
      );
      setNewContractTitle("");
      setSelectedFile(null);
      setIsContractModalOpen(false);
      handleAddLog(
        "Novo Contrato",
        `Contrato "${newContractTitle}" adicionado`
      );
    } catch (error) {
      console.error(error);
    }
  };

  const handleViewContract = (url?: string) => {
    if (url && url !== "#") {
      window.open(url, "_blank");
    } else {
      alert("Visualização indisponível para este arquivo simulado.");
    }
  };

  const handleDownloadContract = (url?: string, filename?: string) => {
    if (url && url !== "#") {
      const link = document.createElement("a");
      link.href = url;
      link.download = filename || "contrato.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert("Download indisponível para este arquivo simulado.");
    }
  };

  const handleDeleteContract = (contractId: string, title: string) => {
    setConfirmConfig({
      title: "Excluir Contrato",
      message: `Deseja realmente excluir o contrato "${title}"?`,
      type: "error",
      confirmText: "Excluir",
      onConfirm: async () => {
        if (!id) return;
        try {
          await deleteDoc(
            doc(
              db,
              "artifacts",
              appId,
              "companies",
              id,
              "contracts",
              contractId
            )
          );
        } catch (error) {
          console.error(error);
        }
      },
    });
    setIsConfirmOpen(true);
  };

  const handleAddLog = async (action: string, details: string) => {
    if (!id) return;
    try {
      await addDoc(
        collection(db, "artifacts", appId, "companies", id, "logs"),
        {
          action,
          details,
          user: "Master Admin",
          type: "info",
          createdAt: new Date().toISOString(),
        }
      );
    } catch (e) {}
  };

  // --- RENDERERS ---

  if (isLoading)
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  if (!company)
    return (
      <div className="h-96 flex flex-col items-center justify-center text-gray-500">
        <AlertCircle className="w-12 h-12 mb-2" />
        <p>Empresa não encontrada.</p>
      </div>
    );

  const usage = {
    msgs: Math.floor(Math.random() * (company.limits?.msgs || 1000)),
    users: users.length,
  };

  const renderOverviewTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-300">
      <div className="lg:col-span-8 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm h-fit relative">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-gray-800 dark:text-white flex flex items-center gap-2">
            Informações Gerais
            {isEditing && (
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                Editando
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                    company.status === "active"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                  }`}
                >
                  {company.status}
                </span>
                <button
                  onClick={() => {
                    setEditForm(JSON.parse(JSON.stringify(company)));
                    setIsEditing(true);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <Edit2 size={16} />
                </button>
              </>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="text-gray-400 hover:text-gray-600  dark:hover:text-gray-300"
                >
                  <X size={20} />
                </button>
                <button
                  onClick={handleSaveCompany}
                  className="text-indigo-600 hover:text-indigo-700"
                >
                  <Save size={20} />
                </button>
              </div>
            )}
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">
                  Nome da Empresa
                </label>
                <input
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm outline-none focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">
                    Tipo Documento
                  </label>
                  <select
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={editForm.documentType}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        documentType: e.target.value as any,
                      })
                    }
                  >
                    <option value="CNPJ">CNPJ</option>
                    <option value="CPF">CPF</option>
                  </select>
                </div>
                <div className="relative">
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">
                    {editForm.documentType || "Documento"}
                  </label>
                  <input
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm outline-none focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={editForm.document}
                    onChange={(e) =>
                      setEditForm({ ...editForm, document: e.target.value })
                    }
                    onBlur={(e) =>
                      editForm.documentType === "CNPJ" &&
                      fetchCNPJ(e.target.value)
                    }
                  />
                  {apiLoading && (
                    <Loader2
                      size={14}
                      className="absolute right-3 top-8 animate-spin text-indigo-600"
                    />
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">
                  Responsável
                </label>
                <input
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm outline-none focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={editForm.responsible}
                  onChange={(e) =>
                    setEditForm({ ...editForm, responsible: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
              <h4 className="text-sm font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                <MapPin size={14} /> Endereço
              </h4>
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-1">
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">
                    CEP
                  </label>
                  <input
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 text-sm outline-none focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={editForm.address?.cep}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        address: { ...editForm.address!, cep: e.target.value },
                      })
                    }
                    onBlur={(e) => fetchCEP(e.target.value)}
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">
                    Rua
                  </label>
                  <input
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 text-sm bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-white"
                    value={editForm.address?.street}
                    readOnly
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">
                    Número
                  </label>
                  <input
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 text-sm outline-none focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={editForm.address?.number}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        address: {
                          ...editForm.address!,
                          number: e.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">
                    Bairro
                  </label>
                  <input
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 text-sm bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-white"
                    value={editForm.address?.neighborhood}
                    readOnly
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">
                    Cidade
                  </label>
                  <input
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 text-sm bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-white"
                    value={editForm.address?.city}
                    readOnly
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">
                Nome da Empresa
              </label>
              <p className="text-lg font-medium text-gray-900 dark:text-white uppercase">
                {company.name}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">
                  {company.documentType || "CNPJ"}
                </label>
                <p className="text-gray-700">
                  {company.document || "Não informado"}
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">
                  Responsável
                </label>
                <p className="text-gray-700 capitalize">
                  {company.responsible}
                </p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">
                Contato
              </label>
              <p className="text-gray-700 dark:text-gray-300 mb-1">
                {company.email}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                {company.phone}
              </p>
            </div>
            {company.address && (
              <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2 flex items-center gap-1">
                  <MapPin size={12} /> Endereço
                </label>
                <p className="text-sm text-gray-700 dark:text-gray-300 uppercase">
                  {company.address.street}, {company.address.number}{" "}
                  {company.address.complement
                    ? `- ${company.address.complement}`
                    : ""}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300 uppercase">
                  {company.address.neighborhood} - {company.address.city}/
                  {company.address.state}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {company.address.cep}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Card Plano & Limites */}
      <div className="lg:col-span-4 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm h-fit">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-gray-800 dark:text-white">
            Plano & Limites
          </h3>
          <button
            onClick={() => {
              setSelectedPlan(company.plan);
              setIsPlanModalOpen(true);
            }}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
          >
            Alterar Plano
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">
              Plano Atual
            </label>
            <p className="text-2xl font-bold text-[#6C63FF]">{company.plan}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Renovação em {company.renewal}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium text-gray-600 dark:text-gray-400">
              <span>Mensagens</span>
              <span>
                {usage.msgs} / {company.limits?.msgs}
              </span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-[#6C63FF] h-full rounded-full"
                style={{
                  width: `${Math.min(
                    (usage.msgs / (company.limits?.msgs || 1)) * 100,
                    100
                  )}%`,
                }}
              ></div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium text-gray-600 dark:text-gray-400">
              <span>Atendentes</span>
              <span>
                {usage.users} / {company.limits?.users}
              </span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-green-500 h-full rounded-full"
                style={{
                  width: `${Math.min(
                    (usage.users / (company.limits?.users || 1)) * 100,
                    100
                  )}%`,
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Alterar Plano - Dinâmico */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
              <h3 className="font-bold text-gray-800 dark:text-white">
                Alterar Plano
              </h3>
              <button onClick={() => setIsPlanModalOpen(false)}>
                <X
                  size={20}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">
                  Selecione o Novo Plano
                </label>
                <div className="space-y-2">
                  {availablePlans.length > 0 ? (
                    availablePlans.map((plan) => (
                      <div
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan.name)}
                        className={`border rounded-lg p-3 cursor-pointer flex justify-between items-center transition-all ${
                          selectedPlan === plan.name
                            ? "border-[#6C63FF] bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-[#6C63FF]"
                            : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                        }`}
                      >
                        <div>
                          <p className="font-bold text-sm text-gray-900 dark:text-white">
                            {plan.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {plan.limits?.users} atendentes •{" "}
                            {plan.limits?.msgs} msgs
                          </p>
                        </div>
                        <p className="font-bold text-sm text-gray-700 dark:text-gray-300">
                          R$ {plan.priceMonthly}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Nenhum plano cadastrado.
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setIsPlanModalOpen(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdatePlan}
                className="px-4 py-2 bg-[#6C63FF] text-white rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-2"
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                Salvar Plano
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderUsersTab = () => (
    <div className="space-y-4 animate-in fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-bold text-gray-800 dark:text-white">
            Usuários da Empresa
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Gerencie quem tem acesso ao painel desta empresa.
          </p>
        </div>
        <button
          onClick={() => openUserModal()}
          className="bg-[#6C63FF] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm hover:bg-indigo-700 transition"
        >
          <Plus size={16} /> Novo Usuário
        </button>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden transition-colors">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-6 py-3 font-bold text-gray-500 dark:text-gray-400 uppercase text-xs">
                Nome
              </th>
              <th className="px-6 py-3 font-bold text-gray-500 dark:text-gray-400 uppercase text-xs">
                Email
              </th>
              <th className="px-6 py-3 font-bold text-gray-500 dark:text-gray-400 uppercase text-xs">
                Função
              </th>
              <th className="px-6 py-3 font-bold text-gray-500 dark:text-gray-400 uppercase text-xs">
                Status
              </th>
              <th className="px-6 py-3 font-bold text-gray-500 dark:text-gray-400 uppercase text-xs text-right">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {users.map((u) => (
              <tr
                key={u.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <td className="px-6 py-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                    {u.name.substring(0, 2).toUpperCase()}
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {u.name}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                  {u.email}
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-xs font-bold text-gray-600 dark:text-gray-300 uppercase">
                    {u.role === "admin"
                      ? "Administrador"
                      : u.role === "manager"
                      ? "Gerente"
                      : "Atendente"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-bold ${
                      u.status === "active"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}
                  >
                    {u.status === "active" ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="px-6 py-4 text-right flex justify-end gap-3">
                  <button
                    onClick={() => openUserModal(u)}
                    className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteUser(u.id, u.name)}
                    className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <p className="p-8 text-center text-gray-500 dark:text-gray-400">
            Nenhum usuário cadastrado.
          </p>
        )}
      </div>
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 border border-gray-100 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
              <h3 className="font-bold text-gray-800 dark:text-white">
                {editingUserId ? "Editar Usuário" : "Novo Usuário"}
              </h3>
              <button onClick={() => setIsUserModalOpen(false)}>
                <X
                  size={20}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={userForm.name}
                  onChange={(e) =>
                    setUserForm({ ...userForm, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                  Email de Acesso
                </label>
                <input
                  type="email"
                  className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={userForm.email}
                  onChange={(e) =>
                    setUserForm({ ...userForm, email: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                    Função
                  </label>
                  <select
                    className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={userForm.role}
                    onChange={(e) =>
                      setUserForm({ ...userForm, role: e.target.value as any })
                    }
                  >
                    <option value="agent">Atendente</option>
                    <option value="manager">Gerente</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                    Status
                  </label>
                  <select
                    className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={userForm.status}
                    onChange={(e) =>
                      setUserForm({
                        ...userForm,
                        status: e.target.value as any,
                      })
                    }
                  >
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveUser}
                className="px-4 py-2 bg-[#6C63FF] text-white rounded-lg text-sm font-bold hover:bg-indigo-700"
              >
                Salvar Usuário
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderContractsTab = () => (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-bold text-gray-800 dark:text-white text-lg">
            Contratos
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Documentos legais e acordos firmados com este cliente.
          </p>
        </div>
        <button
          onClick={() => setIsContractModalOpen(true)}
          className="bg-[#6C63FF] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 transition shadow-sm"
        >
          <Plus size={16} /> Novo Contrato
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden transition-colors">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-6 py-3 font-bold text-gray-500 dark:text-gray-400 uppercase text-xs">
                Título
              </th>
              <th className="px-6 py-3 font-bold text-gray-500 dark:text-gray-400 uppercase text-xs">
                Status
              </th>
              <th className="px-6 py-3 font-bold text-gray-500 dark:text-gray-400 uppercase text-xs">
                Data Assinatura
              </th>
              <th className="px-6 py-3 font-bold text-gray-500 dark:text-gray-400 uppercase text-xs text-right">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {contracts.map((contract) => (
              <tr
                key={contract.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <FileCheck size={18} className="text-green-500" />
                  <div>
                    <p>{contract.title}</p>
                    {contract.fileName && (
                      <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">
                        {contract.fileName}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                      contract.status === "active"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {contract.status === "active" ? "Vigente" : "Expirado"}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                  {contract.signedAt
                    ? new Date(contract.signedAt).toLocaleDateString("pt-BR")
                    : "-"}
                </td>
                <td className="px-6 py-4 text-right flex justify-end gap-2">
                  <button
                    onClick={() => handleViewContract(contract.url)}
                    className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                    title="Visualizar"
                  >
                    <Eye size={18} />
                  </button>
                  <button
                    onClick={() =>
                      handleDownloadContract(contract.url, contract.fileName)
                    }
                    className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded"
                    title="Baixar"
                  >
                    <Download size={18} />
                  </button>
                  <button
                    onClick={() =>
                      handleDeleteContract(contract.id, contract.title)
                    }
                    className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                    title="Excluir"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {contracts.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="p-12 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50"
                >
                  <FileText className="mx-auto mb-2 text-gray-300" size={32} />
                  <p>Nenhum contrato vinculado.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Novo Contrato */}
      {isContractModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 border border-gray-100 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
              <h3 className="font-bold text-gray-800 dark:text-white">
                Novo Contrato
              </h3>
              <button onClick={() => setIsContractModalOpen(false)}>
                <X
                  size={20}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                  Título do Documento
                </label>
                <input
                  type="text"
                  className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Ex: Contrato de Prestação de Serviços 2024"
                  value={newContractTitle}
                  onChange={(e) => setNewContractTitle(e.target.value)}
                  autoFocus
                />
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition group ${
                  selectedFile
                    ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                    : "border-gray-300 dark:border-gray-600 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".pdf,.doc,.docx"
                />
                <UploadCloud
                  className={`mx-auto mb-2 ${
                    selectedFile
                      ? "text-green-600"
                      : "text-gray-400 group-hover:text-indigo-500"
                  }`}
                  size={32}
                />
                {selectedFile ? (
                  <div>
                    <p className="text-sm font-medium text-green-700 dark:text-green-400 break-all">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-green-500 mt-1">
                      Pronto para enviar
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-indigo-700 dark:group-hover:text-indigo-400">
                      Clique para fazer upload
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      PDF, DOCX (Max 5MB)
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setIsContractModalOpen(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddContract}
                disabled={!newContractTitle || !selectedFile}
                className="px-4 py-2 bg-[#6C63FF] text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Adicionar Contrato
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderWhatsAppTab = () => (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          Conexão WhatsApp
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Gerencie as instâncias conectadas à API oficial ou Baileys.
        </p>
      </div>
      <div className="flex justify-end">
        <button
          onClick={() => setIsInstanceModalOpen(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-green-700 transition shadow-sm"
        >
          <Plus size={16} /> Nova Instância
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {instances.map((inst) => (
          <div
            key={inst.id}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden relative transition-colors"
          >
            <div
              className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                inst.status === "CONNECTED"
                  ? "bg-green-500"
                  : inst.status === "QRCODE"
                  ? "bg-yellow-500"
                  : "bg-red-500"
              }`}
            ></div>
            <div className="p-6 pl-8">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      inst.status === "CONNECTED"
                        ? "bg-green-100 dark:bg-green-900/30 text-green-600"
                        : "bg-red-100 dark:bg-red-900/30 text-red-600"
                    }`}
                  >
                    <Smartphone size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white uppercase">
                      {inst.name}
                    </h3>
                    <p className="text-xs text-gray-400 font-mono">
                      {inst.id.substring(0, 15)}...
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteInstance(inst.id, inst.name)}
                  className="text-gray-300 hover:text-red-500 transition"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="flex flex-col items-center justify-center py-4 space-y-3">
                {inst.status === "CONNECTED" ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center border-4 border-green-50">
                      <CheckCircle2 size={32} className="text-green-600" />
                    </div>
                    <p className="text-xl font-bold text-gray-800 dark:text-gray-100 tracking-wide">
                      {inst.phoneNumber || "Conectado"}
                    </p>
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                      Bateria: {inst.batteryLevel || 100}%
                    </span>
                  </>
                ) : inst.status === "QRCODE" && inst.qrCodeBase64 ? (
                  <div className="flex flex-col items-center animate-in fade-in">
                    <p className="text-sm text-gray-500 mb-2">
                      Escaneie o QR Code:
                    </p>
                    <img
                      src={inst.qrCodeBase64}
                      alt="QR Code"
                      className="w-48 h-48 border-4 border-white shadow-lg rounded-lg"
                    />
                    <p className="text-xs text-yellow-600 mt-2 font-medium bg-yellow-50 px-2 py-1 rounded">
                      Aguardando leitura...
                    </p>
                  </div>
                ) : inst.status === "PAIRING" ? (
                  <div className="flex flex-col items-center py-8">
                    <Loader2
                      size={40}
                      className="animate-spin text-indigo-600 mb-2"
                    />
                    <p className="text-sm text-gray-500">Gerando sessão...</p>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center border-4 border-red-50">
                      <Power size={32} className="text-red-600" />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                      Desconectado
                    </p>
                  </>
                )}
              </div>

              <button
                onClick={() => handleManageInstance(inst)}
                className={`w-full mt-4 py-2.5 rounded-lg text-sm font-bold border transition flex items-center justify-center gap-2 ${
                  inst.status === "CONNECTED"
                    ? "border-red-100 text-red-600 hover:bg-red-50"
                    : "border-green-100 text-green-600 hover:bg-green-50"
                }`}
              >
                <Power size={16} />
                {inst.status === "CONNECTED"
                  ? "Desconectar"
                  : "Conectar Instância"}
              </button>
            </div>
          </div>
        ))}
        {instances.length === 0 && (
          <div className="col-span-full p-12 text-center bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-gray-400">
            Nenhuma instância encontrada.
          </div>
        )}
      </div>

      {/* Modais (Instance, User, Invoice, Plan, Contract, Confirm) mantidos como no original, apenas fechando as tags corretamente */}
      {isInstanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl p-6 border border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-gray-800 dark:text-white mb-4">
              Nova Instância
            </h3>
            <input
              type="text"
              className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4"
              placeholder="Ex: Vendas Principal"
              value={newInstanceName}
              onChange={(e) => setNewInstanceName(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsInstanceModalOpen(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddInstance}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700"
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
        onConfirm={confirmConfig.onConfirm}
        confirmText={confirmConfig.confirmText}
      />
    </div>
  );

  const renderModulesTab = () => (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-bold text-gray-800 dark:text-white text-lg">
            Módulos Contratados
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Ative ou desative funcionalidades.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {availableModules.map((mod) => {
          const isActive = company?.modules?.[mod.id] || false;
          return (
            <div
              key={mod.id}
              className={`p-4 rounded-xl border transition-all ${
                isActive
                  ? "border-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/20"
                  : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      isActive
                        ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    <Box size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 dark:text-white">
                      {mod.name}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {mod.description}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => toggleModule(mod.id, isActive)}
                  className={`text-2xl transition-colors ${
                    isActive
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-gray-300 dark:text-gray-600"
                  }`}
                >
                  {isActive ? (
                    <ToggleRight size={32} />
                  ) : (
                    <ToggleLeft size={32} />
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderFinanceTab = () => (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-bold text-gray-800 dark:text-white text-lg">
            Histórico Financeiro
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Faturas geradas e status de pagamento.
          </p>
        </div>
        <button
          onClick={() => openInvoiceModal()}
          className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <Plus size={16} /> Nova Cobrança
        </button>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden transition-colors">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 font-medium border-b border-gray-100 dark:border-gray-700">
            <tr>
              <th className="p-4">Fatura</th>
              <th className="p-4">Vencimento</th>
              <th className="p-4">Valor</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {invoices.map((inv) => (
              <tr
                key={inv.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <td className="p-4 font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText size={16} className="text-gray-400" /> {inv.id}
                </td>
                <td className="p-4 text-gray-600 dark:text-gray-300">
                  {new Date(inv.dueDate).toLocaleDateString("pt-BR")}
                </td>
                <td className="p-4 font-bold text-gray-800 dark:text-white">
                  R$ {inv.amount.toFixed(2)}
                </td>
                <td className="p-4">
                  <span
                    className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                      inv.status === "PAID"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : inv.status === "PENDING"
                        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}
                  >
                    {inv.status === "PAID"
                      ? "Pago"
                      : inv.status === "PENDING"
                      ? "Pendente"
                      : "Atrasado"}
                  </span>
                </td>
                <td className="p-4 text-right flex justify-end gap-2">
                  <button
                    onClick={() => openInvoiceModal(inv)}
                    className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={handleDownloadInvoice}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition"
                  >
                    <Download size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="p-8 text-center text-gray-500 dark:text-gray-400"
                >
                  Nenhuma fatura encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 border border-gray-100 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
              <h3 className="font-bold text-gray-800 dark:text-white">
                {editingInvoiceId ? "Editar Fatura" : "Nova Fatura"}
              </h3>
              <button onClick={() => setIsInvoiceModalOpen(false)}>
                <X
                  size={20}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Valor (R$)
                </label>
                <input
                  type="number"
                  className="w-full border dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:border-indigo-500"
                  value={invoiceForm.amount}
                  onChange={(e) =>
                    setInvoiceForm({
                      ...invoiceForm,
                      amount: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Vencimento
                </label>
                <input
                  type="date"
                  className="w-full border dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:border-indigo-500"
                  value={invoiceForm.dueDate}
                  onChange={(e) =>
                    setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Status
                </label>
                <select
                  className="w-full border dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:border-indigo-500"
                  value={invoiceForm.status}
                  onChange={(e) =>
                    setInvoiceForm({
                      ...invoiceForm,
                      status: e.target.value as any,
                    })
                  }
                >
                  <option value="PENDING">Pendente</option>
                  <option value="PAID">Pago</option>
                  <option value="OVERDUE">Atrasado</option>
                </select>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 flex justify-end gap-2 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setIsInvoiceModalOpen(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveInvoice}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderUsageTab = () => (
    <div className="space-y-6 animate-in fade-in">
      <div>
        <h3 className="font-bold text-gray-800 dark:text-white text-lg">
          Consumo e Métricas
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Acompanhe o uso de recursos deste cliente.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
          <div className="flex items-center gap-2 mb-2 text-gray-500 dark:text-gray-400 text-sm font-medium">
            <MessageSquare size={16} /> Mensagens Enviadas
          </div>
          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            45.2k
          </p>
          <p className="text-xs text-gray-400">Últimos 30 dias</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
          <div className="flex items-center gap-2 mb-2 text-gray-500 dark:text-gray-400 text-sm font-medium">
            <User size={16} /> Contatos Ativos
          </div>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            8.450
          </p>
          <p className="text-xs text-gray-400">+120 esta semana</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
          <div className="flex items-center gap-2 mb-2 text-gray-500 dark:text-gray-400 text-sm font-medium">
            <Activity size={16} /> Taxa de Entrega
          </div>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            98.2%
          </p>
          <p className="text-xs text-gray-400">Estável</p>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
        <h4 className="font-bold text-gray-800 dark:text-white mb-4">
          Volume de Mensagens (Diário)
        </h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={usageData}>
              <defs>
                <linearGradient id="colorMsgs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#9ca3af" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#9ca3af" }}
              />
              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                stroke="#f3f4f6"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: chartTheme.tooltipBg,
                  borderColor: chartTheme.tooltipBorder,
                  color: chartTheme.tooltipText,
                  borderRadius: "8px",
                }}
                itemStyle={{ color: chartTheme.tooltipText }}
              />
              <Area
                type="monotone"
                dataKey="msgs"
                stroke="#6366f1"
                fillOpacity={1}
                fill="url(#colorMsgs)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const renderLogsTab = () => (
    <div className="space-y-6 animate-in fade-in">
      <div>
        <h3 className="font-bold text-gray-800 dark:text-white text-lg">
          Logs de Auditoria
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Registro de atividades e alterações nesta conta.
        </p>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden transition-colors">
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {logs.map((log) => (
            <div
              key={log.id}
              className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex gap-4 items-start"
            >
              <div
                className={`mt-1 p-2 rounded-full ${
                  log.type === "warning"
                    ? "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
                    : log.type === "error"
                    ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                    : "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                }`}
              >
                <Activity size={16} />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {log.action}
                  </h4>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString("pt-BR")}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                  {log.details}
                </p>
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <User size={10} /> {log.user}
                </p>
              </div>
            </div>
          ))}
          {logs.length === 0 && (
            <p className="p-8 text-center text-gray-500 dark:text-gray-400">
              Nenhum registro encontrado.
            </p>
          )}
        </div>
      </div>
    </div>
  );

  // --- Switch Principal ---

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return renderOverviewTab();
      case "users":
        return renderUsersTab();
      case "whatsapp":
        return renderWhatsAppTab();
      case "modules":
        return renderModulesTab();
      case "finance":
        return renderFinanceTab();
      case "usage":
        return renderUsageTab();
      case "logs":
        return renderLogsTab();
      case "contracts":
        return renderContractsTab();
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Fixo */}
      <div className="flex items-center gap-4">
        <Link
          to="/admin/companies"
          className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 transition shadow-sm"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase">
            {company.name}
          </h1>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                company.status === "active" ? "bg-green-500" : "bg-gray-300"
              }`}
            ></div>
            <span className="capitalize">
              {company.status === "active" ? "Ativo" : company.status}
            </span>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
              ID: {company.id}
            </span>
          </div>
        </div>
      </div>

      {/* Navegação */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 rounded-t-xl shadow-sm transition-colors">
        <nav className="flex space-x-8 overflow-x-auto custom-scrollbar">
          {[
            { id: "overview", label: "Visão Geral", icon: Shield },
            { id: "users", label: "Usuários", icon: User },
            { id: "whatsapp", label: "Instância WA", icon: MessageSquare },
            { id: "modules", label: "Módulos", icon: Box },
            { id: "finance", label: "Faturas", icon: FileText },
            { id: "usage", label: "Consumo", icon: Activity },
            { id: "logs", label: "Logs", icon: Zap },
            { id: "contracts", label: "Contrato", icon: FileText },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "border-[#6C63FF] text-[#6C63FF]"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="min-h-[400px]">{renderTabContent()}</div>

      {/* Modal de Confirmação - Global para todas as tabs */}
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

export default AdminCompanyDetail;
