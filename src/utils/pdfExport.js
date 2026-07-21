import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

import { formatCurrency, formatDate } from './formatters';

const getBase64ImageFromUrl = (imageUrl) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const dataURL = canvas.toDataURL('image/jpeg');
      resolve(dataURL);
    };
    img.onerror = () => {
      reject(new Error('Falha ao carregar imagem para o PDF.'));
    };
    img.src = imageUrl;
  });
};

export const generatePDF = async ({ reportType, reportName, entries, budget, presidentInfo, installmentInfo, reportYear = 2025 }) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4'
  });

  // Calculate fields and filter by year + skip ghost entries (no date, no value, no process)
  const activeEntries = entries.filter(e => {
    const isRightType = e.reportType === reportType;
    const entryDate = new Date(e.date);
    const isRightYear = entryDate.getUTCFullYear() === reportYear;
    
    // A ghost entry has no date, no value and no process number
    // Also skip if it has 0 value AND no text at all
    const hasText = (e.beneficiary || '').trim().length > 0 || (e.purpose || '').trim().length > 0;
    const isGhost = (!e.date && !e.value && !e.processNumber) || (!e.value && !hasText);
    
    return isRightType && isRightYear && !isGhost;
  }).sort((a, b) => {
    const instA = a.installment ? String(a.installment) : '';
    const instB = b.installment ? String(b.installment) : '';
    if (instA !== instB) return instA.localeCompare(instB, undefined, { numeric: true });
    return new Date(a.date) - new Date(b.date);
  });
  let currentBalance = installmentInfo ? installmentInfo.value : budget;
  
  const tableData = activeEntries.map((entry, idx) => {
    currentBalance -= entry.value;
    
    // Clean text - remove extra whitespace and newlines but preserve full content
    const cleanBeneficiary = (entry.beneficiary || '').trim().replace(/\s\s+/g, ' ').replace(/\r?\n|\r/g, ' ');
    const cleanPurpose = (entry.purpose || '').trim().replace(/\r?\n|\r/g, ' ').replace(/\s\s+/g, ' ');

    return [
      entry.processNumber || (idx + 1).toString(),
      formatDate(entry.date),
      cleanBeneficiary,
      cleanPurpose,
      entry.installment ? `${entry.installment}ª` : '-',
      formatCurrency(entry.value),
      formatCurrency(currentBalance)
    ];
  });

  const totalDespesas = activeEntries.reduce((acc, curr) => acc + curr.value, 0);
  const devolucaoCFM = (installmentInfo ? installmentInfo.value : budget) - totalDespesas;

  // --- HEADER SECTION ---
  const headerX = 40;
  let currentY = 40;
  const tableWidth = 841.89 - 80;

  // 1. Logo Box
  doc.rect(headerX, currentY, tableWidth, 90);
  try {
    const logoData = await getBase64ImageFromUrl('/logo.jpg'); // absolute path works in both Vercel and Electron
    const bannerWidth = 350;
    const bannerHeight = 80;
    const xCenter = (841.89 - bannerWidth) / 2;
    doc.addImage(logoData, 'JPEG', xCenter, currentY + 5, bannerWidth, bannerHeight);
  } catch (error) {
    console.error("Could not load logo image for PDF", error);
  }
  currentY += 90;

  // 2. Report Titles Box
  doc.rect(headerX, currentY, tableWidth, 30);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  
  let headerTitle = reportName.toUpperCase();
  let budgetValue = budget;
  
  if (installmentInfo) {
    headerTitle = `CONVÊNIO CFM - ${installmentInfo.number}ª PARCELA`;
    budgetValue = installmentInfo.value;
  }
  
  const titleText = headerTitle;
  const budgetText = `CONVÊNIO CFM – R$ ${budgetValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  
  doc.text(titleText, 420.945, currentY + 12, { align: "center" });
  doc.text(budgetText, 420.945, currentY + 25, { align: "center" });
  currentY += 30;

  // 3. Draw Table with integrated headers
  autoTable(doc, {
    startY: currentY,
    head: [
      [
        { content: 'ORIGEM DO RECURSO:', colSpan: 3, styles: { halign: 'left', fillColor: [240, 240, 240], lineWidth: 1 } },
        { content: 'CONSELHO FEDERAL DE MEDICINA', colSpan: 4, styles: { halign: 'center', fillColor: [240, 240, 240], lineWidth: 1 } }
      ],
      ['PROCESSO / ITEM', 'DATA', 'NOME DO BENEFICIÁRIO', 'FINALIDADE', 'PARCELA', 'VALOR', 'SALDO']
    ],
    body: tableData,
    theme: 'grid',
    // KEY FIX: never split a row across pages - if row doesn't fit, push it to next page entirely
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      lineColor: [0, 0, 0],
      lineWidth: 1,
      halign: 'center',
      valign: 'middle'
    },
    bodyStyles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.5,
      textColor: [0, 0, 0],
      valign: 'top',
      fontSize: 8
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 52, overflow: 'linebreak' }, // Processo / Item
      1: { halign: 'center', cellWidth: 58, overflow: 'linebreak' }, // Data
      2: { cellWidth: 145, overflow: 'linebreak' }, // Beneficiario
      3: { cellWidth: 'auto', overflow: 'linebreak' }, // Finalidade
      4: { halign: 'center', cellWidth: 46, overflow: 'linebreak' }, // Parcela
      5: { halign: 'right', cellWidth: 82, overflow: 'linebreak' }, // Valor
      6: { halign: 'right', cellWidth: 90, overflow: 'linebreak' } // Saldo
    },
    styles: {
      cellPadding: 2,
      minCellHeight: 12,
      overflow: 'linebreak',
      valign: 'top'
    },
    margin: { top: 40, left: 40, right: 40, bottom: 40 }
  });

  // Footer Table (Totals)
  const finalY = doc.lastAutoTable.finalY;
  
  autoTable(doc, {
    startY: finalY,
    body: [
      ['TOTAL DE DESPESAS', formatCurrency(totalDespesas)],
      ['DEVOLUÇÃO AO CFM', formatCurrency(devolucaoCFM)]
    ],
    theme: 'grid',
    bodyStyles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.5,
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 9
    },
    columnStyles: {
      0: { cellWidth: 661.89, halign: 'center' }, // 761.89 - 100 = 661.89
      1: { cellWidth: 100, halign: 'right', overflow: 'visible' }
    },
    didParseCell: function (data) {
      if (data.row.index === 0) {
        data.cell.styles.textColor = [0, 51, 153]; // Blue text
      } else if (data.row.index === 1) {
        data.cell.styles.textColor = [204, 0, 0]; // Red text
      }
    },
    margin: { left: 40, right: 40 }
  });

  // Signature Block
  const signatureY = doc.lastAutoTable.finalY + 80;
  
  const currentDateFormatted = `Maceió, ${format(new Date(), 'dd/MM/yyyy')}`;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(currentDateFormatted, 420.945, signatureY, { align: "center" });
  
  doc.line(250, signatureY + 30, 590, signatureY + 30); // Draw signature line
  
  doc.setFont("helvetica", "bold");
  doc.text(presidentInfo.name, 420.945, signatureY + 45, { align: "center" });
  doc.text(presidentInfo.role, 420.945, signatureY + 58, { align: "center" });

  // PDF Page numbering
  const pageCount = doc.internal.getNumberOfPages();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.width - 40,
      doc.internal.pageSize.height - 20,
      { align: 'right' }
    );
  }

  // Save the PDF
  const cleanName = reportType === 'fiscalizacao' ? 'fiscalizacao' : reportType === 'educacao' ? 'educacao_medica' : 'cota_parte';
  const installmentStr = installmentInfo ? `_parcela_${installmentInfo.number}` : `_${new Date().getTime()}`;
  doc.save(`prestacao_${cleanName}${installmentStr}.pdf`);
};

export const generateValidPDF = async ({ reportYear, entries, presidentInfo, selectedMonth = 'all' }) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4'
  });

  const monthNames = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const monthSuffix = selectedMonth !== 'all' ? ` - ${monthNames[parseInt(selectedMonth)]}` : '';

  const validEntries = entries.filter(e => e.reportType === 'valid').sort((a, b) => new Date(a.date) - new Date(b.date));

  let currentY = 40;

  // Title
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`RELATÓRIO VALID - CRM-AL ${reportYear}${monthSuffix.toUpperCase()}`, 420.945, currentY, { align: "center" });
  currentY += 30;

  const buildPdfTable = (category, title) => {
    const catEntries = validEntries.filter(e => e.category === category);
    let totalQty = 0;
    let totalValue = 0;
    
    const bodyData = catEntries.map(entry => {
      totalQty += entry.quantity;
      totalValue += entry.value;
      return [
        formatDate(entry.date),
        formatCurrency(entry.unitValue),
        entry.quantity.toString(),
        formatCurrency(entry.value)
      ];
    });

    // Add total row
    bodyData.push([{ content: 'VALOR DEVIDO', styles: { fontStyle: 'bold' } }, '', { content: totalQty.toString(), styles: { fontStyle: 'bold' } }, { content: formatCurrency(totalValue), styles: { fontStyle: 'bold' } }]);

    autoTable(doc, {
      startY: currentY,
      head: [
        [
          { content: title, colSpan: 4, styles: { halign: 'center', fillColor: [245, 183, 152], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 1 } }
        ],
        ['MÊS DE REFERÊNCIA', 'VALOR INDIVIDUAL', 'QUANTIDADE', 'VALOR']
      ],
      body: bodyData,
      theme: 'grid',
      headStyles: {
        fillColor: [232, 232, 232],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        lineColor: [0, 0, 0],
        lineWidth: 1,
        halign: 'center',
        valign: 'middle'
      },
      bodyStyles: {
        lineColor: [0, 0, 0],
        lineWidth: 0.5,
        textColor: [0, 0, 0],
        valign: 'middle',
        halign: 'center',
        fontSize: 10
      },
      columnStyles: {
        0: { cellWidth: 150 },
        1: { cellWidth: 150 },
        2: { cellWidth: 100 },
        3: { cellWidth: 150 }
      },
      didParseCell: function (data) {
        // Last row is green
        if (data.section === 'body' && data.row.index === bodyData.length - 1) {
          data.cell.styles.fillColor = [163, 230, 53];
        }
      },
      margin: { left: 145, right: 145 } // centering roughly 550 width box
    });

    currentY = doc.lastAutoTable.finalY + 40;
  };

  buildPdfTable('CIM_CIC', 'RELATÓRIO VALID - CRM-AL (CARTEIRAS DE IDENTIDADE MEDICA - CIM E CIC) 50%');
  buildPdfTable('CPM', 'RELATÓRIO VALID - CRM-AL (CARTEIRAS PROFISSIONAL MEDICA - CPM) 100%');

  // Signature Block
  const signatureY = currentY + 40;
  const currentDateFormatted = `Maceió, ${format(new Date(), 'dd/MM/yyyy')}`;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(currentDateFormatted, 420.945, signatureY, { align: "center" });
  
  doc.line(250, signatureY + 30, 590, signatureY + 30); 
  
  doc.setFont("helvetica", "bold");
  doc.text(presidentInfo.name, 420.945, signatureY + 45, { align: "center" });
  doc.text(presidentInfo.role, 420.945, signatureY + 58, { align: "center" });

  const simpleMonthNames = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const fileSuffix = selectedMonth !== 'all' ? `_${simpleMonthNames[parseInt(selectedMonth)]}` : '';
  doc.save(`Relatorio_VALID_${reportYear}${fileSuffix}.pdf`);
};
