import React, { useState } from 'react';
import { Download, Upload, Trash2, Lock } from 'lucide-react';
import { useAppContext, getReportName } from '../context/AppContext';
import { formatCurrency, formatDate } from '../utils/formatters';

import { generateValidPDF } from '../utils/pdfExport';
import { generateValidExcel, importAndFormatExcel } from '../utils/excelExport';

export default function ValidReportView() {
  const { 
    entries, 
    addEntry, 
    deleteEntry, 
    clearEntriesByType,
    reportYear,
    finalizedReports,
    toggleReportLock,
    addToast,
    askConfirmation,
    presidentInfo // for signature
  } = useAppContext();

  const isFinalized = finalizedReports.includes('valid');

  // Filter entries for this specific year and type
  const yearEntries = entries.filter(e => {
    const entryDate = new Date(e.date);
    return e.reportType === 'valid' && entryDate.getUTCFullYear() === reportYear;
  }).sort((a, b) => new Date(a.date) - new Date(b.date));

  const [selectedMonth, setSelectedMonth] = useState('all');

  const [isImporting, setIsImporting] = useState(false);
  const [formData, setFormData] = useState({
    category: 'CIM_CIC', // CIM_CIC or CPM
    date: '',
    unitValue: '',
    quantity: ''
  });

  const displayEntries = yearEntries.filter(e => {
    if (selectedMonth === 'all') return true;
    const entryMonth = new Date(e.date).getUTCMonth() + 1; // 1 to 12
    return entryMonth === parseInt(selectedMonth);
  });

  const handleExportPDF = async () => {
    addToast('Gerando PDF Valid...');
    await new Promise(r => setTimeout(r, 50));
    try {
      await generateValidPDF({ reportYear, entries: displayEntries, presidentInfo, selectedMonth });
      addToast('PDF gerado com sucesso!', 'success');
    } catch {
      addToast('Erro ao gerar PDF', 'danger');
    }
  };

  const handleExportExcel = async () => {
    addToast('Gerando Excel Valid...');
    await new Promise(r => setTimeout(r, 50));
    try {
      await generateValidExcel({ entries: displayEntries, reportYear, selectedMonth });
      addToast('Excel gerado com sucesso!', 'success');
    } catch {
      addToast('Erro ao gerar Excel', 'danger');
    }
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isFinalized) {
      addToast('Relatório finalizado. Desbloqueie para importar.', 'danger');
      return;
    }

    setIsImporting(true);
    addToast('Lendo planilha Excel...', 'info');

    try {
      const results = await importAndFormatExcel(file);
      const validImports = results.valid || [];
      
      if (validImports.length === 0) {
        addToast('Nenhum dado VALID encontrado na planilha.', 'danger');
        setIsImporting(false);
        return;
      }
      
      // Import sequentially or batch (we'll just use addEntry for simplicity or all at once)
      for (const entry of validImports) {
         await addEntry(entry);
      }
      
      addToast(`${validImports.length} lançamentos importados com sucesso!`, 'success');
    } catch (error) {
      console.error(error);
      addToast('Erro ao processar o arquivo Excel.', 'danger');
    } finally {
      setIsImporting(false);
      e.target.value = ''; // clear input
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isFinalized) return;
    
    if (!formData.date || !formData.unitValue || !formData.quantity) {
      addToast('Preencha os campos obrigatórios.', 'danger');
      return;
    }

    const value = parseFloat(formData.unitValue) * parseInt(formData.quantity, 10);

    try {
      await addEntry({
        reportType: 'valid',
        category: formData.category,
        date: formData.date,
        unitValue: parseFloat(formData.unitValue),
        quantity: parseInt(formData.quantity, 10),
        value: value
      });
      
      setFormData(prev => ({ ...prev, date: '', unitValue: '', quantity: '' }));
      addToast('Lançamento VALID adicionado com sucesso!');
    } catch {
      addToast('Erro ao adicionar lançamento.', 'danger');
    }
  };

  const handleDelete = async (id) => {
    if (isFinalized) return;
    if (await askConfirmation('Excluir Lançamento', 'Tem certeza que deseja excluir este lançamento?')) {
      try {
        await deleteEntry(id);
        addToast('Lançamento removido.');
      } catch {
        addToast('Erro ao remover.', 'danger');
      }
    }
  };

  const handleClearTable = async () => {
    if (isFinalized) return;
    if (await askConfirmation('LIMPAR TABELA', 'TEM CERTEZA? Todos os lançamentos do VALID do exercício atual serão excluídos.')) {
      try {
        await clearEntriesByType('valid');
        addToast('Tabela limpa com sucesso!');
      } catch {
        addToast('Erro ao limpar tabela.', 'danger');
      }
    }
  };

  const renderTable = (category, title) => {
    const tableEntries = displayEntries.filter(e => e.category === category);
    const totalQty = tableEntries.reduce((sum, e) => sum + e.quantity, 0);
    const totalValue = tableEntries.reduce((sum, e) => sum + e.value, 0);

    return (
      <div style={{ marginBottom: '3rem' }}>
        <h3 className="card-title" style={{ color: category === 'CIM_CIC' ? '#e28743' : '#c46b2b' }}>
          {title}
        </h3>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>MÊS DE REFERÊNCIA</th>
                <th style={{ textAlign: 'right' }}>VALOR INDIVIDUAL</th>
                <th style={{ textAlign: 'center' }}>QUANTIDADE</th>
                <th style={{ textAlign: 'right' }}>VALOR</th>
                {!isFinalized && <th style={{ width: '60px', textAlign: 'center' }}>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {tableEntries.length === 0 ? (
                <tr>
                  <td colSpan={isFinalized ? "4" : "5"} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>
                    Nenhum lançamento no exercício de {reportYear}.
                  </td>
                </tr>
              ) : (
                tableEntries.map(entry => (
                  <tr key={entry.id}>
                    <td>{formatDate(entry.date)}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(entry.unitValue)}</td>
                    <td style={{ textAlign: 'center' }}>{entry.quantity}</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(entry.value)}</td>
                    {!isFinalized && (
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          className="btn-icon danger" 
                          onClick={() => handleDelete(entry.id)}
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
              {/* Row para o TOTAL (Valor Devido) que era verde no excel */}
              <tr style={{ backgroundColor: '#a3e635' }}>
                <td style={{ fontWeight: 'bold', color: '#1e293b' }}>VALOR DEVIDO</td>
                <td></td>
                <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#1e293b' }}>{totalQty}</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#1e293b' }}>{formatCurrency(totalValue)}</td>
                {!isFinalized && <td></td>}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="fade-in">
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div style={{ flex: 1 }}>
          <h1 className="page-title">{getReportName('valid', reportYear).toUpperCase()}</h1>
          <p className="page-subtitle">Emissão de Carteiras Médicas - Categoria Valid</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '1rem' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>Mês:</label>
          <select 
            className="input-field" 
            style={{ width: 'auto', padding: '0.5rem' }}
            value={selectedMonth} 
            onChange={e => setSelectedMonth(e.target.value)}
          >
            <option value="all">Todos os Meses</option>
            <option value="1">Janeiro</option>
            <option value="2">Fevereiro</option>
            <option value="3">Março</option>
            <option value="4">Abril</option>
            <option value="5">Maio</option>
            <option value="6">Junho</option>
            <option value="7">Julho</option>
            <option value="8">Agosto</option>
            <option value="9">Setembro</option>
            <option value="10">Outubro</option>
            <option value="11">Novembro</option>
            <option value="12">Dezembro</option>
          </select>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button 
            className="btn btn-outline" 
            onClick={handleExportPDF} 
            disabled={displayEntries.length === 0}
          >
            <Download size={18} />
            Exportar PDF
          </button>
          
          <button 
            className={`btn ${isFinalized ? 'btn-outline' : 'btn-primary'}`}
            onClick={() => toggleReportLock('valid')}
          >
            <Lock size={18} />
            {isFinalized ? 'Desbloquear Relatório' : 'Finalizar Relatório'}
          </button>
          
          <button 
            className="btn btn-accent" 
            onClick={handleExportExcel}
            disabled={displayEntries.length === 0}
          >
            <Download size={18} />
            Exportar Excel
          </button>

          {!isFinalized && (
            <>
              <label className="btn btn-outline" style={{ cursor: isImporting ? 'wait' : 'pointer' }}>
                <Upload size={18} />
                {isImporting ? 'Importando...' : 'Importar Excel'}
                <input 
                  type="file" 
                  accept=".xlsx, .xls" 
                  style={{ display: 'none' }} 
                  onChange={handleImportExcel}
                  disabled={isImporting}
                />
              </label>
              
              <button 
                className="btn btn-danger" 
                onClick={handleClearTable}
                disabled={displayEntries.length === 0}
                style={{ border: '1px solid var(--danger)' }}
              >
                <Trash2 size={18} />
                Limpar Tabela
              </button>
            </>
          )}
        </div>
      </div>

      {!isFinalized && (
        <form onSubmit={handleSubmit} className="card glass-panel" style={{ marginBottom: '2rem' }}>
          <h2 className="card-title">Adicionar Novo Lote Mensal (VALID)</h2>
          
          <div className="form-row">
            <div className="form-group">
              <label>Categoria (50% ou 100%)</label>
              <select name="category" value={formData.category} onChange={handleInputChange}>
                <option value="CIM_CIC">CIM E CIC (50%)</option>
                <option value="CPM">CPM (100%)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Mês de Referência (Preencha uma data do mês)</label>
              <input 
                type="date" 
                name="date" 
                value={formData.date} 
                onChange={handleInputChange}
                required 
              />
            </div>

            <div className="form-group">
              <label>Valor Individual (R$)</label>
              <input 
                type="number" 
                min="0"
                step="0.01" 
                name="unitValue" 
                value={formData.unitValue} 
                onChange={handleInputChange}
                placeholder="Ex: 148.30"
                required 
              />
            </div>

            <div className="form-group">
              <label>Quantidade</label>
              <input 
                type="number" 
                min="0"
                step="1"
                name="quantity" 
                value={formData.quantity} 
                onChange={handleInputChange}
                placeholder="Ex: 5"
                required 
              />
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button type="submit" className="btn btn-primary">
              Incluir na Planilha
            </button>
          </div>
        </form>
      )}

      <div className="card glass-panel" style={{ padding: '2rem' }}>
        {renderTable('CIM_CIC', 'RELATÓRIO VALID - CRM-AL (CARTEIRAS DE IDENTIDADE MEDICA - CIM E CIC) 50%')}
        {renderTable('CPM', 'RELATÓRIO VALID - CRM-AL (CARTEIRAS PROFISSIONAL MEDICA - CPM) 100%')}
      </div>
    </div>
  );
}
