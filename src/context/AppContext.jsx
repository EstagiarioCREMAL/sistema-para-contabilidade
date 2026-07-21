import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { db, auth } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc, 
  query,
  orderBy,
  where,
  writeBatch
} from 'firebase/firestore';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';

const AppContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const REPORT_TYPES = {
  FISCALIZACAO: 'fiscalizacao',
  EDUCACAO: 'educacao',
  COTA: 'cota',
  VALID: 'valid'
};

// eslint-disable-next-line react-refresh/only-export-components
export const getReportName = (type, year = 2024) => {
  const names = {
    [REPORT_TYPES.FISCALIZACAO]: `PRESTAÇÃO DE CONTAS - FISCALIZAÇÃO ${year} - CREMAL`,
    [REPORT_TYPES.EDUCACAO]: `PRESTAÇÃO DE CONTAS - EDUCAÇÃO MÉDICA CONTINUADA ${year} - CREMAL`,
    [REPORT_TYPES.COTA]: `PRESTAÇÃO DE CONTAS ${year} - RELATÓRIO GERAL (FISCALIZAÇÃO, ED. MÉDICA E COTA PARTE) - CREMAL`,
    [REPORT_TYPES.VALID]: `RELATÓRIO VALID - CRM-AL ${year}`
  };
  return names[type];
};

