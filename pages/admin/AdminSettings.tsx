import React, { useState, useEffect, useRef } from "react";
import {
  Save,
  Globe,
  Lock,
  Mail,
  Database,
  AlertOctagon,
  Clock,
  Smartphone,
  Palette,
  Server,
  UploadCloud,
  RefreshCw,
  Check,
  Loader2,
  Eye,
  EyeOff,
  Download,
  AlertCircle,
  Send, // <--- Adicionei Send aqui
} from "lucide-react";
import { db, appId } from "../../lib/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import ConfirmModal, { ConfirmModalType } from "../../components/ConfirmModal";

// --- Interfaces ---
interface SystemSettings {
  identity: {
    name: string;
    domain: string;
    logo: string;
    darkLogo: string;
    favicon: string;
  };
  smtp: {
    host: string;
    port: number;
    user: string;
    pass: string;
    sender: string;
  };
  security: {
    sessionTimeout: string;
    strongPassword: boolean;
    require2FA: boolean;
    googleLogin: boolean;
  };
  general: {
    language: string;
    timezone: string;
    dateFormat: string;
    currency: string;
  };
  backup: {
    enabled: boolean;
    retention: string;
  };
  maintenance: {
    enabled: boolean;
    description: string;
  };
  trial: {
    days: number;
    plan: string;
  };
  notifications: {
    email: string;
    events: {
      newClient: boolean;
      payment: boolean;
      offline: boolean;
      ticket: boolean;
    };
  };
  api: {
    url: string;
    key: string;
  };
}

// Estado Inicial Padrão (Garante que nada seja undefined)
const defaultSettings: SystemSettings = {
  identity: {
    name: "BidFlow",
    domain: "app.bidflow.com",
    logo: "/assets/logo-1200.png", // NOVA LOGO PADRÃO AQUI
    darkLogo: "/assets/logo-1200.png",
    favicon: "/assets/icon-seta.png",
  },
  smtp: {
    host: "smtp.gmail.com",
    port: 587,
    user: "",
    pass: "",
    sender: "BidFlow <no-reply@bidflow.com>",
  },
  security: {
    sessionTimeout: "4h",
    strongPassword: true,
    require2FA: false,
    googleLogin: true,
  },
  general: {
    language: "pt-BR",
    timezone: "America/Sao_Paulo",
    dateFormat: "DD/MM/YYYY",
    currency: "BRL",
  },
  backup: { enabled: true, retention: "30" },
  maintenance: {
    enabled: false,
    description: "Sistema em manutenção programada. Voltamos em breve.",
  },
  trial: { days: 7, plan: "Pro" },
  notifications: {
    email: "admin@bidflow.com",
    events: { newClient: true, payment: true, offline: true, ticket: true },
  },
  api: { url: "https://api.bidflow.com", key: "sk_live_default" },
};

