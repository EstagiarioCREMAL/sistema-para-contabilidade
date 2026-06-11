import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { 
  X, 
  BookOpen, 
  PlusCircle, 
  FileSpreadsheet, 
  Lock, 
  LayoutDashboard, 
  Edit3, 
  ChevronRight,
  Info,
  CheckCircle2,
  FileText,
  Trash2,
  FileOutput
} from 'lucide-react';

export default function HelpGuide() {
  const { showHelp, setShowHelp } = useAppContext();
  const [activeTopic, setActiveTopic] = useState('geral');

  if (!showHelp) return null;

  const topics = [
    { id: 'geral', title: 'Visão Geral', icon: <LayoutDashboard size={20} /> },
    { id: 'lancamentos', title: 'Lançamentos', icon: <PlusCircle size={20} /> },
    { id: 'edicao', title: 'Editar e Excluir', icon: <Edit3 size={20} /> },
    { id: 'importacao', title: 'Importar Excel', icon: <FileSpreadsheet size={20} /> },
    { id: 'exportacao', title: 'Exportar Relatórios', icon: <FileText size={20} /> },
    { id: 'fechamento', title: 'Fechamento', icon: <Lock size={20} /> },
  ];

  const renderContent = () => {
    switch (activeTopic) {
      case 'geral':
        return (
          <div className="fade-in">
            <h3 style={{ color: 'var(--primary-color)', marginBottom: '1rem' }}>Bem-vindo ao Sistema Contábil</h3>
            <p>Este sistema foi desenvolvido para facilitar a gestão das prestações de contas do CRM-AL (Fiscalização, Educação Médica e Cota Parte).</p>
            <div style={{ marginTop: '1.5rem', display: 'grid', gap: '1rem' }}>
              <div className="help-card">
                <div className="help-card-icon"><LayoutDashboard size={24} /></div>
                <div>
                  <strong>Dashboard:</strong> A tela inicial mostra o quanto do orçamento de cada convênio já foi utilizado. Fique de olho nas barras de progresso!
                </div>
              </div>
              <div className="help-card">
                <div className="help-card-icon"><Info size={24} /></div>
                <div>
                  <strong>Exercício Fiscal:</strong> No topo da barra lateral, você pode mudar o ano (2024, 2025, 2026). Os dados mudam automaticamente conforme o ano selecionado.
                </div>
              </div>
            </div>
          </div>
        );
      case 'lancamentos':
        return (
          <div className="fade-in">
            <h3 style={{ color: 'var(--primary-color)', marginBottom: '1rem' }}>Como Adicionar Despesas</h3>
            <p>Dentro de cada relatório (ex: Fiscalização), use o formulário no topo da página:</p>
            <ul style={{ marginTop: '1rem', paddingLeft: '1.2rem', display: 'grid', gap: '0.8rem' }}>
              <li><strong>Data:</strong> Deve estar dentro do ano selecionado.</li>
              <li><strong>Beneficiário:</strong> Nome da pessoa ou empresa (não use números aqui).</li>
              <li><strong>Finalidade:</strong> Descrição detalhada do gasto.</li>
              <li><strong>Valor:</strong> Use vírgula para centavos (ex: 150,50).</li>
              <li><strong>Nº Processo:</strong> Apenas os números do processo administrativo.</li>
            </ul>
            <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'var(--success-light)', borderRadius: 'var(--radius)', border: '1px solid var(--success)' }}>
              <span style={{ color: 'var(--success)', fontWeight: '700' }}>Dica:</span> Ao salvar, a linha na tabela piscará em verde para confirmar o sucesso!
            </div>
          </div>
        );
      case 'edicao':
        return (
          <div className="fade-in">
            <h3 style={{ color: 'var(--primary-color)', marginBottom: '1rem' }}>Editar e Excluir</h3>
            <p>Você pode ajustar qualquer dado diretamente na tabela:</p>
            <div style={{ marginTop: '1.5rem', display: 'grid', gap: '1rem' }}>
              <div className="help-card">
                <div className="help-card-icon"><Edit3 size={24} /></div>
                <div>
                  <strong>Edição Rápida:</strong> Clique no ícone do lápis. O campo de texto abrirá automaticamente. Basta digitar e clicar no check verde para salvar.
                </div>
              </div>
              <div className="help-card" style={{ borderColor: 'var(--danger-light)' }}>
                <div className="help-card-icon" style={{ color: 'var(--danger)' }}><Trash2 size={24} /></div>
                <div>
                  <strong>Excluir:</strong> Clique no ícone da lixeira vermelha. O sistema pedirá uma confirmação para evitar exclusões acidentais.
                </div>
              </div>
            </div>
          </div>
        );
      case 'importacao':
        return (
          <div className="fade-in">
            <h3 style={{ color: 'var(--primary-color)', marginBottom: '1rem' }}>Importar do Excel</h3>
            <p>Se você já tem uma planilha do contador, pode importá-la em massa:</p>
            <ol style={{ marginTop: '1rem', paddingLeft: '1.2rem', display: 'grid', gap: '0.8rem' }}>
              <li>Clique no botão <strong>"Importar Excel"</strong>.</li>
              <li>Selecione o arquivo .xlsx no seu computador.</li>
              <li>O sistema perguntará se os dados são da <strong>1ª ou 2ª Parcela</strong>.</li>
              <li>Aguarde o processamento. O sistema organizará tudo automaticamente por data.</li>
            </ol>
            <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <em>Nota: O sistema é inteligente e ignora cabeçalhos, pegando apenas os dados relevantes.</em>
            </p>
          </div>
        );
      case 'exportacao':
        return (
          <div className="fade-in">
            <h3 style={{ color: 'var(--primary-color)', marginBottom: '1rem' }}>Exportar e Gerar Relatórios</h3>
            <p>Existem duas formas principais de gerar os documentos oficiais:</p>
            <div style={{ marginTop: '1.5rem', display: 'grid', gap: '1rem' }}>
              <div className="help-card">
                <div className="help-card-icon" style={{ color: '#cb9b51' }}><FileSpreadsheet size={24} /></div>
                <div>
                  <strong>Relatório Mestre (Excel):</strong> Gera um arquivo único com 3 abas (Fiscalização, Ed. Médica e Cota Parte). É o formato recomendado para enviar ao CFM.
                </div>
              </div>
              <div className="help-card">
                <div className="help-card-icon"><FileOutput size={24} /></div>
                <div>
                  <strong>PDF Individual:</strong> Gera o documento formatado com cabeçalho e rodapé oficial do presidente para um convênio específico.
                </div>
              </div>
            </div>
          </div>
        );
      case 'fechamento':
        return (
          <div className="fade-in">
            <h3 style={{ color: 'var(--primary-color)', marginBottom: '1rem' }}>Finalizar Prestação de Contas</h3>
            <p>Quando o relatório do mês estiver pronto e conferido, você deve bloqueá-lo:</p>
            <div style={{ marginTop: '1.5rem', textAlign: 'center', padding: '2rem', backgroundColor: 'var(--bg-color)', borderRadius: 'var(--radius-lg)' }}>
              <Lock size={48} style={{ color: 'var(--primary-color)', marginBottom: '1rem' }} />
              <p>Clique em <strong>"Finalizar Relatório"</strong>.</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                Isso impede edições acidentais. Se precisar corrigir algo depois, basta clicar no ícone do cadeado para reabrir.
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 10000,
      backdropFilter: 'blur(5px)'
    }}>
      <div className="card glass-panel fade-in" style={{ 
        width: '900px', 
        height: '600px', 
        display: 'flex', 
        overflow: 'hidden', 
        padding: 0,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Sidebar do Guia */}
        <div style={{ 
          width: '250px', 
          backgroundColor: 'rgba(12, 43, 77, 0.05)', 
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ backgroundColor: 'var(--primary-color)', color: 'white', padding: '0.5rem', borderRadius: '8px' }}>
              <BookOpen size={20} />
            </div>
            <span style={{ fontWeight: '700', color: 'var(--primary-color)' }}>Guia do Usuário</span>
          </div>
          
          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
            {topics.map(topic => (
              <button
                key={topic.id}
                onClick={() => setActiveTopic(topic.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  border: 'none',
                  background: activeTopic === topic.id ? 'var(--primary-color)' : 'transparent',
                  color: activeTopic === topic.id ? 'white' : 'var(--text-primary)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  fontWeight: activeTopic === topic.id ? '600' : '400'
                }}
              >
                {topic.icon}
                <span style={{ flex: 1 }}>{topic.title}</span>
                {activeTopic === topic.id && <ChevronRight size={16} />}
              </button>
            ))}
          </div>

          <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
            Cremal Contábil v1.1
          </div>
        </div>

        {/* Conteúdo do Guia */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <button 
            onClick={() => setShowHelp(false)}
            style={{ 
              position: 'absolute', 
              top: '1.5rem', 
              right: '1.5rem', 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer', 
              color: 'var(--text-secondary)',
              padding: '0.5rem',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.05)'
            }}
          >
            <X size={20} />
          </button>

          <div style={{ padding: '3rem', flex: 1, overflowY: 'auto' }}>
            {renderContent()}
          </div>

          <div style={{ padding: '1.5rem 3rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              className="btn btn-primary" 
              onClick={() => setShowHelp(false)}
              style={{ padding: '0.6rem 2rem' }}
            >
              Entendido
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .help-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background-color: white;
          border: 1px solid var(--border-color);
          border-radius: var(--radius);
          font-size: 0.9rem;
          color: var(--text-primary);
          transition: transform 0.2s ease;
        }
        .help-card:hover {
          transform: translateX(5px);
          border-color: var(--primary-color);
        }
        .help-card-icon {
          color: var(--primary-color);
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: var(--primary-light);
          padding: 0.75rem;
          border-radius: 12px;
        }
      `}</style>
    </div>
  );
}
