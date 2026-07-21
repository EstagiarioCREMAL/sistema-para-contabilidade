import React, { useState, useRef, useEffect } from 'react';
import { useAppContext, getReportName, REPORT_TYPES } from '../context/AppContext';
import { Plus, Trash2, FileOutput, FileSpreadsheet, Upload, Search, Edit2, Check, X, Lock as LockIcon, CheckCircle, Loader2 } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatters';
import { generatePDF } from '../utils/pdfExport';
import { generateExcel, generateMasterExcel, importAndFormatExcel } from '../utils/excelExport';

export default function ReportView({ reportType }) {
  const { entries, addEntry, updateEntry, deleteEntry, clearEntriesByType, budgets, presidentInfo, reportYear, finalizedReports, toggleReportLock, addToast, askConfirmation } = useAppContext();
  
  const isLocked = finalizedReports.includes(reportType);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [showObsInExcel, setShowObsInExcel] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportInstallment, setExportInstallment] = useState({ number: '1', value: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [showImportSelect, setShowImportSelect] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [isGeneratingMaster, setIsGeneratingMaster] = useState(false);
  const [savedRowId, setSavedRowId] = useState(null);
  const [selectedReportType, setSelectedReportType] = useState(reportType);
  const [exportReportType, setExportReportType] = useState(reportType);

  const [formData, setFormData] = useState({
    itemIndex: '',
    date: '',
    beneficiary: '',
    purpose: '',
    value: '',
    processNumber: '',
    installment: '',
    observation: ''
  });

  // Keep selectedReportType in sync when user changes active tab
  React.useEffect(() => {
    setSelectedReportType(reportType);
    setExportReportType(reportType);
  }, [reportType]);

  const fileInputRef = useRef(null);

  // Filter entries by type AND year
  const yearFilteredEntries = entries.filter(e => {
    const entryDate = new Date(e.date);
    return e.reportType === reportType && entryDate.getUTCFullYear() === reportYear;
  });

  const currentEntries = yearFilteredEntries.filter(e => {
    const matchesSearch = (e.beneficiary || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (e.purpose || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (e.processNumber && String(e.processNumber).toLowerCase().includes(searchTerm.toLowerCase()));
    
    const entryDate = new Date(e.date);
    const monthStr = String(entryDate.getUTCMonth() + 1).padStart(2, '0');
    const matchesMonth = filterMonth ? monthStr === filterMonth : true;
    
    const matchesValue = filterValue ? e.value >= parseFloat(filterValue) : true;

    return matchesSearch && matchesMonth && matchesValue;
  });
  const currentBudget = budgets[reportType];

  let currentBalance = currentBudget;
  const sortedEntries = [...currentEntries].sort((a, b) => {
    // 1. Sort by Item Index (manual order)
    const idxA = parseInt(a.itemIndex) || 0;
    const idxB = parseInt(b.itemIndex) || 0;
    if (idxA !== idxB) return idxA - idxB;

    // 2. Sort by Process Number (numeric comparison)
    const procA = String(a.processNumber || '');
    const procB = String(b.processNumber || '');
    if (procA !== procB) return procA.localeCompare(procB, undefined, { numeric: true });

    // 3. Sort by Date
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    if (dateA - dateB !== 0) return dateA - dateB;

    // 4. Fallback to ID for stable sorting
    return (a.id || '').localeCompare(b.id || '');
  });

  const tableRows = sortedEntries.map((entry, index) => {
    currentBalance -= entry.value;
    return {
      ...entry,
      displayIndex: entry.itemIndex || (index + 1).toString(),
      balanceAfter: currentBalance
    };
  });

  const totalPages = Math.ceil(tableRows.length / itemsPerPage);
  const currentTableRows = tableRows.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterMonth, filterValue]);

  const totalDespesas = currentEntries.reduce((acc, curr) => acc + curr.value, 0);
  const devolucaoCFM = currentBudget - totalDespesas;

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleStartEdit = (entry) => {
    setEditingId(entry.id);
    setEditData({ ...entry });
  };

  const triggerAutoGrow = (element) => {
    if (!element) return;
    element.style.height = "auto";
    element.style.height = element.scrollHeight + "px";
  };

  const autoGrow = (e) => {
    triggerAutoGrow(e.target);
  };

  const handleSaveEdit = async () => {
    // Inline Edit Validation 1: Process number must be numeric only
    if (editData.processNumber && !/^\d+$/.test(String(editData.processNumber).trim())) {
      addToast('Nº do Processo deve conter apenas números.', 'danger');
      return;
    }
    // Inline Edit Validation 2: Beneficiary must not contain digits
    if (/\d/.test(editData.beneficiary || '')) {
      addToast('Nome do Beneficiário não deve conter números.', 'danger');
      return;
    }
    // Inline Edit Validation 3: Date must belong to the selected report year
    if (editData.date) {
      const editYear = new Date(editData.date).getUTCFullYear();
      if (editYear !== reportYear) {
        const confirmed = await askConfirmation(
          'Atenção: Ano Diferente',
          `A data editada (${editYear}) é diferente do exercício ativo (${reportYear}). Salvar mesmo assim?`
        );
        if (!confirmed) return;
      }
    }
    try {
      await updateEntry(editingId, editData);
      const finishedId = editingId;
      setEditingId(null);
      setSavedRowId(finishedId);
      setTimeout(() => setSavedRowId(null), 2000);
      addToast('Lançamento atualizado com sucesso!');
    } catch {
      addToast('Erro ao atualizar lançamento.', 'danger');
    }
  };

  const handleCancelEdit = async (row) => {
    if (
      editData.beneficiary !== row.beneficiary ||
      editData.purpose !== row.purpose ||
      editData.date !== row.date ||
      editData.value !== row.value ||
      (editData.itemIndex || '') !== (row.itemIndex || '') ||
      (editData.processNumber || '') !== (row.processNumber || '') ||
      (editData.installment || '') !== (row.installment || '') ||
      (editData.observation || '') !== (row.observation || '')
    ) {
      const confirmed = await askConfirmation('Alterações não salvas', 'Existem alterações não salvas. Tem certeza que deseja cancelar?');
      if (!confirmed) return;
    }
    setEditingId(null);
  };

  const handleDelete = async (id) => {
    if (await askConfirmation('Excluir Lançamento', 'Tem certeza que deseja excluir esta despesa?')) {
      try {
        await deleteEntry(id);
        addToast('Lançamento removido.', 'info');
      } catch {
        addToast('Erro ao remover lançamento.', 'danger');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation 1: Process number must be numeric only
    if (formData.processNumber && !/^\d+$/.test(formData.processNumber.trim())) {
      addToast('Nº do Processo deve conter apenas números.', 'danger');
      return;
    }

    // Validation 2: Beneficiary must not contain digits
    if (/\d/.test(formData.beneficiary)) {
      addToast('Nome do Beneficiário não deve conter números.', 'danger');
      return;
    }

    // Validation 3: Duplicate detection (uses selectedReportType)
    if (formData.processNumber) {
      const duplicate = entries.find(e =>
        e.reportType === selectedReportType &&
        String(e.processNumber) === String(formData.processNumber).trim() &&
        e.date === formData.date
      );
      if (duplicate) {
        const confirmed = await askConfirmation(
          '⚠️ Possível Duplicata',
          `Já existe um lançamento com o Processo nº ${formData.processNumber} na data ${formData.date} em "${REPORT_LABEL[selectedReportType]}". Deseja lançar mesmo assim?`
        );
        if (!confirmed) return;
      }
    }

    // Validation 4: Date must belong to the selected report year
    const entryYear = new Date(formData.date).getUTCFullYear();
    if (entryYear !== reportYear) {
      const confirmed = await askConfirmation('Atenção: Ano Diferente', `A data deste lançamento (${entryYear}) é diferente do exercício ativo (${reportYear}). Deseja lançar assim mesmo?`);
      if (!confirmed) return;
    }

    setIsSubmitting(true);
    try {
      const newId = await addEntry({
        reportType: selectedReportType,
        itemIndex: formData.itemIndex,
        date: formData.date,
        beneficiary: formData.beneficiary,
        purpose: formData.purpose,
        value: parseFloat(formData.value),
        processNumber: formData.processNumber,
        installment: formData.installment || '',
        observation: formData.observation
      });

      const targetLabel = REPORT_LABEL[selectedReportType];
      addToast(`Lançamento adicionado em "${targetLabel}" com sucesso!`, 'success');
      setSavedRowId(newId);
      setTimeout(() => setSavedRowId(null), 2000);

      setFormData({
        itemIndex: '',
        date: '',
        beneficiary: '',
        purpose: '',
        value: '',
        processNumber: '',
        installment: '',
        observation: ''
      });
      // Keep the selected type so user can keep filing to the same report without reselecting
    } catch {
      addToast('Erro ao adicionar lançamento.', 'danger');
    }
    setIsSubmitting(false);
  };

  const handleFileImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPendingFile(file);
    setShowImportSelect(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const confirmImport = async (forcedInstallment = null) => {
    if (!pendingFile) return;
    
    setShowImportSelect(false);
    setIsImporting(true);
    const file = pendingFile;
    setPendingFile(null);

    try {
      // 1. Process the file first to know which report types are inside
      const results = await importAndFormatExcel(file, reportYear, forcedInstallment);
      
      const typesFound = Object.keys(results).filter(type => results[type].length > 0);
      
      if (typesFound.length === 0) {
        throw new Error('Nenhum dado compatível encontrado nas abas da planilha. Verifique se os nomes das abas incluem "Fiscal", "Educação" ou "Outros".');
      }

      // 2. Check if ANY of the found types already have data in the system
      const existingTypesWithData = typesFound.filter(type => {
        return entries.some(e => e.reportType === type && new Date(e.date).getUTCFullYear() === reportYear);
      });

      if (existingTypesWithData.length > 0) {
        const typeNames = existingTypesWithData.map(t => t === 'fiscalizacao' ? 'Fiscalização' : t === 'educacao' ? 'Ed. Médica' : t === 'cota' ? 'Cota Parte' : t).join(', ');
        const shouldClear = await askConfirmation(
          'Limpar Dados Existentes?', 
          `Foram detectados dados para: ${typeNames}. Já existem lançamentos nestes relatórios. Deseja APAGAR os dados atuais deles antes de importar os novos para evitar duplicidade?`
        );
        
        if (shouldClear) {
          for (const type of existingTypesWithData) {
            await clearEntriesByType(type);
          }
          addToast('Relatórios limpos com sucesso.', 'info');
        }
      }

      // 3. Persist all entries to Firestore
      let totalCount = 0;
      for (const type of typesFound) {
        totalCount += results[type].length;
        for (const entry of results[type]) {
          const { id: _, ...entryData } = entry;
          await addEntry(entryData);
        }
      }

      addToast(`Importação concluída! ${totalCount} itens processados em ${typesFound.length} relatórios.`, 'success');
    } catch (err) {
      addToast(`Erro na importação: ${err.message}`, 'danger');
    }
    
    setIsImporting(false);
  };

  // Entries filtered by year for export (not affected by search/month/value filters)
  const entriesForExport = yearFilteredEntries;

  const pageTitle = getReportName(reportType, reportYear).split(' - ')[1];

  // Column count for footer colSpan (7 cols without actions, 8 with)
  const totalCols = isLocked ? 7 : 8;

  // Labels for the report type selector
  const REPORT_LABEL = {
    [REPORT_TYPES.FISCALIZACAO]: 'Fiscalização',
    [REPORT_TYPES.EDUCACAO]: 'Educação Médica',
    [REPORT_TYPES.COTA]: 'Cota Parte'
  };

  // Entries + budget for the currently selected export type
  const exportBudget = budgets[exportReportType];
  const exportEntriesForModal = entries.filter(e => {
    const entryDate = new Date(e.date);
    return e.reportType === exportReportType && entryDate.getUTCFullYear() === reportYear;
  });

  return (
    <>
      <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{pageTitle}</h1>
          <p className="page-subtitle">Convênio Atual: {formatCurrency(currentBudget)}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-end' }}>
          <div className="recommended-box" style={{ textAlign: 'left' }}>
            <span className="recommended-label">OPÇÃO RECOMENDADA</span>
            <button 
              className="btn btn-master"
              disabled={isGeneratingMaster}
              onClick={async () => {
                if (isGeneratingMaster) return;
                setIsGeneratingMaster(true);
                await new Promise(r => setTimeout(r, 50)); // Allow UI to update
                try {
                  await generateMasterExcel({
                    entries,
                    budgets,
                    getReportName,
                    presidentInfo,
                    reportYear,
                    includeObservations: showObsInExcel,
                    fileName: `Relatórios_Contábil_${reportYear}.xlsx`
                  });
                  addToast('Download do Relatório Mestre finalizado!', 'success');
                } catch (error) {
                  console.error('Erro ao gerar Master Excel:', error);
                  addToast(error.message || 'Erro ao gerar o Relatório Mestre.', 'danger');
                } finally {
                  setIsGeneratingMaster(false);
                }
              }}
            >
              {isGeneratingMaster ? <Loader2 size={24} className="spin" style={{ animation: 'spin 2s linear infinite' }} /> : <FileSpreadsheet size={24} />}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ fontWeight: '700' }}>{isGeneratingMaster ? 'Gerando...' : 'Baixar Relatório Mestre'}</span>
                <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>(Tudo em 1 Arquivo Excel)</span>
              </div>
            </button>
            <p className="recommended-desc">
              Contém Fiscalização, Ed. Médica e Cota Parte em abas separadas.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>

          <button 
            className="btn btn-primary"
            disabled={isExportingPdf}
            onClick={async () => {
              setIsExportingPdf(true);
              await new Promise(r => setTimeout(r, 50)); // Allow UI to update
              try {
                await generatePDF({
                  reportType,
                  reportName: getReportName(reportType, reportYear),
                  entries: entriesForExport,
                  budget: currentBudget,
                  presidentInfo,
                  reportYear
                });
              } catch {
                addToast('Erro ao gerar PDF.', 'danger');
              }
              setIsExportingPdf(false);
            }}
          >
            <FileOutput size={18} />
            {isExportingPdf ? 'Gerando...' : 'Exportar PDF'}
          </button>
          
          <button 
            className="btn btn-outline"
            style={{ backgroundColor: 'var(--primary-color)', color: 'white' }}
            onClick={() => setShowExportModal(true)}
          >
            <FileOutput size={18} />
            Mais Opções de Exportação
          </button>

          <button 
            className={`btn ${isLocked ? 'btn-outline' : 'btn-primary'}`}
            style={isLocked ? { color: 'var(--success)', borderColor: 'var(--success)' } : { backgroundColor: 'var(--primary-color)' }}
            onClick={async () => {
              if (isLocked) {
                if (await askConfirmation('Reabrir Relatório', 'Deseja reabrir este relatório para edições?')) {
                  toggleReportLock(reportType);
                  addToast('Relatório reaberto para edições.', 'info');
                }
              } else {
                if (await askConfirmation('Finalizar Relatório', 'Deseja finalizar esta prestação de contas? Isso bloqueará novas edições.')) {
                  toggleReportLock(reportType);
                  addToast('Prestação de contas finalizada e bloqueada.', 'success');
                }
              }
            }}
          >
            {isLocked ? <Check size={18} /> : <LockIcon size={18} />}
            {isLocked ? 'Relatório Finalizado' : 'Finalizar Relatório'}
          </button>

          <button
            className="btn btn-danger"
            style={{ marginLeft: 'auto' }}
            disabled={isLocked || tableRows.length === 0}
            onClick={async () => {
              if (await askConfirmation('LIMPAR TABELA', `TEM CERTEZA? Isso excluirá TODOS os ${tableRows.length} lançamentos deste relatório (${pageTitle}) na nuvem!`)) {
                if (await askConfirmation('CONFIRMAÇÃO FINAL', 'Deseja realmente APAGAR TUDO? Esta ação não pode ser desfeita.')) {
                  try {
                    await clearEntriesByType(reportType);
                    addToast('Relatório limpo com sucesso!', 'info');
                  } catch {
                    addToast('Erro ao excluir lançamentos.', 'danger');
                  }
                }
              }
            }}
          >
            <Trash2 size={18} />
            Limpar Tabela
          </button>

          <button
            className="btn btn-outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting || isLocked}
          >
            <Upload size={18} />
            {isImporting ? 'Importando...' : 'Importar Excel'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: '0.5rem' }}>
            <input 
              type="checkbox" 
              id="showObs" 
              checked={showObsInExcel} 
              onChange={(e) => setShowObsInExcel(e.target.checked)} 
              style={{ width: '16px', height: '16px' }}
            />
            <label htmlFor="showObs" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>Obs. Excel</label>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileImport}
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
          />
        </div>
      </div>
    </div>

      {isLocked && (
        <div className="glass-panel fade-in" style={{ 
          marginTop: '1.5rem', 
          padding: '1rem', 
          backgroundColor: '#ecfdf5', 
          borderLeft: '4px solid var(--success)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <CheckCircle size={20} style={{ color: 'var(--success)' }} />
          <div>
            <strong style={{ color: '#065f46' }}>Relatório Consolidado.</strong>
            <p style={{ fontSize: '0.875rem', color: '#047857', margin: 0 }}>Este relatório está bloqueado para edições. Para realizar alterações, clique em "Relatório Finalizado" no topo.</p>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '2rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div className="search-input-container" style={{ flex: 3, minWidth: '300px' }}>
          <Search className="search-icon" size={18} />
          <input
            type="text"
            className="search-input"
            placeholder="Pesquisar por beneficiário, finalidade ou número do processo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="search-clear" onClick={() => setSearchTerm('')}>
              <X size={14} />
            </button>
          )}
        </div>

        <div style={{ flex: 1, minWidth: '150px' }}>
          <select 
            value={filterMonth} 
            onChange={(e) => setFilterMonth(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}
          >
            <option value="">Todos os Meses</option>
            <option value="01">Janeiro</option>
            <option value="02">Fevereiro</option>
            <option value="03">Março</option>
            <option value="04">Abril</option>
            <option value="05">Maio</option>
            <option value="06">Junho</option>
            <option value="07">Julho</option>
            <option value="08">Agosto</option>
            <option value="09">Setembro</option>
            <option value="10">Outubro</option>
            <option value="11">Novembro</option>
            <option value="12">Dezembro</option>
          </select>
        </div>

        <div className="search-input-container" style={{ flex: 1, minWidth: '150px' }}>
          <div style={{ position: 'absolute', left: '0.75rem', fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 'bold' }}>R$</div>
          <input
            type="number"
            className="search-input filter-value-input"
            placeholder="Valor Mínimo"
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
          />
        </div>
      </div>

      <div className="card glass-panel" style={{ 
        marginTop: '1.5rem', 
        marginBottom: '2rem',
        opacity: isLocked ? 0.6 : 1,
        pointerEvents: isLocked ? 'none' : 'auto'
      }}>
        <h2 className="card-title"><Plus size={20} /> Adicionar Nova Despesa {isLocked && '(Bloqueado)'}</h2>
        <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>

          {/* Report type selector — allows filing into any report without switching tabs */}
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '700', color: 'var(--primary-color)' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '20px', height: '20px', borderRadius: '50%',
                backgroundColor: 'var(--primary-color)', color: 'white',
                fontSize: '0.7rem', fontWeight: '800', flexShrink: 0
              }}>R</span>
              Tipo de Relatório
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
              {Object.entries(REPORT_LABEL).map(([type, label]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedReportType(type)}
                  style={{
                    padding: '0.45rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    border: selectedReportType === type
                      ? '2px solid var(--primary-color)'
                      : '2px solid var(--border-color)',
                    backgroundColor: selectedReportType === type
                      ? 'var(--primary-color)'
                      : 'transparent',
                    color: selectedReportType === type
                      ? 'white'
                      : 'var(--text-secondary)',
                    fontWeight: selectedReportType === type ? '700' : '500',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {selectedReportType !== reportType && (
              <p style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--primary-color)', fontWeight: '600' }}>
                ⚡ Esta despesa será lançada em <strong>{REPORT_LABEL[selectedReportType]}</strong> (não na aba atual)
              </p>
            )}
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 0.5 }}>
              <label>Nº (Seq.)</label>
              <input
                type="text"
                name="itemIndex"
                value={formData.itemIndex}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setFormData(prev => ({ ...prev, itemIndex: val }));
                }}
                placeholder="Ex: 1"
                inputMode="numeric"
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Nº do Processo / Item</label>
              <input
                type="text"
                name="processNumber"
                value={formData.processNumber}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setFormData(prev => ({ ...prev, processNumber: val }));
                }}
                placeholder="Ex: 37"
                inputMode="numeric"
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Data</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                min={`${reportYear}-01-01`}
                max={`${reportYear}-12-31`}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, date: e.target.value }));
                }}
                required
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Parcela (Opcional)</label>
              <input type="number" min="0" step="1" name="installment" value={formData.installment} onChange={handleChange} placeholder="Ex: 1" />
            </div>
          </div>
          <div className="form-row" style={{ marginTop: '1rem' }}>
            <div className="form-group" style={{ flex: 2 }}>
              <label>Nome do Beneficiário</label>
              <input
                type="text"
                name="beneficiary"
                value={formData.beneficiary}
                onChange={(e) => {
                  // Block digits from being typed
                  const val = e.target.value.replace(/\d/g, '');
                  setFormData(prev => ({ ...prev, beneficiary: val }));
                }}
                placeholder="Ex: MV Com. E Rep."
                required
              />
            </div>
            <div className="form-group" style={{ flex: 2 }}>
              <label>Finalidade</label>
              <input type="text" name="purpose" value={formData.purpose} onChange={handleChange} placeholder="Descreva o motivo..." required />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Valor (R$)</label>
              <input type="number" min="0" step="0.01" name="value" value={formData.value} onChange={handleChange} placeholder="0.00" required />
            </div>
          </div>
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label>Observação (Opcional - Apenas Excel)</label>
            <input type="text" name="observation" value={formData.observation} onChange={handleChange} placeholder="Notas internas..." />
          </div>
          <button type="submit" className="btn btn-accent" style={{ marginTop: '1.5rem' }} disabled={isSubmitting || isLocked}>
            <Plus size={18} /> {isSubmitting ? 'Lançando...' : `Lançar em ${REPORT_LABEL[selectedReportType]}`}
          </button>
        </form>
      </div>

      <div className="table-container shadow-md">
        <table className="data-table">
          <thead>
            <tr>
              <th width="5%">Nº</th>
              <th width="10%" className="nowrap">Data</th>
              <th width="15%">Beneficiário</th>
              <th width="22%">Finalidade</th>
              <th width="8%">Processo</th>
              <th width="10%">Parcela</th>
              <th width="12%" className="nowrap">Valor</th>
              <th width="12%" className="nowrap">Saldo</th>
              {!isLocked && <th width="7%">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {tableRows.length === 0 ? (
              <tr>
                <td colSpan={isLocked ? 8 : 9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>
                  Nenhum lançamento encontrado.
                </td>
              </tr>
            ) : null}
            {currentTableRows.map((row) => (
              <tr key={row.id} className={savedRowId === row.id ? 'row-saved-glow' : ''}>
                {/* 0. INDEX */}
                <td style={{ fontWeight: '700', color: 'var(--text-secondary)', textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.02)' }}>
                  {editingId === row.id ? (
                    <input 
                      type="text" 
                      className="table-edit-input"
                      inputMode="numeric"
                      value={editData.itemIndex || ''} 
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setEditData({ ...editData, itemIndex: val });
                      }}
                    />
                  ) : (
                    row.displayIndex
                  )}
                </td>

                {/* 1. DATA */}
                <td className="nowrap">
                  {editingId === row.id ? (
                    <input 
                      type="date" 
                      className="table-edit-input"
                      value={editData.date}
                      min={`${reportYear}-01-01`}
                      max={`${reportYear}-12-31`}
                      onChange={(e) => setEditData({ ...editData, date: e.target.value })} 
                    />
                  ) : (
                    formatDate(row.date)
                  )}
                </td>

                {/* 2. BENEFICIARIO */}
                <td>
                  {editingId === row.id ? (
                    <textarea 
                      className="table-edit-textarea"
                      value={editData.beneficiary} 
                      ref={triggerAutoGrow}
                      onFocus={autoGrow}
                      onInput={autoGrow}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\d/g, '');
                        setEditData({ ...editData, beneficiary: val });
                      }}
                      style={{ overflow: 'hidden' }}
                      autoFocus
                    />
                  ) : (
                    row.beneficiary
                  )}
                </td>

                {/* 3. FINALIDADE */}
                <td>
                  {editingId === row.id ? (
                    <textarea 
                      className="table-edit-textarea"
                      value={editData.purpose} 
                      ref={triggerAutoGrow}
                      onFocus={autoGrow}
                      onInput={autoGrow}
                      onChange={(e) => setEditData({ ...editData, purpose: e.target.value })} 
                      style={{ overflow: 'hidden' }}
                    />
                  ) : (
                    row.purpose
                  )}
                </td>

                {/* 4. PROCESSO */}
                <td style={{ fontWeight: '600', color: 'var(--primary-color)' }}>
                  {editingId === row.id ? (
                    <input 
                      type="text" 
                      className="table-edit-input"
                      inputMode="numeric"
                      value={editData.processNumber || ''} 
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setEditData({ ...editData, processNumber: val });
                      }}
                    />
                  ) : (
                    row.processNumber || '-'
                  )}
                </td>

                {/* 5. PARCELA */}
                <td style={{ textAlign: 'center' }}>
                  {editingId === row.id ? (
                    <input 
                      type="number" 
                      min="0"
                      step="1"
                      className="table-edit-input"
                      value={editData.installment || ''} 
                      onChange={(e) => setEditData({ ...editData, installment: e.target.value })} 
                    />
                  ) : (
                    row.installment ? <span className="badge-parcela">{row.installment}ª</span> : '-'
                  )}
                </td>

                {/* 6. VALOR */}
                <td className="nowrap" style={{ fontWeight: '500' }}>
                  {editingId === row.id ? (
                    <input 
                      type="number" 
                      min="0"
                      step="0.01"
                      className="table-edit-input"
                      value={editData.value} 
                      onChange={(e) => setEditData({ ...editData, value: parseFloat(e.target.value) || 0 })} 
                    />
                  ) : (
                    formatCurrency(row.value)
                  )}
                </td>

                {/* 7. SALDO */}
                <td className={`nowrap ${row.balanceAfter < 0 ? 'text-danger fw-bold' : 'text-primary fw-bold'}`}>
                  {formatCurrency(row.balanceAfter)}
                </td>

                {!isLocked && <td>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    {editingId === row.id ? (
                      <>
                        <button onClick={handleSaveEdit} className="btn-icon success" title="Salvar">
                          <Check size={18} />
                        </button>
                        <button onClick={() => handleCancelEdit(row)} className="btn-icon danger" title="Cancelar">
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => handleStartEdit(row)} className="btn-icon primary" title="Editar">
                          <Edit2 size={18} />
                        </button>
                        <button onClick={() => handleDelete(row.id)} className="btn-icon danger" title="Excluir">
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </td>}
              </tr>
            ))}
          </tbody>
          {tableRows.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={totalCols - 2} style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--primary-color)' }}>TOTAL DE DESPESAS:</td>
                <td colSpan={2} style={{ fontWeight: 'bold' }}>{formatCurrency(totalDespesas)}</td>
              </tr>
              <tr>
                <td colSpan={totalCols - 2} style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--danger)' }}>DEVOLUÇÃO AO CFM:</td>
                <td colSpan={2} style={{ fontWeight: 'bold', color: 'var(--danger)' }}>
                  {formatCurrency(devolucaoCFM)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'var(--bg-color)', borderTop: '1px solid var(--border-color)', borderBottomLeftRadius: 'var(--radius)', borderBottomRightRadius: 'var(--radius)' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Página {currentPage} de {totalPages} (Total: {tableRows.length} itens)
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                className="btn btn-outline" 
                style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                Anterior
              </button>
              <button 
                className="btn btn-outline" 
                style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card glass-panel fade-in" style={{ width: '450px', padding: '2rem' }}>
            <h2 className="card-title"><FileOutput size={24} /> Opções de Exportação Avançadas</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1.5rem' }}>
              
              <div style={{ padding: '1rem', backgroundColor: 'var(--primary-light)', borderRadius: 'var(--radius)', border: '2px solid var(--primary-color)' }}>
                <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>OPÇÃO RECOMENDADA</label>
                <button 
                  className="btn btn-accent" 
                  style={{ width: '100%', padding: '1rem' }}
                  onClick={async () => {
                    addToast('Gerando Relatório Mestre...');
                    await new Promise(r => setTimeout(r, 50)); // Allow UI to update
                    try {
                      await generateMasterExcel({
                        entries, // Pass all entries
                        budgets, // Pass all budgets
                        getReportName,
                        presidentInfo,
                        reportYear,
                        includeObservations: showObsInExcel,
                        fileName: `Relatórios_Contábil_${reportYear}.xlsx`
                      });
                      setShowExportModal(false);
                      addToast('Download concluído!', 'success');
                    } catch (error) {
                      console.error('Erro ao gerar Master Excel:', error);
                      addToast(error.message || 'Erro ao gerar o Relatório Mestre.', 'danger');
                    }
                  }}
                >
                  <FileSpreadsheet size={20} /> Baixar Relatório Mestre (Tudo em 1 Arquivo)
                </button>
                <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
                  Contém Fiscalização, Ed. Médica e Cota Parte em abas separadas.
                </p>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>Relatório Individual</label>
                <select
                  value={exportReportType}
                  onChange={(e) => setExportReportType(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginBottom: '0.75rem', fontSize: '0.875rem' }}
                >
                  <option value={REPORT_TYPES.FISCALIZACAO}>Fiscalização</option>
                  <option value={REPORT_TYPES.EDUCACAO}>Educação Médica</option>
                  <option value={REPORT_TYPES.COTA}>Cota Parte</option>
                </select>
                <button 
                  className="btn btn-outline" 
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={async () => {
                    addToast('Gerando Relatório...');
                    await new Promise(r => setTimeout(r, 50)); // Allow UI to update
                    try {
                      const cleanName = exportReportType === 'fiscalizacao' ? 'fiscalização' : exportReportType === 'educacao' ? 'educação_médica' : 'cota_parte';
                      await generateExcel({
                        reportType: exportReportType,
                        reportName: getReportName(exportReportType, reportYear),
                        entries: exportEntriesForModal,
                        budget: exportBudget,
                        presidentInfo,
                        includeObservations: showObsInExcel,
                        fileName: `${cleanName}_contabil${reportYear}.xlsx`
                      });
                      setShowExportModal(false);
                      addToast('Relatório gerado com sucesso!', 'success');
                    } catch (error) {
                      console.error('Erro ao gerar Excel individual:', error);
                      addToast(error.message || 'Erro ao gerar o relatório individual.', 'danger');
                    }
                  }}
                >
                  Baixar {exportReportType === 'fiscalizacao' ? 'Fiscalização' : exportReportType === 'educacao' ? 'Educação Médica' : 'Cota Parte'}
                </button>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.875rem', fontWeight: 'bold' }}>Exportar por Parcela Específica</label>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  O relatório selecionado acima (Relatório Individual) também é usado aqui.
                </p>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.75rem' }}>Nº</label>
                    <input 
                      type="number" 
                      value={exportInstallment.number}
                      onChange={(e) => setExportInstallment({ ...exportInstallment, number: e.target.value })}
                      style={{ width: '100%', padding: '0.5rem' }}
                    />
                  </div>
                  <div style={{ flex: 2 }}>
                    <label style={{ fontSize: '0.75rem' }}>Valor Estimado (R$)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      placeholder="0,00"
                      value={exportInstallment.value}
                      onChange={(e) => setExportInstallment({ ...exportInstallment, value: e.target.value })}
                      style={{ width: '100%', padding: '0.5rem' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    className="btn btn-outline" 
                    style={{ flex: 1, fontSize: '0.875rem', padding: '0.5rem', display: 'flex', justifyContent: 'center' }}
                    disabled={!exportInstallment.value}
                    onClick={async () => {
                      addToast('Gerando Excel da Parcela...');
                      await new Promise(r => setTimeout(r, 50)); // Allow UI to update
                      try {
                        const filteredEntries = exportEntriesForModal.filter(e => String(e.installment) === String(exportInstallment.number));
                        const cleanName = exportReportType === 'fiscalizacao' ? 'fiscalização' : exportReportType === 'educacao' ? 'educação_médica' : 'cota_parte';
                        await generateExcel({
                          reportType: exportReportType,
                          reportName: getReportName(exportReportType, reportYear),
                          entries: filteredEntries,
                          budget: exportBudget,
                          presidentInfo,
                          includeObservations: showObsInExcel,
                          installmentInfo: {
                            number: exportInstallment.number,
                            value: parseFloat(exportInstallment.value)
                          },
                          fileName: `${cleanName}_parcela_${exportInstallment.number}_contabil${reportYear}.xlsx`
                        });
                        setShowExportModal(false);
                        addToast('Relatório Excel de parcela gerado!', 'success');
                      } catch (error) {
                        console.error('Erro ao gerar Excel de parcela:', error);
                        addToast(error.message || 'Erro ao gerar relatório Excel de parcela.', 'danger');
                      }
                    }}
                  >
                    Gerar Excel
                  </button>
                  <button 
                    className="btn btn-primary" 
                    style={{ flex: 1, fontSize: '0.875rem', padding: '0.5rem', display: 'flex', justifyContent: 'center' }}
                    disabled={!exportInstallment.value}
                    onClick={async () => {
                      addToast('Gerando PDF da Parcela...');
                      await new Promise(r => setTimeout(r, 50)); // Allow UI to update
                      try {
                        const filteredEntries = exportEntriesForModal.filter(e => String(e.installment) === String(exportInstallment.number));
                        await generatePDF({
                          reportType: exportReportType,
                          reportName: getReportName(exportReportType, reportYear),
                          entries: filteredEntries,
                          budget: exportBudget,
                          presidentInfo,
                          installmentInfo: {
                            number: exportInstallment.number,
                            value: parseFloat(exportInstallment.value)
                          },
                          reportYear
                        });
                        setShowExportModal(false);
                        addToast('Relatório PDF de parcela gerado!', 'success');
                      } catch (error) {
                        console.error('Erro ao gerar PDF de parcela:', error);
                        addToast(error.message || 'Erro ao gerar relatório PDF de parcela.', 'danger');
                      }
                    }}
                  >
                    Gerar PDF
                  </button>
                </div>
              </div>

              <button 
                className="btn btn-outline" 
                style={{ marginTop: '0.5rem' }} 
                onClick={() => setShowExportModal(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Import Selection Modal */}
      {showImportSelect && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1100,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="card glass-panel fade-in" style={{ width: '400px', padding: '2rem', textAlign: 'center' }}>
            <div style={{ backgroundColor: 'var(--primary-light)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <Upload size={30} style={{ color: 'var(--primary-color)' }} />
            </div>
            <h2 className="card-title" style={{ marginBottom: '0.5rem' }}>Importar Planilha</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Deseja associar os dados a uma parcela específica ou usar a detecção automática do arquivo?
            </p>
            
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <button className="btn btn-primary" onClick={() => confirmImport(null)}>
                Detectar Automaticamente
              </button>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <button className="btn btn-outline" onClick={() => confirmImport('1')}>
                  1ª Parcela
                </button>
                <button className="btn btn-outline" onClick={() => confirmImport('2')}>
                  2ª Parcela
                </button>
              </div>
              <button className="btn btn-danger" style={{ marginTop: '0.5rem' }} onClick={() => {
                setShowImportSelect(false);
                setPendingFile(null);
              }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
