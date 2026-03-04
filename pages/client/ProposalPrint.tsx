import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db, auth, appId } from "../../lib/firebase";
import {
  Loader2,
  AlertCircle,
  Printer,
  Image as ImageIcon,
  X,
} from "lucide-react";

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
  rentDuration?: number; // Campo adicionado
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
  status: string;
  clientType: "PJ" | "PF";
  items: ProposalItem[];
  terms: ProposalTerms;
}

interface UserProfile {
  name: string;
  role: string;
  department: string;
  phone: string;
  email: string;
}

const ProposalPrint = () => {
  const { id } = useParams();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [clientDetails, setClientDetails] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!auth.currentUser || !id) return;
      setLoading(true);

      try {
        // 1. Buscar Proposta
        const proposalRef = doc(
          db,
          "artifacts",
          appId,
          "users",
          auth.currentUser.uid,
          "proposals",
          id
        );
        const proposalSnap = await getDoc(proposalRef);

        if (!proposalSnap.exists()) {
          setError("Proposta não encontrada.");
          setLoading(false);
          return;
        }

        const proposalData = {
          id: proposalSnap.id,
          ...proposalSnap.data(),
        } as Proposal;
        setProposal(proposalData);

        // 2. Buscar Perfil do Usuário
        const profileRef = doc(
          db,
          "artifacts",
          appId,
          "users",
          auth.currentUser.uid,
          "settings",
          "profile"
        );
        const profileSnap = await getDoc(profileRef);

        if (profileSnap.exists()) {
          setUserProfile(profileSnap.data() as UserProfile);
        } else {
          setUserProfile({
            name: auth.currentUser.displayName || "Consultor",
            role: "Consultor Comercial",
            department: "Vendas",
            phone: "(00) 00000-0000",
            email: auth.currentUser.email || "",
          });
        }

        // 3. Buscar Detalhes do Cliente
        let details: any = {};
        if (proposalData.clientId) {
          if (proposalData.clientType === "PJ") {
            const orgRef = doc(
              db,
              "artifacts",
              appId,
              "users",
              auth.currentUser.uid,
              "organizations",
              proposalData.clientId
            );
            const orgSnap = await getDoc(orgRef);
            if (orgSnap.exists()) {
              const org = orgSnap.data();
              details = {
                name: org.socialReason || org.fantasyName,
                doc: org.cnpj,
                address: `${org.address}, ${org.number} - ${org.neighborhood}`,
                city: `${org.city}/${org.state}`,
                cep: org.cep,
                email: org.email || "",
                phone: org.phone || "",
              };

              if (proposalData.contactId) {
                const contactRef = doc(
                  db,
                  "artifacts",
                  appId,
                  "users",
                  auth.currentUser.uid,
                  "contacts",
                  proposalData.contactId
                );
                const contactSnap = await getDoc(contactRef);
                if (contactSnap.exists()) {
                  const contact = contactSnap.data();
                  details.contactName = contact.name;
                  details.email = contact.email || details.email;
                  details.phone = contact.phone || details.phone;
                }
              }
            }
          } else {
            const indRef = doc(
              db,
              "artifacts",
              appId,
              "users",
              auth.currentUser.uid,
              "individuals",
              proposalData.clientId
            );
            const indSnap = await getDoc(indRef);
            if (indSnap.exists()) {
              const ind = indSnap.data();
              details = {
                name: ind.name,
                doc: ind.cpf,
                address: `${ind.address}, ${ind.number} - ${ind.neighborhood}`,
                city: `${ind.city}/${ind.state}`,
                cep: ind.cep,
                phone: ind.phone,
                email: ind.email,
              };
            }
          }
        }
        setClientDetails(details);
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        setError("Erro ao carregar dados da proposta.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const parseCurrencyString = (val: string): number => {
    if (!val) return 0;
    const cleanStr = val.replace(/[^0-9,.-]+/g, "");
    if (cleanStr.includes(",")) {
      const normalized = cleanStr.replace(/\./g, "").replace(",", ".");
      return parseFloat(normalized) || 0;
    }
    return parseFloat(cleanStr) || 0;
  };

  const getMultiplier = (item: ProposalItem): number => {
    if (item.status === "Locação") {
      // Se tiver duração definida, usa ela.
      // Se não tiver (legado), assume 24 meses como padrão antigo ou 12 se preferir.
      // Aqui vamos assumir que se não tem rentDuration em locação, pode ser um dado antigo que usava 24.
      return item.rentDuration && item.rentDuration > 0
        ? item.rentDuration
        : 24;
    }
    return 1;
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

    const multiplier = getMultiplier(item);
    return total * item.quantity * multiplier;
  };

  // Recalcular o total geral com a nova lógica (para exibir corretamente, caso o salvo esteja desatualizado ou apenas para garantia)
  const totalGeral = proposal
    ? proposal.items.reduce((acc, item) => acc + calculateItemSubtotal(item), 0)
    : 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-gray-500">Preparando documento...</p>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-gray-800">Erro</h2>
        <p className="text-gray-600">{error || "Proposta não encontrada"}</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen flex justify-center py-8 print:p-0 print:bg-white print:min-h-0">
      {/* ... estilos ... */}
      <style>
        {`
          @media print {
            @page { 
              margin: 0; 
              size: auto;
            }
            body { 
              background: white; 
              -webkit-print-color-adjust: exact; 
            }
            .no-print { display: none !important; }
            
            .print-container { 
                box-shadow: none !important; 
                margin: 0 !important;
                width: 100% !important;
                max-width: none !important;
                min-height: 100vh !important;
                display: block !important;
            }

            .page-footer {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                height: 50px;
                background: white;
                z-index: 1000;
                padding-right: 3rem; 
            }

            .print-content {
                margin-bottom: 60px; 
            }

            tr { page-break-inside: avoid; }
            .break-inside-avoid { page-break-inside: avoid; }
            
            .page-number:after {
                content: "Página | " counter(page);
            }
          }
        `}
      </style>

      {/* Barra de Ferramentas Flutuante */}
      <div className="fixed top-4 right-4 flex flex-col gap-2 no-print z-50">
        <button
          onClick={() => window.print()}
          className="bg-indigo-600 text-white p-3 rounded-full shadow-lg hover:bg-indigo-700 transition"
          title="Imprimir"
        >
          <Printer size={24} />
        </button>
        <button
          onClick={() => window.close()}
          className="bg-gray-600 text-white p-3 rounded-full shadow-lg hover:bg-gray-700 transition"
          title="Fechar"
        >
          <X size={24} />
        </button>
      </div>

      <div className="print-container bg-white w-[210mm] min-h-[297mm] shadow-2xl relative mx-auto print:mx-0">
        {/* ... Rodapé ... */}
        <div className="page-footer hidden print:block">
          <div className="bg-indigo-900 h-2 w-[calc(100%-6rem)] mx-12 mt-4 mb-2"></div>
          <div className="text-right text-xs text-gray-500 font-medium">
            <span className="page-number"></span>
          </div>
        </div>

        <div className="p-12 text-gray-900 font-sans text-sm print-content">
          {/* Cabeçalho */}
          <header className="flex justify-between items-start border-b-2 border-indigo-900 pb-6 mb-8">
            <div className="flex items-center gap-4">
              {/* Use caminho absoluto para ativos se necessário ou mantenha relativo se funcionar na sua configuração. Ficheiros anteriores usavam /assets/... */}
              <div className="w-24 h-24 relative">
                <img
                  src="/assets/LOGO-FR.webp"
                  className="object-contain w-full h-full"
                  alt="Logótipo"
                />
              </div>
              <div className="text-xs text-gray-600 space-y-1">
                <h2 className="text-lg font-bold text-indigo-900 mb-1">
                  FR Produtos Médicos
                </h2>
                <p>CNPJ: 09.005.588/0001-40</p>
                <p>Rua Joaquim de Brito, 240, Boa Vista</p>
                <p>Recife-PE, CEP: 50.070-280</p>
                <p>(81) 3423-2022 | (81) 3423-7272</p>
                <p>www.fr.pe.com.br | frpe@frpe.com.br</p>
              </div>
            </div>
            <div className="text-right">
              <h1 className="text-2xl font-bold text-indigo-900 uppercase">
                Proposta Comercial
              </h1>
              <p className="text-gray-500 mt-1">Nº {proposal.number}</p>
              <div className="mt-4 text-xs font-medium">
                <p>
                  Data de Emissão:{" "}
                  {new Date(proposal.date).toLocaleDateString("pt-BR")}
                </p>
                <p className="text-red-600">
                  Validade:{" "}
                  {new Date(proposal.validity).toLocaleDateString("pt-BR")}
                </p>
              </div>
            </div>
          </header>

          {/* Informações do Cliente */}
          <section className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-8 break-inside-avoid">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p>
                  <span className="font-bold text-gray-700">Cliente:</span>{" "}
                  {proposal.client}
                </p>
                <p className="mt-1">
                  <span className="font-bold text-gray-700">CNPJ/CPF:</span>{" "}
                  {proposal.document}
                </p>
                <p className="mt-1">
                  <span className="font-bold text-gray-700">Endereço:</span>{" "}
                  {clientDetails?.address || "N/A"}
                </p>
                <p className="mt-1">
                  <span className="font-bold text-gray-700">Cidade/UF:</span>{" "}
                  {clientDetails?.city || "N/A"} - CEP:{" "}
                  {clientDetails?.cep || "N/A"}
                </p>
              </div>
              <div>
                <p>
                  <span className="font-bold text-gray-700">Contato:</span>{" "}
                  {clientDetails?.contactName || proposal.contact || "N/A"}
                </p>
                <p className="mt-1">
                  <span className="font-bold text-gray-700">Telefone:</span>{" "}
                  {clientDetails?.phone || "N/A"}
                </p>
                <p className="mt-1">
                  <span className="font-bold text-gray-700">E-mail:</span>{" "}
                  {clientDetails?.email || "N/A"}
                </p>
              </div>
            </div>
          </section>

          {/* Texto de Introdução */}
          <div className="mb-8 text-xs text-gray-700 leading-relaxed text-justify break-inside-avoid">
            <p className="mb-2 font-bold">Prezados (as),</p>
            <p>
              A FR Produtos Médicos agradece seu interesse em nossos produtos e
              serviços. Sabemos da sua importância em sempre oferecer a mais
              alta tecnologia para a melhor e mais rápida recuperação do
              paciente e também em oferecer segurança aos profissionais da
              saúde.
            </p>
          </div>

          {/* Tabela de Itens */}
          <div className="mb-8">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-indigo-900 text-white">
                  <th className="p-2 text-center w-16">Imagem</th>
                  <th className="p-2 text-left">Descrição</th>
                  <th className="p-2 text-center">Estado</th>
                  <th className="p-2 text-center">Unid.</th>
                  <th className="p-2 text-center">Qtd</th>
                  <th className="p-2 text-right">Vlr. Unit.</th>
                  <th className="p-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {proposal.items.map((item, idx) => (
                  <tr key={idx} className="break-inside-avoid">
                    <td className="p-2 text-center align-middle">
                      {item.image ? (
                        <img
                          src={item.image}
                          className="w-12 h-12 object-contain mx-auto"
                          alt="prod"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 mx-auto flex items-center justify-center text-gray-400">
                          <ImageIcon size={16} />
                        </div>
                      )}
                    </td>
                    <td className="p-2 align-middle">
                      <p className="font-bold text-indigo-900">
                        {item.description}
                      </p>
                      <p className="text-gray-500">
                        {item.manufacturer} - {item.model}
                      </p>
                      {item.detailedDescription && (
                        <p className="text-[10px] text-gray-400 mt-1 italic max-w-xs">
                          {item.detailedDescription}
                        </p>
                      )}
                      {item.params.length > 0 && (
                        <div className="mt-1 text-[10px] text-gray-500">
                          {item.params.map((p) => (
                            <span key={p.name} className="mr-2 block">
                              • {p.name}: {p.value}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="p-2 text-center align-middle uppercase font-medium text-[10px]">
                      <div className="flex flex-col items-center">
                        <span>{item.status}</span>
                        {item.status === "Locação" && (
                          <span className="text-[9px] text-gray-500 whitespace-nowrap">
                            {getMultiplier(item)} Meses
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-2 text-center align-middle">
                      {item.unit}
                    </td>
                    <td className="p-2 text-center align-middle font-bold">
                      {item.quantity}
                    </td>
                    <td className="p-2 text-right align-middle">
                      {item.unitPrice.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </td>
                    <td className="p-2 text-right align-middle font-bold text-gray-900">
                      {calculateItemSubtotal(item).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 border-t-2 border-indigo-900 break-inside-avoid">
                  <td
                    colSpan={6}
                    className="p-3 text-right font-bold text-gray-700 uppercase"
                  >
                    Valor Total Geral
                  </td>
                  <td className="p-3 text-right font-bold text-indigo-900 text-sm">
                    {totalGeral.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Termos e Condições */}
          <div className="mb-12 break-inside-avoid">
            <h3 className="text-sm font-bold text-indigo-900 border-b border-gray-300 pb-1 mb-3">
              Condições Gerais de Fornecimento
            </h3>
            <div className="grid grid-cols-1 gap-y-2 text-xs text-gray-700">
              {proposal.terms.billing && (
                <p>
                  <strong>1. Faturamento:</strong> {proposal.terms.billing}
                </p>
              )}
              {proposal.terms.training && (
                <p>
                  <strong>2. Treinamento:</strong> {proposal.terms.training}
                </p>
              )}
              {proposal.terms.payment && (
                <p>
                  <strong>3. Condições de Pagamento:</strong>{" "}
                  {proposal.terms.payment}
                </p>
              )}
              {proposal.terms.delivery && (
                <p>
                  <strong>4. Prazo de Entrega:</strong>{" "}
                  {proposal.terms.delivery}
                </p>
              )}
              {proposal.terms.warrantyEquipment && (
                <p>
                  <strong>5. Garantia dos Equipamentos:</strong>{" "}
                  {proposal.terms.warrantyEquipment}
                </p>
              )}
              {proposal.terms.warrantyAccessories && (
                <p>
                  <strong>6. Garantia dos Acessórios:</strong>{" "}
                  {proposal.terms.warrantyAccessories}
                </p>
              )}
              {proposal.terms.installation && (
                <p>
                  <strong>7. Instalação:</strong> {proposal.terms.installation}
                </p>
              )}
              {proposal.terms.technicalAssistance && (
                <p>
                  <strong>8. Assistência Técnica:</strong>{" "}
                  {proposal.terms.technicalAssistance}
                </p>
              )}
              {proposal.terms.notes && proposal.terms.notes !== "Nenhuma" && (
                <p>
                  <strong>Obs:</strong> {proposal.terms.notes}
                </p>
              )}
            </div>
          </div>

          {/* Assinaturas */}
          <div className="mt-auto break-inside-avoid">
            <div className="flex justify-between items-end">
              <div className="text-xs text-gray-700">
                <p className="font-bold text-sm mb-1">{userProfile?.name}</p>
                <p className="uppercase">
                  {userProfile?.department}{" "}
                  {userProfile?.role ? `- ${userProfile.role}` : ""}
                </p>
                <p>Fone: {userProfile?.phone}</p>
                <p>E-mail: {userProfile?.email}</p>
              </div>
              <div className="text-center w-64">
                <div className="border-b border-black mb-2"></div>
                <p className="text-xs font-bold">De Acordo</p>
                <p className="text-xs mt-4 text-left">
                  Data: ____/____/________
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé com Número de Página */}
        <div className="print:hidden w-[210mm] mx-auto pb-8 px-12">
          <div className="bg-indigo-900 h-2 w-full mt-4 mb-2"></div>
          <div className="text-right text-xs text-gray-500 font-medium">
            Página | 1
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProposalPrint;
