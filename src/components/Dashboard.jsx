import React, { useState } from 'react';
import { useAppContext, REPORT_TYPES, getReportName } from '../context/AppContext';
import { TrendingUp, CreditCard, PieChart, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { generateMasterExcel, getLogoBuffer } from '../utils/excelExport';

export default function Dashboard({ setActiveTab }) {
  const { entries, budgets, reportYear, presidentInfo, addToast } = useAppContext();
  const [isGenerating, setIsGenerating] = useState(false);

  // Calculations - Filter entries by selected year
  const yearEntries = entries.filter(e => {
    const entryDate = new Date(e.date);
    // Use UTC to ensure consistency across different local timezone dates
    return entryDate.getUTCFullYear() === reportYear;
  });

  const totals = {
    budget: Object.values(budgets).reduce((a, b) => a + b, 0),
    expenses: yearEntries.reduce((a, b) => a + b.value, 0)
  };
  totals.balance = totals.budget - totals.expenses;

  const getCategoryStats = (type) => {
    const categoryEntries = yearEntries.filter(e => e.reportType === type);
    const categoryBudget = budgets[type];
    const categoryExpenses = categoryEntries.reduce((a, b) => a + b.value, 0);
    const categoryBalance = categoryBudget - categoryExpenses;
    const percentage = categoryBudget > 0 ? (categoryExpenses / categoryBudget) * 100 : 0;
    
    return {
      type,
      name: getReportName(type, reportYear).split(' - ')[1],
      budget: categoryBudget,
      expenses: categoryExpenses,
      balance: categoryBalance,
      percentage: Math.min(percentage, 100),
      isOver: percentage > 100
    };
  };

  const categories = [
    getCategoryStats(REPORT_TYPES.FISCALIZACAO),
    getCategoryStats(REPORT_TYPES.EDUCACAO),
    getCategoryStats(REPORT_TYPES.COTA)
  ];

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard Financeiro</h1>
          <p className="page-subtitle">Visão Geral dos Convênios CFM - Exercício {reportYear}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            className="btn btn-accent"
            disabled={isGenerating}
            onClick={async () => {
              if (isGenerating) return;
              setIsGenerating(true);
              try {
                const logoData = await getLogoBuffer();
                await generateMasterExcel({
                  entries,
                  budgets,
                  getReportName,
                  presidentInfo,
                  reportYear,
                  includeObservations: true,
                  logoBuffer: logoData,
                  fileName: `Relatórios_Contábil_${reportYear}.xlsx`
                });
              } catch (error) {
                console.error('Erro ao gerar Excel:', error);
                addToast(error.message || 'Erro ao gerar o relatório Excel. Verifique os dados e tente novamente.', 'danger');
              } finally {
                setIsGenerating(false);
              }
            }}
          >
            {isGenerating ? <Loader2 size={18} className="spin" style={{ animation: 'spin 2s linear infinite' }} /> : <PieChart size={18} />}
            {isGenerating ? 'Gerando...' : 'Baixar Planilha Completa (Excel)'}
          </button>
        </div>
      </div>

      {/* Main KPI Cards */}
      <div className="form-row" style={{ marginTop: '2rem' }}>
        <div className="card glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
            <TrendingUp size={18} />
            <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>Orçamento Total</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--primary-color)' }}>
            {formatCurrency(totals.budget)}
          </div>
        </div>

        <div className="card glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
            <CreditCard size={18} />
            <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>Total Gasto</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--danger)' }}>
            {formatCurrency(totals.expenses)}
          </div>
        </div>

        <div className="card glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
            <PieChart size={18} />
            <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>Saldo Disponível</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--success)' }}>
            {formatCurrency(totals.balance)}
          </div>
        </div>
      </div>

      {/* Detailed Category Progress */}
      <h2 className="card-title" style={{ marginTop: '2.5rem', marginBottom: '1.5rem' }}>Resumo por Convênio</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        {categories.map((cat, idx) => (
          <div key={idx} 
               onClick={() => setActiveTab(cat.type)}
               className="card glass-panel" 
               style={{ 
                 padding: '1.5rem', 
                 border: cat.isOver ? '1px solid var(--danger)' : '1px solid var(--border-color)',
                 cursor: 'pointer',
                 transition: 'transform 0.1s ease'
               }}
               onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
               onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--primary-color)', maxWidth: '70%' }}>
                {cat.name}
              </h3>
              {cat.isOver ? (
                <AlertCircle size={20} className="text-danger" />
              ) : (
                <CheckCircle size={20} className="text-success" />
              )}
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Execução: {cat.percentage.toFixed(1)}%</span>
                <span style={{ fontWeight: '600' }}>{formatCurrency(cat.expenses)} / {formatCurrency(cat.budget)}</span>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ 
                  width: `${cat.percentage}%`, 
                  height: '100%', 
                  backgroundColor: cat.isOver ? 'var(--danger)' : 'var(--primary-color)',
                  transition: 'width 0.5s ease-out'
                }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Saldo Restante</span>
              <span style={{ fontSize: '1rem', fontWeight: '700', color: cat.balance < 0 ? 'var(--danger)' : 'var(--success)' }}>
                {formatCurrency(cat.balance)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
