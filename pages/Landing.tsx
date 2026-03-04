import React from "react";
import { Link } from "react-router-dom";

const Landing: React.FC = () => {
  return (
    <div
      className="min-h-screen flex flex-col bg-cover bg-center text-white relative"
      style={{
        backgroundImage: "url('/assets/background-Azul-escuro.png')",
      }}
    >
      {/* Overlay escuro */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Conteúdo central */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-4">
        <h1 className="text-3xl md:text-4xl font-semibold mb-2 text-center">
          FR Produtos Médicos
        </h1>
        <p className="text-sm md:text-base mb-8 uppercase tracking-[0.25em] text-center">
          Escolha um login
        </p>

        {/* Card com os dois acessos */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl px-10 py-10 flex flex-col md:flex-row gap-10 items-center">
          {/* Acesso Master */}
          <Link
            to="/master"
            className="flex flex-col items-center gap-4 hover:bg-white/10 px-6 py-4 rounded-lg transition-transform transform hover:scale-105"
          >
            <div className="text-5xl">
              <img
                src="/assets/login-master.png"
                alt="Acesso Master"
                className="w-16 h-16"
              />
            </div>
            <span className="text-lg">Acesso Master</span>
          </Link>

          {/* Acessar Painel */}
          <Link
            to="/login"
            className="flex flex-col items-center gap-4 hover:bg-white/10 px-6 py-4 rounded-lg transition-transform transform hover:scale-105"
          >
            <div className="text-5xl">
              <img
                src="/assets/login-admin.png"
                alt="Acesso painel"
                className="w-16 h-16"
              />
            </div>
            <span className="text-lg">Acessar Painel</span>
          </Link>
        </div>
      </div>

      {/* Rodapé com redes sociais */}
      <footer className="relative z-10 flex justify-center gap-6 py-6 text-xl">
        <a
          href="https://www.instagram.com/frprodutosmedicospe/"
          className="hover:text-gray-300"
        >
          <img
            src="/assets/icon-insta.png"
            alt="Instagram"
            className="w-8 h-8"
          />
        </a>
        <a
          href="https://www.facebook.com/frprodutosmedicos/"
          className="hover:text-gray-300"
        >
          <img src="/assets/icon-face.png" alt="facebook" className="w-8 h-8" />
        </a>
      </footer>
    </div>
  );
};

export default Landing;
