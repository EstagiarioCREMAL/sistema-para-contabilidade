import React, { useEffect, useState } from 'react';
import { REPORT_TYPES, useAppContext, getReportName } from '../context/AppContext';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { generateMasterExcel, getLogoBuffer } from '../utils/excelExport';
import { 
  Briefcase, 
  GraduationCap, 
  PieChart, 
  Settings, 
  FileText,
  LayoutDashboard,
  FileSpreadsheet,
  Lock as LockIcon,
  Moon,
  Sun,
  LogOut,
  ClipboardList,
  Loader2,
  HelpCircle
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { 
    reportYear, 
    finalizedReports, 
    setReportYear, 
    entries, 
    budgets, 
    presidentInfo,
    addToast,
    askConfirmation,
    setShowHelp
  } = useAppContext();

  const [theme, setTheme] = useLocalStorage('cremal_theme', 'light');
  // Dynamic years: from 2024 up to next calendar year
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: (currentYear + 1) - 2024 + 1 }, (_, i) => 2024 + i);
  
  const isLocked = (type) => finalizedReports.includes(type);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleLogout = async () => {
    if (await askConfirmation('Sair do Sistema', 'Tem certeza que deseja sair da sua conta?')) {
      localStorage.removeItem('cremal_auth');
      window.location.reload();
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div style={{ backgroundColor: 'white', padding: '0.25rem', borderRadius: '4px' }}>
            <FileText color="#0c2b4d" size={24} />
        </div>
        <div className="sidebar-title">CREMAL Contábil</div>
      </div>
      
      <nav className="sidebar-nav" style={{ marginTop: '1.5rem' }}>
        <div style={{ marginBottom: '1.5rem', padding: '0 1rem' }}>
          <label style={{ 
            color: 'rgba(255,255,255,0.4)', 
            fontSize: '0.65rem', 
            textTransform: 'uppercase', 
            letterSpacing: '0.1em',
            marginBottom: '0.5rem', 
            display: 'block',
            fontWeight: '700'
          }}>
            Exercício Fiscal
          </label>
          <select 
            value={reportYear} 
            onChange={(e) => setReportYear(parseInt(e.target.value))}
            style={{ 
              width: '100%', 
              padding: '0.6rem 0.8rem', 
              backgroundColor: 'rgba(255,255,255,0.08)', 
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 'var(--radius-sm)',
              color: 'white',
              fontSize: '0.95rem',
              outline: 'none',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            {years.map(y => <option key={y} value={y} style={{ color: 'var(--text-primary)', backgroundColor: 'var(--card-bg)' }}>{y}</option>)}
          </select>
        </div>

        <button 
          className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <LayoutDashboard size={20} />
          Início / Dashboard
        </button>
        <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem', paddingLeft: '1rem' }}>
          Exportação Geral
        </p>
        <button 
          className="nav-item"
          disabled={isGenerating}
          style={{ color: 'var(--accent-color)', fontWeight: '700' }}
          onClick={async () => {
            if (isGenerating) return;
            setIsGenerating(true);
            try {
              const logoData = await getLogoBuffer();
              await generateMasterExcel({
                entries,
                budgets,
                getReportName: (type) => getReportName(type, reportYear),
                presidentInfo,
                reportYear,
                includeObservations: true,
                logoBuffer: logoData,
                fileName: `Relatórios_Contábil_${reportYear}.xlsx`
              });
            } catch (error) {
              console.error('Erro ao gerar Master Excel:', error);
              addToast(error.message || 'Erro ao gerar o Relatório Mestre.', 'danger');
            } finally {
              setIsGenerating(false);
            }
          }}
        >
          {isGenerating ? <Loader2 size={20} className="spin" style={{ animation: 'spin 2s linear infinite' }} /> : <FileSpreadsheet size={20} />}
          {isGenerating ? 'Gerando...' : 'Planilha Completa (Todas as Abas)'}
        </button>

        <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.5)', marginTop: '1rem', marginBottom: '0.5rem', paddingLeft: '1rem' }}>
          Relatórios
        </p>
        <button 
          className={`nav-item ${activeTab === REPORT_TYPES.FISCALIZACAO ? 'active' : ''}`}
          onClick={() => setActiveTab(REPORT_TYPES.FISCALIZACAO)}
        >
          <Briefcase size={20} />
          <span style={{ flex: 1 }}>Fiscalização {reportYear}</span>
          {isLocked(REPORT_TYPES.FISCALIZACAO) && <LockIcon size={14} style={{ opacity: 0.8 }} />}
        </button>
        <button 
          className={`nav-item ${activeTab === REPORT_TYPES.EDUCACAO ? 'active' : ''}`}
          onClick={() => setActiveTab(REPORT_TYPES.EDUCACAO)}
        >
          <GraduationCap size={20} />
          <span style={{ flex: 1 }}>Educação Médica {reportYear}</span>
          {isLocked(REPORT_TYPES.EDUCACAO) && <LockIcon size={14} style={{ opacity: 0.8 }} />}
        </button>
        <button 
          className={`nav-item ${activeTab === REPORT_TYPES.COTA ? 'active' : ''}`}
          onClick={() => setActiveTab(REPORT_TYPES.COTA)}
        >
          <PieChart size={20} />
          <span style={{ flex: 1 }}>Cota Parte {reportYear}</span>
          {isLocked(REPORT_TYPES.COTA) && <LockIcon size={14} style={{ opacity: 0.8 }} />}
        </button>
        <button 
          className={`nav-item ${activeTab === REPORT_TYPES.VALID ? 'active' : ''}`}
          onClick={() => setActiveTab(REPORT_TYPES.VALID)}
        >
          <ClipboardList size={20} />
          <span style={{ flex: 1 }}>Relatório VALID {reportYear}</span>
          {isLocked(REPORT_TYPES.VALID) && <LockIcon size={14} style={{ opacity: 0.8 }} />}
        </button>

        <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.5)', marginTop: '2rem', marginBottom: '0.5rem', paddingLeft: '1rem' }}>
          Configurações
        </p>
        <button 
          className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings size={20} />
          Parâmetros do Sistema
        </button>
        
        <button 
          className="nav-item"
          style={{ marginTop: '0.5rem', border: '1px solid rgba(255,255,255,0.1)' }}
          onClick={() => setShowHelp(true)}
        >
          <HelpCircle size={20} />
          Central de Ajuda (Tutorial)
        </button>
      </nav>
      
      <div style={{ marginTop: 'auto' }}>
        <button 
          className="nav-item" 
          style={{ width: '100%', background: 'none', border: 'none', padding: '0.75rem', cursor: 'pointer', textAlign: 'left', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)' }}
          onClick={toggleTheme}
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          <span>{theme === 'light' ? 'Modo Noturno' : 'Modo Claro'}</span>
        </button>
        <button 
          className="nav-item" 
          style={{ width: '100%', background: 'none', border: 'none', padding: '0.75rem', cursor: 'pointer', color: '#f87171', textAlign: 'left' }}
          onClick={handleLogout}
        >
          <LogOut size={20} />
          <span>Sair do Sistema</span>
        </button>
        
        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: '1rem', textAlign: 'center' }}>
          CREMAL Contábil v1.0.1
        </div>
      </div>
    </aside>
  );
}
