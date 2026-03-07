import React, { useState } from "react";
import {
  FileText,
  FileSpreadsheet,
  Download,
  Calendar as CalendarIcon,
  Loader2,
  AlertCircle,
  BarChart,
  Truck,
  CreditCard,
} from "lucide-react";
import { apiFetchBlob } from "../../lib/api";
import ConfirmModal, { ConfirmModalType } from "../../components/ConfirmModal";

const Reports = () => {
  const [activeTab, setActiveTab] = useState<"finance" | "sales" | "inventory">("finance");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingExcel, setLoadingExcel] = useState(false);

  // Modal State
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    type: ConfirmModalType;
  }>({
    title: "",
    message: "",
    type: "info",
  });

  const showAlert = (title: string, message: string, type: ConfirmModalType = "info") => {
    setConfirmConfig({ title, message, type });
    setIsConfirmOpen(true);
  };

  const handleDownload = async (format: "pdf" | "excel") => {
    if (format === "pdf") setLoadingPdf(true);
    else setLoadingExcel(true);

    try {
      const endpointMap: Record<string, string> = {
        finance: "/reports/finance/",
        sales: "/reports/sales/",
        inventory: "/reports/inventory/",
      };

      const queryParams = new URLSearchParams({ format });
      if (startDate) queryParams.append("start_date", startDate);
      if (endDate) queryParams.append("end_date", endDate);

      const url = `${endpointMap[activeTab]}?${queryParams.toString()}`;

      const blob = await apiFetchBlob(url, { method: "GET" });

      // Criação de URL temporário
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      const extension = format === "pdf" ? "pdf" : "xlsx";
      a.download = `relatorio_${activeTab}_${new Date().toISOString().split("T")[0]}.${extension}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);

      showAlert("Sucesso", `O relatório em ${format.toUpperCase()} foi transferido.`, "success");
    } catch (e: any) {
      console.error(e);
      showAlert("Erro", "Não foi possível gerar o relatório. Verifique se o backend está a correr corretamente.", "error");
    } finally {
      setLoadingPdf(false);
      setLoadingExcel(false);
    }
  };

  const renderTabContent = () => {
    let title = "";
    let description = "";

    if (activeTab === "finance") {
      title = "Relatório Financeiro";
      description = "Extraia todas as movimentações de contas a receber, contas a pagar, valores e categorias associadas ao seu Tenant.";
    } else if (activeTab === "sales") {
      title = "Performance de Vendas";
      description = "Lista detalhada de negócios (Deals), com os seus estágios do funil, valores potenciais e status de fecho.";
    } else if (activeTab === "inventory") {
      title = "Movimentações de Estoque";
      description = "Histórico das entradas, saídas e transferências de produtos nos seus depósitos.";
    }

    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 md:p-8 shadow-sm transition-colors mt-6 animate-in slide-in-from-bottom-2">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{title}</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8">{description}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
              <CalendarIcon size={16} /> Data Inicial
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-700 dark:text-white transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
              <CalendarIcon size={16} /> Data Final
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-700 dark:text-white transition-colors"
            />
          </div>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-700 pt-6 flex flex-col sm:flex-row items-center gap-4">
          <button
            onClick={() => handleDownload("pdf")}
            disabled={loadingPdf || loadingExcel}
            className="w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-70"
          >
            {loadingPdf ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
            Descarregar PDF
          </button>

          <button
            onClick={() => handleDownload("excel")}
            disabled={loadingPdf || loadingExcel}
            className="w-full sm:w-auto px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-70"
          >
            {loadingExcel ? <Loader2 size={18} className="animate-spin" /> : <FileSpreadsheet size={18} />}
            Descarregar Excel
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors">
          Central de Relatórios
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 transition-colors">
          Gere e exporte métricas avançadas em PDF ou Excel.
        </p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-lg p-4 flex items-start gap-3 transition-colors">
        <AlertCircle className="text-blue-600 dark:text-blue-400 mt-0.5" size={20} />
        <div>
          <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">Motor Django</p>
          <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
            Os ficheiros de exportação são renderizados dinamicamente pelo backend baseados no modelo relacional.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setActiveTab("finance")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === "finance"
              ? "bg-indigo-600 text-white shadow"
              : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
        >
          <CreditCard size={18} /> Financeiro
        </button>
        <button
          onClick={() => setActiveTab("sales")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === "sales"
              ? "bg-indigo-600 text-white shadow"
              : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
        >
          <BarChart size={18} /> Vendas
        </button>
        <button
          onClick={() => setActiveTab("inventory")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === "inventory"
              ? "bg-indigo-600 text-white shadow"
              : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
        >
          <Truck size={18} /> Estoque
        </button>
      </div>

      {renderTabContent()}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
        showCancel={false}
      />
    </div>
  );
};

export default Reports;
