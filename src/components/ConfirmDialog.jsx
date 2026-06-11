import React from 'react';
import { useAppContext } from '../context/AppContext';
import { AlertCircle, HelpCircle, X } from 'lucide-react';

export default function ConfirmDialog() {
  const { confirmDialog, handleConfirmResponse } = useAppContext();

  if (!confirmDialog.isOpen) return null;

  return (
    <div 
      className="modal-overlay" 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onClick={() => handleConfirmResponse(false)}
    >
      <div 
        className="card glass-panel fade-in" 
        style={{ 
          width: '420px', 
          padding: '2rem',
          textAlign: 'center',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ 
          margin: '0 auto 1.5rem',
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: 'rgba(203, 155, 81, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--accent-color)'
        }}>
          <HelpCircle size={40} />
        </div>

        <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--text-primary)' }}>
          {confirmDialog.title || 'Confirmação'}
        </h2>
        
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: '1.6' }}>
          {confirmDialog.message}
        </p>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            className="btn btn-outline" 
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={() => handleConfirmResponse(false)}
          >
            Cancelar
          </button>
          <button 
            className="btn btn-accent" 
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={() => handleConfirmResponse(true)}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
