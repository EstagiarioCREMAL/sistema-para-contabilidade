import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import Sidebar from './components/Sidebar';
import Settings from './components/Settings';
import ReportView from './components/ReportView';
import ValidReportView from './components/ValidReportView';
import Dashboard from './components/Dashboard';
import ToastContainer from './components/ToastContainer';
import ConfirmDialog from './components/ConfirmDialog';
import Login from './components/Login';
import HelpGuide from './components/HelpGuide';
import ErrorBoundary from './components/ErrorBoundary';
import { REPORT_TYPES } from './context/AppContext';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  if (authLoading) {
    return <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Carregando sistema...</div>;
  }

  if (!isAuthenticated) {
    return (
      <ErrorBoundary>
        <Login />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="app-container">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <main className="main-content">
          {activeTab === 'dashboard' ? (
            <Dashboard setActiveTab={setActiveTab} />
          ) : activeTab === 'settings' ? (
            <Settings />
          ) : activeTab === REPORT_TYPES.VALID ? (
            <ValidReportView />
          ) : (
            <ReportView reportType={activeTab} />
          )}
        </main>
        <ToastContainer />
        <ConfirmDialog />
        <HelpGuide />
      </div>
    </ErrorBoundary>
  );
}

export default App;
