import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Shield,
  Lock,
  Loader2,
  KeyRound,
  AlertCircle,
} from "lucide-react";

const AdminLogin: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("https://crm.bidflow.top/api/token/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: email, password }),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error("Credenciais inválidas.");
        }
        throw new Error("Erro de autenticação. Tente novamente.");
      }

      const data = await response.json();
      localStorage.setItem("access_token", data.access);
      localStorage.setItem("refresh_token", data.refresh);

      // Forces a page reload to let App.tsx or Context catch the new token
      window.location.href = "/";
    } catch (err: any) {
      console.error("Erro no login admin:", err);
      setError(err.message || "Erro de autenticação. Tente novamente.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#111827] p-4">
      <div className="bg-[#1f2937] w-full max-w-md rounded-2xl shadow-2xl p-8 border border-gray-700">
        <Link
          to="/"
          className="inline-flex items-center text-sm text-gray-400 hover:text-white mb-6 transition"
        >
          <ArrowLeft size={16} className="mr-1" /> Voltar para o site
        </Link>

        <div className="text-center mb-8">
          <div className="bg-green/10 p-4 rounded-xl mb-4 inline-block">
            <img
              src="/assets/logo-1200-fp.png"
              alt="BidFlow"
              className="h-16 mx-auto mb-4 object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-white">Acesso Master</h1>
          <p className="text-gray-400 mt-1">
            Área restrita para equipe BidFlow
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 text-red-300 text-sm rounded-lg flex items-center gap-2 border border-red-800">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Email ou ID
            </label>
            <div className="relative">
              <Shield
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                size={18}
              />
              <input
                type="text"
                required
                className="w-full pl-10 pr-4 py-3 bg-[#374151] border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent outline-none transition placeholder-gray-500"
                placeholder="admin@bidflow.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Chave de Acesso
            </label>
            <div className="relative">
              <KeyRound
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                size={18}
              />
              <input
                type="password"
                required
                className="w-full pl-10 pr-4 py-3 bg-[#374151] border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent outline-none transition placeholder-gray-500"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#6C63FF] text-white py-3 rounded-xl font-bold text-lg hover:bg-[#5a52d6] transition shadow-lg shadow-purple-900/30 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 size={24} className="animate-spin" />
            ) : (
              "Autenticar Sistema"
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-gray-700 pt-6">
          <p className="text-xs text-gray-500 flex items-center justify-center gap-2">
            <Lock size={12} /> Conexão Segura 256-bit SSL
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
