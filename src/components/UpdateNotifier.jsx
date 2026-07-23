import React, { useEffect, useState } from 'react';

// Verifica se está rodando dentro do Electron com o preload ativo
const isElectron = typeof window !== 'undefined' && window.electronUpdater;

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

const formatSpeed = (bps) => {
  if (!bps) return '';
  return `${formatBytes(bps)}/s`;
};

export default function UpdateNotifier() {
  const [state, setState] = useState('idle'); 
  // idle | available | downloading | downloaded | error

  const [updateInfo, setUpdateInfo]     = useState(null);
  const [progress, setProgress]         = useState(null);
  const [errorMsg, setErrorMsg]         = useState('');
  const [dismissed, setDismissed]       = useState(false);

  useEffect(() => {
    if (!isElectron) return;

    const updater = window.electronUpdater;

    updater.onUpdateAvailable((info) => {
      setUpdateInfo(info);
      setState('available');
      setDismissed(false);
    });

    updater.onDownloadProgress((prog) => {
      setProgress(prog);
      setState('downloading');
    });

    updater.onUpdateDownloaded((info) => {
      setUpdateInfo(info);
      setProgress(null);
      setState('downloaded');
    });

    updater.onUpdateError((msg) => {
      setErrorMsg(msg);
      setState('error');
    });

    return () => {
      ['update-available', 'download-progress', 'update-downloaded', 'update-error']
        .forEach(ch => updater.removeAllListeners(ch));
    };
  }, []);

  if (!isElectron || dismissed || state === 'idle') return null;

  const handleDownload = () => {
    window.electronUpdater.downloadUpdate();
    setState('downloading');
  };

  const handleInstall = () => {
    window.electronUpdater.installUpdate();
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  // ── Estilos base do banner ──────────────────────────────────────────────────
  const bannerStyle = {
    position: 'fixed',
    bottom: '1.25rem',
    right: '1.25rem',
    zIndex: 9999,
    width: '360px',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
    padding: '1.25rem 1.5rem',
    fontFamily: 'inherit',
    color: '#fff',
    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    border: '1px solid rgba(255,255,255,0.1)',
    animation: 'slideInUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
  };

  const titleStyle = {
    fontWeight: '700',
    fontSize: '0.95rem',
    marginBottom: '0.35rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  };

  const subtitleStyle = {
    fontSize: '0.78rem',
    color: 'rgba(255,255,255,0.65)',
    marginBottom: '1rem',
    lineHeight: 1.4
  };

  const btnPrimary = {
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
    color: '#1a1a1a',
    fontWeight: '700',
    fontSize: '0.82rem',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
    flex: 1
  };

  const btnSecondary = {
    padding: '0.5rem 0.75rem',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'transparent',
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    fontSize: '0.82rem',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  };

  const progressBarContainer = {
    width: '100%',
    height: '6px',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: '99px',
    overflow: 'hidden',
    marginBottom: '0.5rem'
  };

  const progressBarFill = {
    height: '100%',
    borderRadius: '99px',
    background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
    transition: 'width 0.3s ease',
    width: `${progress?.percent || 0}%`
  };

  return (
    <>
      <style>{`
        @keyframes slideInUp {
          from { transform: translateY(20px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>

      <div style={bannerStyle}>

        {/* ── Atualização disponível ─────────────────────────────────────── */}
        {state === 'available' && (
          <>
            <div style={titleStyle}>
              <span>🚀</span> Nova Versão Disponível
            </div>
            <p style={subtitleStyle}>
              <strong style={{ color: '#fbbf24' }}>v{updateInfo?.version}</strong> está pronta para download.
              Clique para atualizar o sistema.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button style={btnPrimary} onClick={handleDownload}>
                ⬇️ Baixar Agora
              </button>
              <button style={btnSecondary} onClick={handleDismiss}>
                Depois
              </button>
            </div>
          </>
        )}

        {/* ── Baixando ──────────────────────────────────────────────────── */}
        {state === 'downloading' && (
          <>
            <div style={titleStyle}>
              <span>⬇️</span> Baixando Atualização...
            </div>
            <div style={progressBarContainer}>
              <div style={progressBarFill} />
            </div>
            <p style={{ ...subtitleStyle, marginBottom: 0, display: 'flex', justifyContent: 'space-between' }}>
              <span>{progress?.percent || 0}% concluído</span>
              <span>
                {formatBytes(progress?.transferred)} / {formatBytes(progress?.total)}
                {progress?.bytesPerSecond ? ` · ${formatSpeed(progress.bytesPerSecond)}` : ''}
              </span>
            </p>
          </>
        )}

        {/* ── Download concluído ────────────────────────────────────────── */}
        {state === 'downloaded' && (
          <>
            <div style={titleStyle}>
              <span>✅</span> Atualização Pronta!
            </div>
            <p style={subtitleStyle}>
              <strong style={{ color: '#4ade80' }}>v{updateInfo?.version}</strong> foi baixada.
              Reinicie o app para aplicar.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button style={btnPrimary} onClick={handleInstall}>
                🔄 Reiniciar e Instalar
              </button>
              <button style={btnSecondary} onClick={handleDismiss}>
                Mais tarde
              </button>
            </div>
          </>
        )}

        {/* ── Erro ──────────────────────────────────────────────────────── */}
        {state === 'error' && (
          <>
            <div style={titleStyle}>
              <span>⚠️</span> Erro na Atualização
            </div>
            <p style={{ ...subtitleStyle, color: '#fca5a5' }}>
              {errorMsg || 'Ocorreu um erro ao verificar atualizações.'}
            </p>
            <button style={btnSecondary} onClick={handleDismiss}>
              Fechar
            </button>
          </>
        )}

      </div>
    </>
  );
}
