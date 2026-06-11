import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';

import { formatCurrency, formatDate } from './formatters';

/**
 * Fetches logo from /logo.png and returns it as an ArrayBuffer for ExcelJS.
 */

export const getLogoBuffer = async () => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const dataURL = canvas.toDataURL('image/jpeg');
      const base64 = dataURL.replace(/^data:image\/jpeg;base64,/, "");
      resolve({ base64, extension: 'jpeg' });
    };
    img.onerror = () => {
      console.warn('Could not load logo for Excel');
      resolve(null);
    };
    img.src = './logo.jpg';
  });
};

/**
 * Generates a formatted Excel (.xlsx) file matching the CREMAL report layout.
 */
export const generateExcel = async ({ reportType, reportName, entries, budget, presidentInfo, includeObservations = true, logoBuffer = null, installmentInfo = null, fileName = null }) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CREMAL Sistema Contábil';
  workbook.created = new Date();

  await addReportSheet({ workbook, reportType, reportName, entries, budget, includeObservations, logoBuffer, customSheetName: 'Prestação de Contas', installmentInfo, presidentInfo });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const finalName = fileName || `prestacao_${reportType}_${new Date().getFullYear()}.xlsx`;
  saveAs(blob, finalName);
};

/**
 * Generates an Excel specifically for the VALID report (2 tables format).
 */
