import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Mail, Lock, Loader2, AlertCircle } from "lucide-react";

const ClientLogin: React.FC = () => {
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
          throw new Error("Email ou senha incorretos.");
        }
        throw new Error("Ocorreu um erro ao fazer login.");
      }

      const data = await response.json();
      localStorage.setItem("access_token", data.access);
      localStorage.setItem("refresh_token", data.refresh);

      // Forces a page reload to let App.tsx or Context catch the new token
      window.location.href = "/";
    } catch (err: any) {
      console.error("Erro no login:", err);
      setError(err.message || "Ocorreu um erro ao fazer login.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-8 border border-gray-100">
        <Link
          to="/"
          className="inline-flex items-center text-sm text-gray-500 hover:text-indigo-600 mb-6 transition"
        >
          <ArrowLeft size={16} className="mr-1" /> Voltar para home
        </Link>

        <div className="text-center mb-8">
          <img
            src="/assets/logo-1200-fb.png"
            alt="BidFlow"
            className="h-16 mx-auto mb-4 object-contain"
          />
          <h1 className="text-2xl font-bold text-gray-900">
            Bem-vindo de volta
          </h1>
          <p className="text-gray-500 mt-1">Acesse sua conta BidFlow</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Profissional
            </label>
            <div className="relative">
              <Mail
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="email"
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                placeholder="voce@suaempresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Senha
              </label>
              <a
                href="#"
                className="text-xs font-medium text-indigo-600 hover:underline"
              >
                Esqueceu a senha?
              </a>
            </div>
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="password"
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 size={24} className="animate-spin" />
            ) : (
              "Entrar"
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Ainda não tem uma conta?{" "}
            <a href="#" className="font-bold text-indigo-600 hover:underline">
              Criar conta grátis
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ClientLogin;
