import React, { useState, useEffect } from "react";
import {
  ScrollText,
  Filter,
  Search,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react";
import { db, appId } from "../../lib/firebase";
import {
  collectionGroup,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";

interface LogEntry {
  id: string;
  type: "info" | "warning" | "error" | "INFO" | "WARN" | "ERROR"; // Suporta formatos diferentes
  action: string;
  user: string;
  ip?: string;
  createdAt: string; // Formato ISO
  details?: string;
  description?: string; // Alguns logs usam description
}

const AdminLogs = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estados de Filtro
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("ALL");

  // 1. Carregar TODOS os logs do sistema (Collection Group Query)
  useEffect(() => {
    // 'logs' é o nome da sub-coleção que criamos dentro de cada empresa
    // collectionGroup busca em TODAS as coleções com esse nome no banco
    const q = query(collectionGroup(db, "logs"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedLogs = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            // Normalizar campos que podem variar
            type: data.type || data.level || "INFO",
            details: data.details || data.description || "",
            createdAt: data.createdAt || new Date().toISOString(),
          } as LogEntry;
        });
        setLogs(fetchedLogs);
        setIsLoading(false);
      },
      (error) => {
        console.error("Erro ao buscar logs:", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // 2. Lógica de Filtragem
  const filteredLogs = logs.filter((log) => {
    // Filtro de Texto (Busca em vários campos)
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      log.action.toLowerCase().includes(searchLower) ||
      log.user.toLowerCase().includes(searchLower) ||
      (log.details || "").toLowerCase().includes(searchLower) ||
      (log.id || "").toLowerCase().includes(searchLower);

    // Filtro de Tipo
    const matchesType =
      filterType === "ALL" || log.type.toUpperCase() === filterType;

    return matchesSearch && matchesType;
  });

  // Helpers Visuais
  const getBadgeColor = (type: string) => {
    const t = type.toUpperCase();
    if (t === "ERROR") return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800";
    if (t === "WARN" || t === "WARNING")
      return "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800";
    return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800";
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterType("ALL");
  };

  if (isLoading)
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="animate-spin text-indigo-600 w-10 h-10" />
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Logs de Auditoria
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Rastreie as atividades e eventos importantes do sistema.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {/* Barra de Ferramentas */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row gap-4 justify-between bg-gray-50/50 dark:bg-gray-900/50">
          <div className="relative w-full md:w-96">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={16}
            />
            <input
              type="text"
              placeholder="Buscar por ID, Ação, Usuário..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select
              className="border border-gray-300 dark:border-gray-600 rounded-lg text-sm px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="ALL">Todos os níveis</option>
              <option value="INFO">INFO</option>
              <option value="WARN">WARN</option>
              <option value="ERROR">ERROR</option>
            </select>

            <button
              onClick={clearFilters}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-white dark:hover:bg-gray-700 hover:border-red-300 dark:hover:border-red-500 hover:text-red-600 dark:hover:text-red-400 transition bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              title="Limpar Filtros"
            >
              {searchTerm || filterType !== "ALL" ? (
                <X size={16} />
              ) : (
                <Filter size={16} />
              )}
              <span>Filtros</span>
            </button>
          </div>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="p-4 w-24">Tipo</th>
                <th className="p-4 w-48">Timestamp</th>
                <th className="p-4 w-40">Ação</th>
                <th className="p-4 w-48">Usuário</th>
                <th className="p-4 w-32">IP</th>
                <th className="p-4">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredLogs.map((log) => (
                <tr
                  key={log.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/30 font-mono text-xs transition group"
                >
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded border font-bold text-[10px] uppercase ${getBadgeColor(
                        log.type
                      )}`}
                    >
                      {log.type}
                    </span>
                  </td>
                  <td className="p-4 text-gray-500 dark:text-gray-400">
                    {new Date(log.createdAt).toLocaleString("pt-BR")}
                  </td>
                  <td className="p-4 font-bold text-gray-700 dark:text-gray-300">
                    {log.action}
                  </td>
                  <td className="p-4 text-indigo-600 dark:text-indigo-400 font-medium">
                    {log.user}
                  </td>
                  <td className="p-4 text-gray-400 dark:text-gray-500">
                    {log.ip || "-"}
                  </td>
                  <td
                    className="p-4 text-gray-600 dark:text-gray-400 truncate max-w-xs"
                    title={log.details}
                  >
                    {log.details}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="p-12 text-center text-gray-500 dark:text-gray-400"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <ScrollText
                        size={32}
                        className="text-gray-300 dark:text-gray-600"
                      />
                      <p>Nenhum log encontrado.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminLogs;