export const generateValidExcel = async ({ entries, reportYear, selectedMonth = 'all' }) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CREMAL Sistema Contábil';
  workbook.created = new Date();
  
  const sheet = workbook.addWorksheet('Relatório VALID', {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 }
    }
  });

  sheet.columns = [
    { key: 'date', width: 25 },
    { key: 'unit', width: 25 },
    { key: 'qty', width: 20 },
    { key: 'total', width: 25 }
  ];

  const buildTable = (category, title) => {
    // Spacer
    sheet.addRow([]);
    
    // Title
    const titleRow = sheet.addRow([title]);
    sheet.mergeCells(`A${titleRow.number}:D${titleRow.number}`);
    const titleCell = sheet.getCell(`A${titleRow.number}`);
    titleCell.font = { name: 'Arial', size: 10, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5B798' } }; // Light orange from screenshot
    for (let c = 1; c <= 4; c++) sheet.getCell(titleRow.number, c).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };

    // Headers
    const hRow = sheet.addRow(['MÊS DE REFERÊNCIA', 'VALOR INDIVIDUAL', 'QUANTIDADE', 'VALOR']);
    hRow.eachCell(cell => {
      cell.font = { name: 'Arial', size: 10, bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    });

    const catEntries = entries.filter(e => e.category === category);
    let totalQty = 0;
    let totalValue = 0;

    catEntries.forEach(entry => {
      totalQty += entry.quantity;
      totalValue += entry.value;
      const r = sheet.addRow([
        formatDate(entry.date), 
        formatCurrency(entry.unitValue), 
        entry.quantity, 
        formatCurrency(entry.value)
      ]);
      r.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 10 };
        cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        cell.alignment = { horizontal: 'center' };
      });
    });

    // Total Row
    const tRow = sheet.addRow(['VALOR DEVIDO', '', totalQty, formatCurrency(totalValue)]);
    sheet.mergeCells(`A${tRow.number}:B${tRow.number}`);
    tRow.eachCell((cell) => {
      // Background green: A3E635 mapped to something like FF92D050
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } };
      cell.font = { name: 'Arial', size: 10, bold: true };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      cell.alignment = { horizontal: 'center' };
    });
  };

  buildTable('CIM_CIC', 'RELATÓRIO VALID - CRM-AL (CARTEIRAS DE IDENTIDADE MEDICA - CIM E CIC) 50%');
  buildTable('CPM', 'RELATÓRIO VALID - CRM-AL (CARTEIRAS PROFISSIONAL MEDICA - CPM) 100%');

  let suffix = '';
  if (selectedMonth !== 'all') {
    const monthNames = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    suffix = `_${monthNames[parseInt(selectedMonth)]}`;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Relatorio_VALID_${reportYear}${suffix}.xlsx`);
};

/**
 * Generates a Master Excel file with all report types in separate formatted tabs.
 */
export const generateMasterExcel = async ({ entries, budgets, getReportName, presidentInfo, reportYear, includeObservations = true, logoBuffer = null, fileName = null }) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CREMAL Sistema Contábil';
  workbook.created = new Date();

  const reportTypes = ['fiscalizacao', 'educacao', 'cota'];
  
  for (const type of reportTypes) {
    const typeEntries = entries.filter(e => {
      const isRightType = e.reportType === type;
      const entryDate = new Date(e.date);
      const isRightYear = entryDate.getUTCFullYear() === reportYear;
      const isGhost = !e.date && !e.value && !e.processNumber;
      return isRightType && isRightYear && !isGhost;
    });
    if (typeEntries.length > 0) {
      await addReportSheet({ 
        workbook, 
        reportType: type, 
        reportName: getReportName(type, reportYear), 
        entries: typeEntries, 
        budget: budgets[type], 
        includeObservations,
        logoBuffer,
        presidentInfo,
        reportYear
      });
    }
  }

  if (workbook.worksheets.length === 0) {
    throw new Error(`Nenhum lançamento encontrado para o exercício ${reportYear}. Adicione dados para gerar este relatório.`);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const finalName = fileName || `Relatórios_Contábil_${reportYear}.xlsx`;
  saveAs(blob, finalName);
};

/**
 * Helper to add a formatted report worksheet to an existing workbook.
 */
const addReportSheet = async ({ workbook, reportType, entries, budget, includeObservations = true, customSheetName = null, installmentInfo = null, presidentInfo }) => {
  const defaultSheetName = reportType === 'fiscalizacao' ? 'Fiscalização' : reportType === 'educacao' ? 'Ed. Médica' : 'Cota Parte';
  const sheet = workbook.addWorksheet(customSheetName || defaultSheetName, {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 }
    }
  });

  const columns = [
    { key: 'index', width: 8 },
    { key: 'date', width: 14 },
    { key: 'beneficiary', width: 45 },
    { key: 'purpose', width: 65 },
    { key: 'process', width: 14 },
    { key: 'installment', width: 12 },
    { key: 'value', width: 18 },
    { key: 'balance', width: 18 }
  ];

  if (includeObservations) columns.push({ key: 'observation', width: 40 });
  sheet.columns = columns;

  const totalCols = columns.length;

  const activeEntries = entries.filter(e => e.reportType === reportType).sort((a, b) => {
    // 0. Sort by Item Index (manual order)
    const idxA = parseInt(a.itemIndex) || 0;
    const idxB = parseInt(b.itemIndex) || 0;
    if (idxA !== idxB) return idxA - idxB;

    // 1. Sort by Installment
    const instA = a.installment ? String(a.installment) : '';
    const instB = b.installment ? String(b.installment) : '';
    if (instA !== instB) return instA.localeCompare(instB, undefined, { numeric: true });
    
    // 2. Sort by Process Number
    const procA = String(a.processNumber || '');
    const procB = String(b.processNumber || '');
    if (procA !== procB) return procA.localeCompare(procB, undefined, { numeric: true });

    // 3. Sort by Date
    return new Date(a.date) - new Date(b.date);
  });

  // Headers Row
  const headerRowData = [
    'Nº',
    'DATA', 
    'NOME DO BENEFICIÁRIO', 
    'FINALIDADE', 
    'PROCESSO / ITEM', 
    'PARCELA', 
    'VALOR', 
    'SALDO',
    ...(includeObservations ? ['OBSERVAÇÃO'] : [])
  ];
  const headerRow = sheet.addRow(headerRowData);
  headerRow.height = 30;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 9, bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } };
    cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  });

  let currentBalance = budget;
  
  // Fill Data Rows (Dense)
  activeEntries.forEach((entry, idx) => {
    currentBalance -= entry.value;
    const rowData = [
      entry.itemIndex || (idx + 1).toString(), 
      formatDate(entry.date), 
      entry.beneficiary, 
      entry.purpose, 
      entry.processNumber || '-',
      entry.installment || '-',
      formatCurrency(entry.value), 
      formatCurrency(currentBalance)
    ];
    if (includeObservations) rowData.push(entry.observation || '');
    
    const r = sheet.addRow(rowData);
    r.eachCell((cell, col) => {
      cell.font = { name: 'Arial', size: 9 };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      cell.alignment = { wrapText: true, vertical: 'top' };
      
      // Index, Date, Process and Parcela are centered
      if (col === 1 || col === 2 || col === 5 || col === 6) {
        cell.alignment.horizontal = 'center';
      }
      // Value and Balance are right-aligned
      if (col >= 7 && col <= 8) {
        cell.alignment.horizontal = 'right';
        if (col === 8) cell.font.bold = true;
      }
      // Style for index column
      if (col === 1) {
        cell.font.bold = true;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
      }
    });
  });

  // Financial Summary
  const totalDespesas = activeEntries.reduce((acc, curr) => acc + curr.value, 0);
  const finalBudgetValue = installmentInfo ? installmentInfo.value : budget;
  
  sheet.addRow([]); // Spacer
  const summaryStartRow = sheet.addRow([]);
  sheet.mergeCells(`A${summaryStartRow.number}:D${summaryStartRow.number}`);
  const tL = sheet.getCell(`A${summaryStartRow.number}`);
  tL.value = 'TOTAL DE DESPESAS:';
  tL.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF003399' } };
  tL.alignment = { horizontal: 'right', vertical: 'middle' };
  
  const tV = sheet.getCell(summaryStartRow.number, 7); // Column G (VALOR)
  tV.value = formatCurrency(totalDespesas);
  tV.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF003399' } };
  tV.alignment = { horizontal: 'right', vertical: 'middle' };
  tV.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };

  const dRow = sheet.addRow([]);
  sheet.mergeCells(`A${dRow.number}:D${dRow.number}`);
  const dL = sheet.getCell(`A${dRow.number}`);
  dL.value = 'DEVOLUÇÃO AO CFM:';
  dL.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFCC0000' } };
  dL.alignment = { horizontal: 'right', vertical: 'middle' };
  
  const dV = sheet.getCell(dRow.number, 7); // Column G (VALOR)
  dV.value = formatCurrency(finalBudgetValue - totalDespesas);
  dV.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFCC0000' } };
  dV.alignment = { horizontal: 'right', vertical: 'middle' };
  dV.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };

  if (presidentInfo) {
    addSignaturesToSheet(sheet, presidentInfo, totalCols);
  }

  return sheet;
};

/**
 * Helper to add signatures footer to ANY worksheet.
 */
const addSignaturesToSheet = (sheet, presidentInfo, totalCols) => {
  const colLetter = String.fromCharCode(64 + totalCols);
  sheet.addRow([]); sheet.addRow([]); sheet.addRow([]);
  
  // Date
  const dateRow = sheet.addRow([]);
  sheet.mergeCells(`A${dateRow.number}:${colLetter}${dateRow.number}`);
  const dateCell = sheet.getCell(`A${dateRow.number}`);
  dateCell.value = `Maceió, ${format(new Date(), 'dd/MM/yyyy')}`;
  dateCell.alignment = { horizontal: 'center' };
  
  sheet.addRow([]); // Blank line
  
  // Signature Line
  const sigRow = sheet.addRow([]);
  sheet.mergeCells(`A${sigRow.number}:${colLetter}${sigRow.number}`);
  const sigCell = sheet.getCell(`A${sigRow.number}`);
  sigCell.value = '____________________________________________________________________';
  sigCell.alignment = { horizontal: 'center' };
  
  // Name
  const nameRow = sheet.addRow([]);
  sheet.mergeCells(`A${nameRow.number}:${colLetter}${nameRow.number}`);
  const nameCell = sheet.getCell(`A${nameRow.number}`);
  nameCell.value = presidentInfo.name;
  nameCell.font = { name: 'Arial', size: 10, bold: true };
  nameCell.alignment = { horizontal: 'center' };
  
  // Role
  const roleRow = sheet.addRow([]);
  sheet.mergeCells(`A${roleRow.number}:${colLetter}${roleRow.number}`);
  const roleCell = sheet.getCell(`A${roleRow.number}`);
  roleCell.value = presidentInfo.role;
  roleCell.font = { name: 'Arial', size: 10, bold: true };
  roleCell.alignment = { horizontal: 'center' };
};


/**
 * Helper to safely extract string from ExcelJS cell value (handles rich text, formulas, etc.)
 */
const getCellValueAsString = (val) => {
  if (val === null || val === undefined) return '';
  
  // Handle cell objects (ExcelJS)
  if (typeof val === 'object' && val !== null) {
    if (val.isMerged && val.master && (val.value === null || val.value === undefined)) {
      val = val.master.value;
    } else if (val.value !== undefined) {
      val = val.value;
    }
  }

  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val).trim();
  if (val.richText) return val.richText.map(rt => rt.text).join('').trim();
  if (val.result !== undefined) return String(val.result).trim();
  if (val.text !== undefined) return String(val.text).trim();
  return String(val).trim();
};

/**
 * Flexible date parser for accounting reports.
 * Handles: "07/jan", "jan/25", "31/01/2025", and Excel dates.
 */
const parseFlexibleDate = (val, defaultYear = 2025) => {
  if (val instanceof Date) {
    const d = new Date(val);
    // Force year to reportYear to ensure it shows up in the current dashboard
    if (defaultYear) d.setFullYear(defaultYear);
    return format(d, 'yyyy-MM-dd');
  }
  
  const s = getCellValueAsString(val).toLowerCase().trim();
  if (!s) return null;

  const months = {
    jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06',
    jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12'
  };

  // Match DD/MONTH (e.g., 07/jan)
  const ddMonthMatch = s.match(/^(\d{1,2})\/([a-z]{3})$/);
  if (ddMonthMatch) {
    const day = ddMonthMatch[1].padStart(2, '0');
    const month = months[ddMonthMatch[2]];
    if (month) return `${defaultYear}-${month}-${day}`;
  }

  // Match MONTH/YY (e.g., jan/25)
  const monthYYMatch = s.match(/^([a-z]{3})\/(\d{2})$/);
  if (monthYYMatch) {
    const month = months[monthYYMatch[1]];
    // Even if it says /26, we force to defaultYear if provided
    const year = defaultYear || `20${monthYYMatch[2]}`;
    if (month) return `${year}-${month}-01`;
  }

  // Match DD/MM/YYYY or DD/MM
  if (s.includes('/')) {
    const p = s.split('/');
    if (p.length === 3) {
      // Force year to defaultYear to avoid filtering out items with different year in Excel
      const year = defaultYear || (p[2].length === 2 ? `20${p[2]}` : p[2]);
      return `${year}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
    } else if (p.length === 2) {
      return `${defaultYear}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
    }
  }

  return null;
};

/**
 * Imports an existing Excel file (.xlsx) and reformats it.
 * Scans ALL sheets and categorizes data based on sheet names.
 */
export const importAndFormatExcel = async (file, reportYear = 2025, forcedInstallment = null) => {
  const workbook = new ExcelJS.Workbook();
  const arrayBuffer = await file.arrayBuffer();
  await workbook.xlsx.load(arrayBuffer);

  const results = {
    fiscalizacao: [],
    educacao: [],
    cota: [],
    valid: []
  };

  const getTargetType = (name) => {
    const n = name.toUpperCase();
    if (n.includes('FISCAL')) return 'fiscalizacao';
    if (n.includes('EDUCA') || n.includes('ED. MEDICA')) return 'educacao';
    if (n.includes('COTA') || n.includes('OUTROS') || n.includes('PROJETO')) return 'cota';
    return null;
  };

  workbook.eachSheet((sheet) => {
    let currentValidCategory = null;
    let detectedInstallment = forcedInstallment;

    // Try to detect installment from sheet name initially (e.g. 'FISCALIZAÇÃO 1' -> '1')
    if (detectedInstallment === null) {
      const sheetNameUpper = sheet.name.toUpperCase();
      const sheetInstMatch = sheetNameUpper.match(/(\d+)\s*[ªº°OO]?[.\-\s]*PARCELA/i) || sheetNameUpper.match(/\s*(?:PARTE)?\s*(\d+)$/i);
      if (sheetInstMatch) {
        detectedInstallment = sheetInstMatch[1];
      }
    }

    let colMap = { date: -1, beneficiary: -1, purpose: -1, process: -1, value: -1, unitValue: -1, qty: -1, installment: -1 };
    let lastValidDate = null;

    sheet.eachRow((row) => {
      const rowValues = row.values.map(v => getCellValueAsString(v).toUpperCase());
      const cell1Str = rowValues[1] || '';
      const sheetNameUpper = sheet.name.toUpperCase();
      const rowText = rowValues.join(' ');
      
      // 1. Installment Detection (Dynamic - can change mid-sheet)
      // We only update detection on "Title-like" rows to avoid data-row interference
      const colDateGuess = colMap.date !== -1 ? colMap.date : 2;
      const cellDateVal = row.getCell(colDateGuess).value;
      const rowHasDate = cellDateVal && (cellDateVal instanceof Date || String(cellDateVal).match(/\d+\s*[/\\-]\s*[a-z]/i));

      if (forcedInstallment === null && !rowHasDate) {
        // Match patterns like "1ª PARCELA", "2º PARCELA", "CONVÊNIO... 2 PARCELA"
        const instMatch = rowText.match(/(\d+)\s*[ªº°OO]?[.\-\s]*PARCELA/i);
        if (instMatch) {
          detectedInstallment = instMatch[1];
        } else if (detectedInstallment === null) {
          // Fallback to sheet name only if not already detected from text
          const sheetMatch = sheetNameUpper.match(/(\d+)\s*[ªº°OO]?[.\-\s]*PARCELA/i) || sheetNameUpper.match(/\s*(?:PARTE)?\s*(\d+)$/i);
          if (sheetMatch) detectedInstallment = sheetMatch[1];
        }
      }
      
      // 2. Header Detection
      if (colMap.date === -1 && row.number <= 15) {
        row.eachCell((cell, col) => {
          const val = getCellValueAsString(cell.value).toUpperCase().trim();
          if (val.includes('DATA')) colMap.date = col;
          if (val.includes('BENEFICI') || val.includes('FAVORECIDO') || val.includes('NOME DO')) colMap.beneficiary = col;
          if (val.includes('FINALIDADE') || val.includes('OBJETIVO')) colMap.purpose = col;
          if (val.includes('PROCESSO') || (val.includes('ITEM') && !val.includes('VALOR')) || val === 'Nº' || val === 'INDEX') colMap.process = col;
          if (val === 'PARCELA' || val === 'Nº PARCELA' || val === 'Nº DA PARCELA' || val.match(/\d+[ªº°]\s*PARCELA/i)) colMap.installment = col;
          if (((val.includes('VALOR') || val === 'VLR') && !val.includes('INDIVIDUAL') && !val.includes('QUANT') && !val.includes('QTD') && !val.includes('ESTIMADO')) || val === 'VALOR (R$)') colMap.value = col;
          if (val.includes('INDIVIDUAL')) colMap.unitValue = col;
          if (val.includes('QUANTIDADE') || val === 'QTE' || val === 'QTDE') colMap.qty = col;
          if ((val === 'TOTAL' || val === 'SALDO') && colMap.process === -1) { /* ignore if process already set */ }
        });
        
        if (colMap.date !== -1 && (colMap.beneficiary !== -1 || colMap.unitValue !== -1)) return;
      }

      // 3. Detecção de VALID
      if (cell1Str.includes('CIM E CIC')) { currentValidCategory = 'CIM_CIC'; return; }
      if (cell1Str.includes('CPM') && cell1Str.includes('VALID')) { currentValidCategory = 'CPM'; return; }

      // Skip common non-data rows
      const headerKeywords = ['PRESTAÇÃO', 'TOTAL', 'DEVOLUÇÃO', 'SALDO', 'CONVÊNIO', 'ORIGEM', 'ESTIMADO'];
      if (headerKeywords.some(k => rowText.includes(k))) return;

      // 3. Parse VALID
      if (currentValidCategory) {
        const colDate = colMap.date !== -1 ? colMap.date : 1;
        const colUnit = colMap.unitValue !== -1 ? colMap.unitValue : 2;
        const colQty = colMap.qty !== -1 ? colMap.qty : 3;
        const dateVal = row.getCell(colDate).value;
        const unitVal = row.getCell(colUnit).value;
        const qtyVal = row.getCell(colQty).value;

        if (dateVal && qtyVal && !isNaN(Number(getCellValueAsString(qtyVal)))) {
          const dateStr = parseFlexibleDate(dateVal, reportYear);
          let parsedUnit = 0;
          if (typeof unitVal === 'number') parsedUnit = unitVal;
          else {
            const s = getCellValueAsString(unitVal);
            parsedUnit = parseFloat(s.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) || 0;
          }
          if (dateStr) {
            results.valid.push({
              reportType: 'valid', category: currentValidCategory, date: dateStr, unitValue: parsedUnit,
              quantity: Number(getCellValueAsString(qtyVal)), value: parsedUnit * Number(getCellValueAsString(qtyVal)), id: crypto.randomUUID()
            });
          }
        }
        return;
      }

      // 4. Prestações normais
      const targetType = getTargetType(sheet.name);
      if (!targetType) return;

      // Fallbacks (mostly for accountant reports with no headers)
      const colDate = colMap.date !== -1 ? colMap.date : 2;
      const colBen = colMap.beneficiary !== -1 ? colMap.beneficiary : 3;
      const colPur = colMap.purpose !== -1 ? colMap.purpose : 4;
      const colPro = colMap.process !== -1 ? colMap.process : 5;
      const colVal = colMap.value !== -1 ? colMap.value : 6;

      const dateRaw = row.getCell(colDate).value;
      const beneficiary = getCellValueAsString(row.getCell(colBen).value);
      const purpose = getCellValueAsString(row.getCell(colPur).value);
      const processVal = getCellValueAsString(row.getCell(colPro).value);
      const valueRawOuter = row.getCell(colVal).value;

      let parsedDateStr = null;
      if (dateRaw) {
        parsedDateStr = parseFlexibleDate(dateRaw, reportYear);
      }
      
      if (parsedDateStr) {
        lastValidDate = parsedDateStr;
      }
      
      const effectiveDateStr = parsedDateStr || lastValidDate;

      if (effectiveDateStr && (beneficiary.trim().length > 0 || purpose.trim().length > 0)) {
          let parsedValue = 0;
          
          
          // Helper to parse currency from cell value
          const parseCur = (v) => {
            if (typeof v === 'number') return v > 1000000 ? 0 : v; // Reject large IDs (max 1M)
            const s = getCellValueAsString({ value: v, isMerged: false }).trim();
            if (!s) return 0;
            // Strict regex: must look like a standalone currency or number
            // (e.g., optional R$, optional sign, digits with dots/commas)
            // It MUST NOT match if it's followed by letters (preventing "0,5 diaria")
            const strictMatch = s.match(/^\s*(?:R\$)?\s*[-+]?\s*([\d.,]+)\s*$/);
            if (!strictMatch) return 0;
            const clean = strictMatch[1].replace(/\./g, '').replace(',', '.');
            const res = parseFloat(clean);
            if (isNaN(res)) return 0;
            return res > 1000000 ? 0 : res; // Reject large IDs parsed from strings
          };

          parsedValue = parseCur(valueRawOuter);
          
          // Smart Fallback: If primary column is empty, check neighbors (some accountant reports shift columns)
          if (parsedValue === 0) {
            // Check Column 7 (G) specifically as it often contains the Value in accountant reports
            const col7Val = row.getCell(7).value;
            const p7 = parseCur(col7Val);
            if (p7 > 0) {
              parsedValue = p7;
            } else {
              // Limited neighbor search
              for (let offset of [-1, 1]) {
                const targetCol = colVal + offset;
                // Don't pick values from columns we know are other data
                if (targetCol === colPro || targetCol === colDate || targetCol === colBen || targetCol === colPur) continue;
                if (targetCol < 1 || targetCol > 20) continue;
                
                const neighborVal = row.getCell(targetCol).value;
                const p = parseCur(neighborVal);
                // Extra safety: only pick up as fallback if it looks like a real currency (usually has decimals or > 10)
                if (p > 10 || (p > 0 && String(neighborVal).includes(','))) {
                  parsedValue = p;
                  break;
                }
              }
            }
          }
          
          // We removed the zero-value skip because the user wants to see the items 
          // in both installments even if the value is zero in one of them.
          // HOWEVER, we should skip rows that are completely empty of metadata (no date, no value, no process)
          // as these are usually redundant headers or merged cell leftovers.
          if (parsedValue === 0 && !parsedDateStr && !processVal) {
            return;
          }

          const instVal = colMap.installment !== -1 ? getCellValueAsString(row.getCell(colMap.installment).value) : '';
          
          // Safety logic: installment should be short (e.g., "1", "2"). If long text detected, it's a mapping error (like purpose).
          let finalInstallment = forcedInstallment || instVal || detectedInstallment || '';
          if (finalInstallment.length > 5) {
            finalInstallment = forcedInstallment || detectedInstallment || '';
          }

          results[targetType].push({
            date: effectiveDateStr, 
            beneficiary: beneficiary || '-', 
            purpose: purpose || '-', 
            value: parsedValue,
            processNumber: processVal === '-' || isNaN(Number(processVal)) ? processVal : processVal,
            installment: finalInstallment,
            reportType: targetType, 
            id: crypto.randomUUID()
          });
        }
    });
  });

  return results;
};
