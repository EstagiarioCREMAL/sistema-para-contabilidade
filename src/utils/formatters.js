import { format, parseISO } from 'date-fns';

/**
 * Formats a number as BRL currency.
 */
export const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value || 0);
};

/**
 * Formats an ISO date string to Brazilian format.
 */
export const formatDate = (dateStr, includeYear = true) => {
  if (!dateStr) return '';
  try {
    return format(parseISO(dateStr), includeYear ? 'dd/MM/yyyy' : 'dd/MM');
  } catch {
    return dateStr;
  }
};
