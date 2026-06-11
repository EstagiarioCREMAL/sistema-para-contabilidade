import React, { useState } from 'react';
import { Lock, ShieldCheck, Building2 } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(false);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      setError(true);
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      {/* Left Panel - Branding */}
      <div className="login-brand-panel">
        <div className="login-brand-decor-1"></div>
        <div className="login-brand-decor-2"></div>
        
        <div style={{ zIndex: 1, maxWidth: '500px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
            <div style={{ backgroundColor: 'var(--accent-color)', padding: '0.85rem', borderRadius: '14px', boxShadow: '0 8px 16px rgba(203,155,81,0.2)' }}>
              <Building2 size={36} color="white" strokeWidth={1.5} />
            </div>
            <h1 style={{ fontSize: '2.25rem', fontWeight: '700', letterSpacing: '-0.025em', margin: 0 }}>CREMAL</h1>
          </div>
          <h2 style={{ fontSize: '3.5rem', fontWeight: '800', lineHeight: 1.1, marginBottom: '1.5rem', color: 'white' }}>
            Sistema <br/><span style={{ color: 'var(--accent-color)' }}>Contábil</span>
          </h2>
          <p style={{ fontSize: '1.125rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, fontWeight: '300' }}>
            Plataforma oficial para gestão corporativa, auditoria financeira e geração de relatórios fiscais do Conselho Regional de Medicina de Alagoas.
          </p>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '4rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', fontWeight: '500' }}>
            <ShieldCheck size={22} color="var(--success)" />
            <span>Ambiente Seguro e Criptografado</span>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="login-form-panel">
        <div className="login-form-container">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div style={{ display: 'inline-flex', backgroundColor: 'rgba(12, 43, 77, 0.05)', padding: '1.25rem', borderRadius: '50%', marginBottom: '1.5rem', color: 'var(--primary-color)' }}>
              <Lock size={36} strokeWidth={1.5} />
            </div>
            <h2 style={{ fontSize: '1.875rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.5rem', letterSpacing: '-0.025em' }}>Acesso Restrito</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
              Insira sua credencial de administrador
            </p>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                E-mail Administrativo
              </label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(false); }}
                placeholder="admin@cremal.org.br"
                autoFocus
                required
                className={error ? 'login-input error' : 'login-input'}
              />
            </div>
            <div style={{ marginBottom: '2.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                Senha de Acesso
              </label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(false); }}
                placeholder="••••••••"
                autoFocus
                required
                className={error ? 'login-input error' : 'login-input'}
              />
              {error && (
                <div className="fade-in" style={{ color: 'var(--danger)', fontSize: '0.875rem', marginTop: '0.75rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--danger)' }}></span>
                  Senha incorreta. Tente novamente.
                </div>
              )}
            </div>
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Autenticando...' : 'Autenticar e Entrar'}
            </button>
          </form>

          <div style={{ marginTop: '4rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.8rem', fontWeight: '500' }}>
            &copy; {new Date().getFullYear()} CREMAL. Todos os direitos reservados.
          </div>
        </div>
      </div>

      <style>{`
        .login-wrapper {
          display: flex;
          width: 100%;
          min-height: 100vh;
          background-color: var(--bg-color);
        }
        .login-brand-panel {
          flex: 1.2;
          background: linear-gradient(135deg, var(--primary-color) 0%, #061628 100%);
          color: white;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 4rem 10%;
          position: relative;
          overflow: hidden;
        }
        .login-brand-decor-1 {
          position: absolute;
          top: -15%;
          left: -10%;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(203,155,81,0.15) 0%, transparent 70%);
          border-radius: 50%;
        }
        .login-brand-decor-2 {
          position: absolute;
          bottom: -20%;
          right: -10%;
          width: 800px;
          height: 800px;
          background: radial-gradient(circle, rgba(203,155,81,0.08) 0%, transparent 70%);
          border-radius: 50%;
        }
        .login-form-panel {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: var(--card-bg);
          box-shadow: -20px 0 40px rgba(0,0,0,0.05);
          z-index: 2;
        }
        .login-form-container {
          width: 100%;
          max-width: 440px;
          padding: 2rem;
        }
        .login-input {
          width: 100%;
          padding: 1.1rem 1.25rem;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
          background-color: var(--bg-color);
          font-size: 1.1rem;
          font-family: var(--font-family);
          transition: all 0.2s ease;
          outline: none;
          color: var(--text-primary);
        }
        .login-input:focus {
          border-color: var(--primary-color);
          background-color: var(--card-bg);
          box-shadow: 0 0 0 4px rgba(12, 43, 77, 0.1);
        }
        .login-input.error {
          border-color: var(--danger);
          background-color: var(--danger-hover-bg);
          color: var(--danger);
        }
        .login-input.error:focus {
          box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.15);
        }
        .login-btn {
          width: 100%;
          padding: 1.1rem;
          background-color: var(--primary-color);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-size: 1.1rem;
          font-family: var(--font-family);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 6px rgba(12, 43, 77, 0.1);
        }
        .login-btn:hover {
          background-color: var(--primary-hover);
          transform: translateY(-2px);
          box-shadow: 0 8px 15px rgba(12, 43, 77, 0.2);
        }
        .login-btn:active {
          transform: translateY(0);
        }
        
        @media (max-width: 900px) {
          .login-wrapper {
            flex-direction: column;
          }
          .login-brand-panel {
            flex: 0 0 auto;
            padding: 3rem 2rem;
            align-items: center;
            text-align: center;
          }
          .login-brand-panel p {
            font-size: 1rem;
          }
          .login-brand-panel h2 {
            font-size: 2.5rem;
          }
          .login-brand-panel > div:last-child > div:first-child {
            justify-content: center;
          }
          .login-brand-panel > div:last-child > div:last-child {
            justify-content: center;
            margin-top: 2rem;
          }
          .login-form-panel {
            padding: 3rem 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}