const AdminSettings = () => {
  // Inicia com o padrão para evitar tela branca instantânea
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Confirm Modal State
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
      onConfirm: () => {
        onConfirm();
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

  // Refs para Upload
  const logoInputRef = useRef<HTMLInputElement>(null);
  const darkLogoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  // 1. Carregar Configurações com Fusão Defensiva
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(
          db,
          "artifacts",
          appId,
          "settings",
          "general_config"
        );
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as Partial<SystemSettings>;

          // FUSÃO SEGURA (DEEP MERGE MANUAL)
          // Previne o erro "cannot read property of undefined"
          setSettings((prev) => ({
            ...prev,
            ...data,
            identity: { ...prev.identity, ...(data.identity || {}) },
            smtp: { ...prev.smtp, ...(data.smtp || {}) },
            security: { ...prev.security, ...(data.security || {}) },
            general: { ...prev.general, ...(data.general || {}) },
            backup: { ...prev.backup, ...(data.backup || {}) },
            maintenance: { ...prev.maintenance, ...(data.maintenance || {}) },
            trial: { ...prev.trial, ...(data.trial || {}) },
            notifications: {
              email: data.notifications?.email || prev.notifications.email,
              events: {
                ...prev.notifications.events,
                ...(data.notifications?.events || {}),
              },
            },
            api: { ...prev.api, ...(data.api || {}) },
          }));
        } else {
          // Se não existe, salva o padrão para criar o documento
          const init = {
            ...defaultSettings,
            api: {
              ...defaultSettings.api,
              key: "sk_live_" + Math.random().toString(36).substring(7),
            },
          };
          await setDoc(docRef, init);
          setSettings(init);
        }
      } catch (error: any) {
        console.error("Erro ao carregar configs:", error);
        if (error.code === "permission-denied") {
          setError(
            "Sem permissão. Verifique as regras do Firebase para 'settings'."
          );
        } else {
          setError("Erro ao carregar configurações.");
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // 2. Handlers
  const handleChange = (
    section: keyof SystemSettings,
    field: string,
    value: any
  ) => {
    setSettings((prev) => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }));
  };

  const handleNestedChange = (
    section: keyof SystemSettings,
    subSection: string,
    field: string,
    value: any
  ) => {
    setSettings((prev) => {
      const currentSection = prev[section] as any;
      // Garante que a subseção existe antes de acessar
      const currentSubSection = currentSection
        ? currentSection[subSection] || {}
        : {};

      return {
        ...prev,
        [section]: {
          ...currentSection,
          [subSection]: {
            ...currentSubSection,
            [field]: value,
          },
        },
      };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateDoc(
        doc(db, "artifacts", appId, "settings", "general_config"),
        settings
      );
      showAlert("Sucesso", "Configurações salvas com sucesso!", "success");
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      showAlert("Erro", `Erro ao salvar: ${error.message}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerateKey = () => {
    showConfirm(
      "Regenerar Chave Interna",
      "Isso invalidará a chave anterior. Tem certeza que deseja continuar?",
      () => {
        handleChange(
          "api",
          "key",
          "sk_live_" + Math.random().toString(36).substring(2)
        );
      },
      "warning"
    );
  };

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: string
  ) => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      handleChange("identity", field, url);
    }
  };

  const handleTestEmail = () => {
    showAlert(
      "Teste de Email",
      `Enviando e-mail de teste para ${settings.smtp?.user || "admin"}...`,
      "info"
    );
  };

  const handleExportData = () => {
    showAlert(
      "Exportação",
      "Exportação iniciada. O download começará em breve.",
      "info"
    );
  };

  if (isLoading)
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin text-indigo-600 w-10 h-10" />
      </div>
    );

  if (error)
    return (
      <div className="flex flex-col justify-center items-center h-screen text-red-600 gap-4">
        <AlertCircle className="w-12 h-12" />
        <p className="text-lg font-bold">Erro</p>
        <p>{error}</p>
        <p className="text-sm text-gray-500">
          Verifique o console (F12) e as Regras do Firestore.
        </p>
      </div>
    );

  // Proteção Final contra renderização de undefined
  if (!settings || !settings.identity) return null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      <div className="flex justify-between items-center sticky top-0 bg-gray-100 z-10 py-4 border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700 mb-4 transition-colors">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Configurações do Sistema
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Gerencie todos os aspectos globais do seu SaaS.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-[#6C63FF] text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 dark:shadow-none flex items-center gap-2 disabled:opacity-70"
        >
          {isSaving ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Save size={20} />
          )}
          {isSaving ? "Salvando..." : "Salvar Alterações"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* 01 — Identidade do SaaS */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-8 transition-colors">
          <h3 className="text-xl font-bold text-gray-800 dark:bg-gray-800 dark:text-white flex items-center gap-2 mb-6 pb-2 border-b border-gray-100 dark:border-gray-700">
            <Palette size={24} className="text-indigo-600" /> Identidade do SaaS
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 dark:bg-gray-800 text-gray-800 dark:text-white mb-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Nome do SaaS
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={settings.identity?.name || ""}
                onChange={(e) =>
                  handleChange("identity", "name", e.target.value)
                }
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Domínio
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={settings.identity?.domain || ""}
                onChange={(e) =>
                  handleChange("identity", "domain", e.target.value)
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Upload Logo */}
            <div
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition cursor-pointer"
              onClick={() => logoInputRef.current?.click()}
            >
              <input
                type="file"
                className="hidden"
                ref={logoInputRef}
                onChange={(e) => handleFileUpload(e, "logo")}
                accept="image/*"
              />
              {settings.identity?.logo ? (
                <img
                  src={settings.identity.logo}
                  alt="Logo"
                  className="h-12 mx-auto object-contain"
                />
              ) : (
                <div className="flex flex-col items-center text-gray-400 dark:text-gray-500">
                  <UploadCloud size={32} className="mb-2" />
                  <span className="text-sm font-medium">Logo Principal</span>
                </div>
              )}
            </div>
            {/* Upload Dark Logo */}
            <div
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition cursor-pointer bg-gray-900"
              onClick={() => darkLogoInputRef.current?.click()}
            >
              <input
                type="file"
                className="hidden"
                ref={darkLogoInputRef}
                onChange={(e) => handleFileUpload(e, "darkLogo")}
                accept="image/*"
              />
              {settings.identity?.darkLogo ? (
                <img
                  src={settings.identity.darkLogo}
                  alt="Dark Logo"
                  className="h-12 mx-auto object-contain"
                />
              ) : (
                <div className="flex flex-col items-center text-gray-500">
                  <UploadCloud size={32} className="mb-2" />
                  <span className="text-sm font-medium">Logo Dark Mode</span>
                </div>
              )}
            </div>
            {/* Upload Favicon */}
            <div
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition cursor-pointer"
              onClick={() => faviconInputRef.current?.click()}
            >
              <input
                type="file"
                className="hidden"
                ref={faviconInputRef}
                onChange={(e) => handleFileUpload(e, "favicon")}
                accept="image/*"
              />
              {settings.identity?.favicon ? (
                <img
                  src={settings.identity.favicon}
                  alt="Favicon"
                  className="h-8 mx-auto object-contain"
                />
              ) : (
                <div className="flex flex-col items-center text-gray-400 dark:text-gray-500">
                  <UploadCloud size={32} className="mb-2" />
                  <span className="text-sm font-medium">Favicon</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 02 — SMTP */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-8 transition-colors">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-6 pb-2 border-b border-gray-100 dark:border-gray-700">
            <Mail size={24} className="text-indigo-600" /> Configurações de
            E-mail (SMTP)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Host SMTP
              </label>
              <input
                type="text"
                placeholder="smtp.gmail.com"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={settings.smtp?.host || ""}
                onChange={(e) => handleChange("smtp", "host", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Porta
              </label>
              <input
                type="number"
                placeholder="587"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={settings.smtp?.port || ""}
                onChange={(e) =>
                  handleChange("smtp", "port", parseInt(e.target.value))
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Usuário
              </label>
              <input
                type="text"
                placeholder="email@dominio.com"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={settings.smtp?.user || ""}
                onChange={(e) => handleChange("smtp", "user", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Senha / Token
              </label>
              <div className="relative">
                <input
                  type={showSmtpPass ? "text" : "password"}
                  placeholder="•••••••"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={settings.smtp?.pass || ""}
                  onChange={(e) => handleChange("smtp", "pass", e.target.value)}
                />
                <button
                  onClick={() => setShowSmtpPass(!showSmtpPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  {showSmtpPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              Remetente Padrão
            </label>
            <input
              type="text"
              placeholder='"BidFlow" <no-reply@bidflow.com>'
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              value={settings.smtp?.sender || ""}
              onChange={(e) => handleChange("smtp", "sender", e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleTestEmail}
              className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium flex items-center gap-2"
            >
              <Send size={16} /> Testar Envio
            </button>
          </div>
        </div>

        {/* 03 — Segurança */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-8 transition-colors">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-6 pb-2 border-b border-gray-100 dark:border-gray-700">
            <Lock size={24} className="text-indigo-600" /> Segurança do Sistema
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Tempo Máximo de Sessão
              </label>
              <select
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={settings.security?.sessionTimeout || "4h"}
                onChange={(e) =>
                  handleChange("security", "sessionTimeout", e.target.value)
                }
              >
                <option value="30m">30 minutos</option>
                <option value="1h">1 hora</option>
                <option value="4h">4 horas</option>
                <option value="12h">12 horas</option>
                <option value="24h">24 horas</option>
              </select>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Forçar Senha Forte
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings.security?.strongPassword || false}
                    onChange={(e) =>
                      handleChange(
                        "security",
                        "strongPassword",
                        e.target.checked
                      )
                    }
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-900 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600x"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Exigir 2FA (Equipe)
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings.security?.require2FA || false}
                    onChange={(e) =>
                      handleChange("security", "require2FA", e.target.checked)
                    }
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-900 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Login Google
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings.security?.googleLogin || false}
                    onChange={(e) =>
                      handleChange("security", "googleLogin", e.target.checked)
                    }
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-900 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* 04 — Geral */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-8 transition-colors">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-6 pb-2 border-b border-gray-100 dark:border-gray-700">
            <Globe size={24} className="text-indigo-600" /> Configurações Gerais
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Idioma
              </label>
              <select
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={settings.general?.language || "pt-BR"}
                onChange={(e) =>
                  handleChange("general", "language", e.target.value)
                }
              >
                <option value="pt-BR">Português (BR)</option>
                <option value="en-US">English (US)</option>
                <option value="es">Español</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Fuso Horário
              </label>
              <select
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={settings.general?.timezone || "America/Sao_Paulo"}
                onChange={(e) =>
                  handleChange("general", "timezone", e.target.value)
                }
              >
                <option value="America/Sao_Paulo">Brasília (GMT-3)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Data
              </label>
              <select
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={settings.general?.dateFormat || "DD/MM/YYYY"}
                onChange={(e) =>
                  handleChange("general", "dateFormat", e.target.value)
                }
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Moeda
              </label>
              <select
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={settings.general?.currency || "BRL"}
                onChange={(e) =>
                  handleChange("general", "currency", e.target.value)
                }
              >
                <option value="BRL">Real (BRL)</option>
                <option value="USD">Dólar (USD)</option>
                <option value="EUR">Euro (EUR)</option>
              </select>
            </div>
          </div>
        </div>

        {/* 05 — Backup */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-8 transition-colors">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-6 pb-2 border-b border-gray-100 dark:border-gray-700">
            <Database size={24} className="text-indigo-600" /> Backup & Dados
          </h3>
          <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600">
            <div>
              <p className="font-bold text-gray-800 dark:text-white">
                Backup Diário Automático
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Realiza cópia de segurança do banco às 00:00.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.backup?.enabled || false}
                onChange={(e) =>
                  handleChange("backup", "enabled", e.target.checked)
                }
              />
              <div className="w-14 h-7 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"></div>
            </label>
          </div>
          <div className="flex items-end justify-between gap-4">
            <div className="w-full md:w-1/3">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Retenção (Dias)
              </label>
              <select
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={settings.backup?.retention || "30"}
                onChange={(e) =>
                  handleChange("backup", "retention", e.target.value)
                }
              >
                <option value="7">7 dias</option>
                <option value="14">14 dias</option>
                <option value="30">30 dias</option>
                <option value="90">90 dias</option>
              </select>
            </div>
            <button
              onClick={handleExportData}
              className="bw-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-whiteborder border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 px-6 py-2.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 font-medium flex items-center gap-2 transition-colors"
            >
              <Download size={18} /> Exportar Relatório Completo
            </button>
          </div>
        </div>

        {/* 06 — Manutenção */}
        <div className="bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/30 shadow-sm p-8 transition-colors">
          <h3 className="text-xl font-bold text-red-800 dark:text-red-400 flex items-center gap-2 mb-4">
            <AlertOctagon size={24} /> Modo Manutenção
          </h3>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-red-700 dark:text-red-300 text-sm max-w-2xl">
                Ao ativar, o acesso de TODOS os clientes será bloqueado e uma
                página de manutenção será exibida. Apenas admins (equipe
                interna) terão acesso.
              </p>
              {settings.maintenance?.enabled && (
                <input
                  type="text"
                  className="mt-4 w-full border border-red-200 dark:border-red-800 rounded-lg px-4 py-2 text-sm text-red-800 dark:text-red-300 bg-white dark:bg-red-900/20"
                  value={settings.maintenance.description || ""}
                  onChange={(e) =>
                    handleChange("maintenance", "description", e.target.value)
                  }
                />
              )}
            </div>
            <label className="relative inline-flex items-center cursor-pointer mt-2">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.maintenance?.enabled || false}
                onChange={(e) =>
                  handleChange("maintenance", "enabled", e.target.checked)
                }
              />
              <div className="w-14 h-7 bg-gray-300 dark:bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-red-600"></div>
            </label>
          </div>
        </div>

        {/* 07 — Regras de Trial */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-8 transition-colors">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-6 pb-2 border-b border-gray-100 dark:border-gray-700">
            <Clock size={24} className="text-indigo-600" /> Regras de Trial
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Dias de Teste Grátis
              </label>
              <input
                type="number"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={settings.trial?.days || 7}
                onChange={(e) =>
                  handleChange("trial", "days", parseInt(e.target.value))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Plano Padrão do Trial
              </label>
              <select
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={settings.trial?.plan || "Pro"}
                onChange={(e) => handleChange("trial", "plan", e.target.value)}
              >
                <option value="Starter">Starter</option>
                <option value="Pro">Pro</option>
                <option value="Enterprise">Enterprise</option>
              </select>
            </div>
          </div>
        </div>

        {/* 08 — Notificações */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-8 transition-colors">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-6 pb-2 border-b border-gray-100 dark:border-gray-700">
            <Smartphone size={24} className="text-indigo-600" /> Notificações do
            Sistema
          </h3>
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              E-mail para Notificações
            </label>
            <input
              type="email"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              value={settings.notifications?.email || ""}
              onChange={(e) =>
                handleChange("notifications", "email", e.target.value)
              }
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: "newClient", label: "Novo cliente criado" },
              { key: "payment", label: "Pagamento realizado" },
              { key: "offline", label: "Instância WhatsApp offline" },
              { key: "ticket", label: "Novo ticket de suporte" },
            ].map((item) => (
              <label
                key={item.key}
                className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <input
                  type="checkbox"
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-5 w-5"
                  checked={
                    settings.notifications?.events
                      ? (settings.notifications.events as any)[item.key]
                      : false
                  }
                  onChange={(e) =>
                    handleNestedChange(
                      "notifications",
                      "events",
                      item.key,
                      e.target.checked
                    )
                  }
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {item.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* 09 — APIs Internas */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-8 transition-colors">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-6">
            <Server size={24} className="text-gray-600 dark:text-gray-400" />{" "}
            APIs Internas
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                URL Base da API
              </label>
              <div className="bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg px-4 py-3 font-mono text-sm text-gray-600 dark:text-gray-300">
                {settings.api?.url || ""}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                Chave Interna (Secret Key)
              </label>
              <div className="flex gap-2">
                <div className="bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg px-4 py-3 font-mono text-sm text-gray-600 dark:text-gray-300 flex-1 truncate">
                  {settings.api?.key || ""}
                </div>
                <button
                  onClick={handleRegenerateKey}
                  className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                  title="Regenerar Chave"
                >
                  <RefreshCw size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Modal */}
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

export default AdminSettings;
