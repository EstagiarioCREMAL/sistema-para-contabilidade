import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Save } from 'lucide-react';

export default function Settings() {
  const { 
    presidentInfo, 
    setPresidentInfo, 
    budgets, 
    allBudgets,
    reportYear, 
    entries,
    addToast,
    restoreBackup,
    updateYearBudgets
  } = useAppContext();

  // Local budget state to avoid Firestore write on every keystroke
  const [localBudget, setLocalBudget] = useState({
    fiscalizacao_p1: budgets.fiscalizacao_p1 ?? 0,
    fiscalizacao_p2: budgets.fiscalizacao_p2 ?? 0,
    educacao_p1:     budgets.educacao_p1     ?? 0,
    educacao_p2:     budgets.educacao_p2     ?? 0,
    cota_p1:         budgets.cota_p1         ?? 0,
    cota_p2:         budgets.cota_p2         ?? 0,
    jeton_p1:        budgets.jeton_p1        ?? 0,
    jeton_p2:        budgets.jeton_p2        ?? 0,
  });

  // Sync local budget if remote budget changes (e.g., initial load or different year selected)
  React.useEffect(() => {
    setLocalBudget({
      fiscalizacao_p1: budgets.fiscalizacao_p1 ?? 0,
      fiscalizacao_p2: budgets.fiscalizacao_p2 ?? 0,
      educacao_p1:     budgets.educacao_p1     ?? 0,
      educacao_p2:     budgets.educacao_p2     ?? 0,
      cota_p1:         budgets.cota_p1         ?? 0,
      cota_p2:         budgets.cota_p2         ?? 0,
      jeton_p1:        budgets.jeton_p1        ?? 0,
      jeton_p2:        budgets.jeton_p2        ?? 0,
    });
  }, [budgets]);

  const [isSavingBudget, setIsSavingBudget] = useState(false);

  // Local president state — only persisted to Firestore when user clicks "Salvar Presidente"
  const [localPresident, setLocalPresident] = useState(presidentInfo);
  const [isSavingPresident, setIsSavingPresident] = useState(false);

  // Keep in sync if presidentInfo changes externally (e.g., initial cloud load)
  React.useEffect(() => {
    setLocalPresident(presidentInfo);
  }, [presidentInfo]);

  const handleSavePresident = async () => {
    setIsSavingPresident(true);
    try {
      await setPresidentInfo(localPresident);
      addToast('Assinatura salva com sucesso!', 'success');
    } catch {
      addToast('Erro ao salvar assinatura.', 'danger');
    }
    setIsSavingPresident(false);
  };

  const handleSaveBudgets = async () => {
    setIsSavingBudget(true);
    try {
      await updateYearBudgets({
        fiscalizacao_p1: parseFloat(localBudget.fiscalizacao_p1) || 0,
        fiscalizacao_p2: parseFloat(localBudget.fiscalizacao_p2) || 0,
        educacao_p1:     parseFloat(localBudget.educacao_p1)     || 0,
        educacao_p2:     parseFloat(localBudget.educacao_p2)     || 0,
        cota_p1:         parseFloat(localBudget.cota_p1)         || 0,
        cota_p2:         parseFloat(localBudget.cota_p2)         || 0,
        jeton_p1:        parseFloat(localBudget.jeton_p1)        || 0,
        jeton_p2:        parseFloat(localBudget.jeton_p2)        || 0,
      });
      addToast('Orçamentos salvos com sucesso!', 'success');
    } catch {
      addToast('Erro ao salvar orçamentos.', 'danger');
    }
    setIsSavingBudget(false);
  };

  const handleBackupExport = () => {
    const data = {
      entries,
      allBudgets,
      presidentInfo,
      reportYear,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cremal_backup_${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Backup exportado com sucesso!', 'success');
  };

  const handleBackupRef = React.useRef(null);

  const handleBackupImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result);
        const success = await restoreBackup(data);
        if (success) {
          addToast('Dados restaurados com sucesso!', 'success');
        } else {
          addToast('Erro ao restaurar backup.', 'danger');
        }
      } catch {
        addToast('Erro ao importar backup: arquivo inválido.', 'danger');
      }
    };
    reader.readAsText(file);
  };

  const handlePresidentChange = (e) => {
    setLocalPresident(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Configurações do Sistema</h1>
          <p className="page-subtitle">Ajuste os valores de convênio e o presidente atual.</p>
        </div>
      </div>

      <div className="form-group" style={{ marginTop: '2rem' }}>
        {/* Removido Configurações Gerais / Ano do Relatório por redundância (controlado via Sidebar) */}

        <div className="card glass-panel" style={{ marginBottom: '2rem' }}>
          <h2 className="card-title">Assinatura do Documento</h2>
          <div className="form-row" style={{ marginTop: '1rem' }}>
            <div className="form-group">
              <label>Nome do Presidente</label>
              <input
                type="text"
                name="name"
                value={localPresident.name}
                onChange={handlePresidentChange}
                placeholder="Ex: Consº Benício Luiz Bulhões Barros Paula Nunes"
              />
            </div>
            <div className="form-group">
              <label>Cargo / Título</label>
              <input
                type="text"
                name="role"
                value={localPresident.role}
                onChange={handlePresidentChange}
                placeholder="Ex: Presidente"
              />
            </div>
          </div>
          <button
            className="btn btn-accent"
            style={{ marginTop: '1rem' }}
            onClick={handleSavePresident}
            disabled={isSavingPresident}
          >
            <Save size={16} />
            {isSavingPresident ? 'Salvando...' : 'Salvar Presidente'}
          </button>
        </div>

        <div className="card glass-panel">
          <h2 className="card-title">Valores de Convênio CFM - Exercício {reportYear}</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.4rem', marginBottom: '1rem' }}>
            Informe o orçamento de cada parcela separadamente. O total exibido no relatório será a soma das duas parcelas.
          </p>

          {/* Helper: column headers */}
          <div className="form-row" style={{ marginBottom: '0.25rem', marginTop: '0.25rem' }}>
            <div style={{ flex: 0.6 }} />
            <div style={{ flex: 1, textAlign: 'center', fontSize: '0.78rem', fontWeight: '700', color: 'var(--primary-color)', letterSpacing: '0.03em' }}>1ª PARCELA</div>
            <div style={{ flex: 1, textAlign: 'center', fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.03em' }}>2ª PARCELA</div>
          </div>

          {[
            { label: 'Fiscalização', p1: 'fiscalizacao_p1', p2: 'fiscalizacao_p2' },
            { label: 'Educação Médica', p1: 'educacao_p1', p2: 'educacao_p2' },
          ].map(({ label, p1, p2 }) => (
            <div key={label} className="form-row" style={{ marginTop: '0.75rem', alignItems: 'center' }}>
              <div style={{ flex: 0.6 }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '600', margin: 0 }}>{label}</label>
              </div>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <input
                  type="number"
                  step="0.01"
                  value={localBudget[p1]}
                  onChange={(e) => setLocalBudget(prev => ({ ...prev, [p1]: e.target.value }))}
                  placeholder="0,00"
                />
              </div>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <input
                  type="number"
                  step="0.01"
                  value={localBudget[p2]}
                  onChange={(e) => setLocalBudget(prev => ({ ...prev, [p2]: e.target.value }))}
                  placeholder="0,00"
                />
              </div>
            </div>
          ))}

          <button
            className="btn btn-accent"
            style={{ marginTop: '1.5rem' }}
            onClick={handleSaveBudgets}
            disabled={isSavingBudget}
          >
            <Save size={16} />
            {isSavingBudget ? 'Salvando...' : 'Salvar Orçamentos'}
          </button>
        </div>

        <div className="card glass-panel" style={{ marginTop: '2rem' }}>
          <h2 className="card-title">Segurança e Dados</h2>
          
          {/* Cloud Status Indicator */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.875rem 1rem',
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: 'var(--radius)',
            marginBottom: '1.25rem'
          }}>
            <span style={{ fontSize: '1.25rem' }}>☁️</span>
            <div>
              <p style={{ margin: 0, fontWeight: '600', color: 'var(--success-color, #16a34a)', fontSize: '0.9rem' }}>
                Dados protegidos na Nuvem (Firebase)
              </p>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                Seus lançamentos são sincronizados automaticamente. Limpar o cache do navegador <strong>não apaga seus dados</strong>.
              </p>
            </div>
          </div>

          <p className="page-subtitle" style={{ marginBottom: '1.5rem' }}>
            Para segurança extra, exporte um backup local. Isso permite restaurar os dados em caso de exclusão acidental.
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-outline" onClick={handleBackupExport}>
              📥 Exportar Backup (JSON)
            </button>
            <button className="btn btn-primary" onClick={() => handleBackupRef.current?.click()}>
              📤 Restaurar Dados
            </button>
            <input 
              type="file" 
              ref={handleBackupRef} 
              onChange={handleBackupImport} 
              accept=".json" 
              style={{ display: 'none' }} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
