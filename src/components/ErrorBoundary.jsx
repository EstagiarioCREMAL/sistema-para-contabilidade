import React from 'react';
import { AlertTriangle, Trash2, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleClearData = () => {
    if (window.confirm('CUIDADO: Isso vai limpar TODOS os seus lançamentos locais para consertar o sistema. Deseja prosseguir?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: '100vh', width: '100vw', backgroundColor: '#f8fafc', color: '#0f172a', padding: '2rem', textAlign: 'center'
        }}>
          <AlertTriangle size={64} color="#ef4444" style={{ marginBottom: '1.5rem' }} />
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>Ops! O sistema sofreu uma pane.</h1>
          <p style={{ maxWidth: '600px', fontSize: '1.1rem', marginBottom: '2rem', color: '#475569' }}>
            Encontramos um erro crítico ao tentar renderizar a interface, provavelmente causado por dados corrompidos ou salvos no cache. 
            Você pode tentar recarregar a página ou fazer a Limpeza de Emergência.
          </p>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              onClick={() => window.location.reload()}
              style={{ padding: '0.75rem 1.5rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <RefreshCw size={18} />
              Recarregar Página
            </button>
            <button 
              onClick={this.handleClearData}
              style={{ padding: '0.75rem 1.5rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Trash2 size={18} />
              Limpeza de Emergência
            </button>
          </div>
          
          <div style={{ marginTop: '3rem', fontSize: '0.8rem', color: '#94a3b8', textAlign: 'left', backgroundColor: '#e2e8f0', padding: '1rem', borderRadius: '8px', maxWidth: '80%' }}>
            <strong>Detalhes Técnicos:</strong><br />
            {this.state.error?.message}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
