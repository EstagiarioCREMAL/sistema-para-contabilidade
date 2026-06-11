import React from 'react';
import { useAppContext } from '../context/AppContext';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export default function ToastContainer() {
  const { toasts } = useAppContext();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" style={{
      position: 'fixed',
      top: '0',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      alignItems: 'center',
      width: '100%',
      pointerEvents: 'none'
    }}>
      {toasts.map(toast => (
        <div 
          key={toast.id} 
          className="toast-notif fade-in"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            backgroundColor: toast.type === 'danger' ? 'var(--danger)' : toast.type === 'info' ? 'var(--primary-color)' : 'var(--success)',
            color: 'white',
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            minWidth: '280px',
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          {toast.type === 'danger' ? <AlertCircle size={20} /> : toast.type === 'info' ? <Info size={20} /> : <CheckCircle size={20} />}
          <span style={{ flex: 1, fontWeight: '500', fontSize: '0.875rem' }}>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