export function AppProvider({ children }) {
  const [entries, setEntries] = useState([]);
  const [allBudgets, setAllBudgets] = useState({
    "2024": {
      [REPORT_TYPES.FISCALIZACAO]: 316325.70,
      [REPORT_TYPES.EDUCACAO]: 75000.00,
      [REPORT_TYPES.COTA]: 223471.55
    },
    "2025": {
      [REPORT_TYPES.FISCALIZACAO]: 320000.00,
      [REPORT_TYPES.EDUCACAO]: 80000.00,
      [REPORT_TYPES.COTA]: 250000.00
    }
  });
  
  const [reportYear, setReportYear] = useLocalStorage('cremal_year', 2025);
  const [presidentInfo, setPresidentInfo] = useState({
    name: 'Consº Benício Luiz Bulhões Barros Paula Nunes',
    role: 'Presidente'
  });
  const [allFinalized, setAllFinalized] = useState({});
  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    resolve: null
  });
  const [showHelp, setShowHelp] = useState(false);

  // Helper local storage check for migration
  const [localEntries] = useLocalStorage('cremal_entries', []);
  const [localBudgets] = useLocalStorage('cremal_budgets_multi', null);
  const [localFinalized] = useLocalStorage('cremal_finalized_multi', null);
  const [localPresident] = useLocalStorage('cremal_president', null);
  const [isMigrated, setIsMigrated] = useLocalStorage('cremal_is_migrated', false);

  const addToast = useCallback((message, type = 'success') => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 3000);
  }, []);

  const askConfirmation = (title, message) => {
    return new Promise((resolve) => {
      setConfirmDialog({
        isOpen: true,
        title,
        message,
        resolve
      });
    });
  };

  const handleConfirmResponse = (response) => {
    if (confirmDialog.resolve) {
      confirmDialog.resolve(response);
    }
    setConfirmDialog(prev => ({ ...prev, isOpen: false, resolve: null }));
  };


  // 1 & 2. Sync Firestore apenas após Firebase Auth confirmar a sessão
  useEffect(() => {
    let unsubEntries = () => {};
    let unsubConfig = () => {};

    // Timeout de segurança: libera o sistema se auth+nuvem demorar > 8s
    const timeout = setTimeout(() => {
      setLoading(false);
      addToast("Conexão lenta detectada. Operando com dados em cache.", "info");
    }, 8000);

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Usuário autenticado — inicia os listeners do Firestore
        const yearStart = `${reportYear}-01-01`;
        const yearEnd = `${reportYear}-12-31`;
        const q = query(
          collection(db, "entries"), 
          where("date", ">=", yearStart),
          where("date", "<=", yearEnd),
          orderBy("date", "asc")
        );
        unsubEntries = onSnapshot(q,
          (snapshot) => {
            clearTimeout(timeout);
            const data = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
            setEntries(data);
            setLoading(false);
          },
          (error) => {
            console.error("Firestore error:", error);
            clearTimeout(timeout);
            setLoading(false);
            addToast("Erro ao sincronizar com a nuvem. Verifique sua conexão.", "danger");
          }
        );

        // Listener de configurações (orçamentos, presidente, finalizados)
        unsubConfig = onSnapshot(doc(db, "config", "shared"), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.allBudgets) setAllBudgets(data.allBudgets);
            if (data.allFinalized) setAllFinalized(data.allFinalized);
            if (data.presidentInfo) setPresidentInfo(data.presidentInfo);
          }
        });
      } else {
        // Sem sessão Firebase, tenta autenticação anônima como fallback para permissões do Firestore
        signInAnonymously(auth).catch(() => {
          clearTimeout(timeout);
          setLoading(false);
          setEntries([]);
        });
      }
    });

    return () => {
      clearTimeout(timeout);
      unsubAuth();
      unsubEntries();
      unsubConfig();
    };
  }, [addToast, reportYear]);



  // 3. Migration Logic (Local -> Cloud)
  useEffect(() => {
    const migrate = async () => {
      if (!isMigrated && localEntries.length > 0) {
        addToast("Iniciando migração para a nuvem...", "info");
        try {
          // Sync entries in batches
          const batchSize = 100;
          for (let i = 0; i < localEntries.length; i += batchSize) {
            const batch = writeBatch(db);
            const chunk = localEntries.slice(i, i + batchSize);
            chunk.forEach(entry => {
              const newDocRef = doc(collection(db, "entries"));
              batch.set(newDocRef, { ...entry });
            });
            await batch.commit();
          }

          // Sync Config
          await setDoc(doc(db, "config", "shared"), {
            allBudgets: localBudgets || allBudgets,
            allFinalized: localFinalized || allFinalized,
            presidentInfo: localPresident || presidentInfo
          }, { merge: true });

          setIsMigrated(true);
          addToast("Migração concluída com sucesso!");
        } catch (err) {
          console.error("Migration error:", err);
          addToast("Erro ao migrar dados para a nuvem", "danger");
        }
      } else {
        // If nothing to migrate, we are not loading anymore once snapshots are set
        // But snapshots handle setLoading(false)
      }
    };
    migrate();
  }, [isMigrated, localEntries, localBudgets, localFinalized, localPresident, allBudgets, allFinalized, presidentInfo, addToast, setIsMigrated]);

  const currentBudgets = allBudgets[reportYear] || {
    [REPORT_TYPES.FISCALIZACAO]: 0,
    [REPORT_TYPES.EDUCACAO]: 0,
    [REPORT_TYPES.COTA]: 0
  };
  
  const currentFinalized = allFinalized[reportYear] || [];

  const toggleReportLock = async (type) => {
    const yearStatus = allFinalized[reportYear] || [];
    const newStatus = yearStatus.includes(type) 
      ? yearStatus.filter(t => t !== type) 
      : [...yearStatus, type];
    
    const updatedFinalized = { ...allFinalized, [reportYear]: newStatus };
    await setDoc(doc(db, "config", "shared"), { allFinalized: updatedFinalized }, { merge: true });
  };

  const addEntry = async (entry) => {
    const { id: _, ...data } = entry;
    const docRef = await addDoc(collection(db, "entries"), data);
    return docRef.id;
  };

  const updateEntry = async (id, updatedEntry) => {
    const entryRef = doc(db, "entries", id);
    const { id: _, ...data } = updatedEntry; 
    await updateDoc(entryRef, data);
  };

  const deleteEntry = async (id) => {
    await deleteDoc(doc(db, "entries", id));
  };

  const clearEntriesByType = async (type) => {
    const filteredIds = entries.filter(e => {
      const entryYear = new Date(e.date).getUTCFullYear();
      return e.reportType === type && entryYear === reportYear;
    }).map(e => e.id);
    const batchSize = 500;
    for (let i = 0; i < filteredIds.length; i += batchSize) {
      const batch = writeBatch(db);
      filteredIds.slice(i, i + batchSize).forEach(id => {
        batch.delete(doc(db, "entries", id));
      });
      await batch.commit();
    }
  };

  const clearAllEntries = async () => {
    if (await askConfirmation('APAGAR TUDO', 'TEM CERTEZA? Isso excluirá TODOS os lançamentos da NUVEM! Esta ação não poderá ser desfeita.')) {
      const allIds = entries.map(e => e.id);
      const batchSize = 500;
      for (let i = 0; i < allIds.length; i += batchSize) {
        const batch = writeBatch(db);
        allIds.slice(i, i + batchSize).forEach(id => {
          batch.delete(doc(db, "entries", id));
        });
        await batch.commit();
      }
      addToast('Banco de dados limpo com sucesso!', 'success');
    }
  };

  const restoreBackup = async (data) => {
    try {
      // Import entries via batch write
      if (data.entries && data.entries.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < data.entries.length; i += batchSize) {
          const batch = writeBatch(db);
          data.entries.slice(i, i + batchSize).forEach(entry => {
            const { id: _, ...entryData } = entry;
            const newDocRef = doc(collection(db, "entries"));
            batch.set(newDocRef, entryData);
          });
          await batch.commit();
        }
      }
      // Import config
      const configUpdate = {};
      if (data.allBudgets) configUpdate.allBudgets = data.allBudgets;
      if (data.presidentInfo) configUpdate.presidentInfo = data.presidentInfo;
      if (data.allFinalized) configUpdate.allFinalized = data.allFinalized;
      if (Object.keys(configUpdate).length > 0) {
        await setDoc(doc(db, "config", "shared"), configUpdate, { merge: true });
      }
      return true;
    } catch (err) {
      console.error('Restore backup error:', err);
      return false;
    }
  };

  const updateBudget = async (type, value) => {
    const newYearBudget = {
      ...(allBudgets[reportYear] || {
        [REPORT_TYPES.FISCALIZACAO]: 0,
        [REPORT_TYPES.EDUCACAO]: 0,
        [REPORT_TYPES.COTA]: 0
      }),
      [type]: value
    };
    const updatedAllBudgets = { ...allBudgets, [reportYear]: newYearBudget };
    await setDoc(doc(db, "config", "shared"), { allBudgets: updatedAllBudgets }, { merge: true });
  };

  const updateYearBudgets = async (newBudgets) => {
    const updatedAllBudgets = {
      ...allBudgets,
      [reportYear]: {
        ...allBudgets[reportYear],
        ...newBudgets
      }
    };
    await setDoc(doc(db, "config", "shared"), { allBudgets: updatedAllBudgets }, { merge: true });
  };

  const updatePresident = async (info) => {
    await setDoc(doc(db, "config", "shared"), { presidentInfo: info }, { merge: true });
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', background: 'var(--bg-color)' }}>
        <div className="spinner" style={{ width: '45px', height: '45px', border: '5px solid var(--border-color)', borderTopColor: 'var(--primary-color)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: 'var(--primary-color)', fontWeight: '600', fontSize: '1.2rem' }}>Conectando à Nuvem Cremal...</p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Aguarde enquanto sincronizamos os dados com o servidor.</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <AppContext.Provider
      value={{
        entries,
        addEntry,
        updateEntry,
        deleteEntry,
        clearEntriesByType,
        clearAllEntries,
        budgets: currentBudgets,
        allBudgets,
        updateBudget,
        updateYearBudgets,
        presidentInfo,
        setPresidentInfo: updatePresident,
        reportYear,
        setReportYear,
        finalizedReports: currentFinalized,
        toggleReportLock,
        toasts,
        addToast,
        restoreBackup,
        confirmDialog,
        askConfirmation,
        handleConfirmResponse,
        showHelp,
        setShowHelp
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAppContext = () => useContext(AppContext);
