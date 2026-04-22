/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, ReactNode } from 'react';
import { 
  Users, 
  Scissors, 
  SquareStack, 
  History, 
  FileText, 
  LayoutDashboard, 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  Save, 
  X,
  TrendingUp,
  Package,
  ArrowRight,
  Printer,
  ChevronRight,
  Menu,
  LogOut,
  LogIn,
  Cloud,
  ShieldCheck,
  Zap,
  BookOpen,
  CheckCircle2,
  Info,
  Shield,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toJpeg } from 'html-to-image';
import jsPDF from 'jspdf';
import { Client, Risco, Corte, Section } from './types';
import * as firebase from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

// --- Utils ---
const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    const date = parseLocalDate(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return new Intl.DateTimeFormat('pt-BR').format(date);
  } catch (e) {
    console.error("Format date error:", e);
    return dateStr;
  }
};

/**
 * Parses a date string without timezone interference.
 * Handles YYYY-MM-DD and ISO strings.
 */
const parseLocalDate = (dateStr: string) => {
  if (!dateStr) return new Date();
  
  // If it's an ISO string (like from database old records)
  if (dateStr.includes('T')) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
  }

  // Handle YYYY-MM-DD (preferred format for this app)
  const parts = dateStr.split('-');
  if (parts.length >= 3) {
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const day = parseInt(parts[2].substring(0, 2)); // ignore extra bits if any
    
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return new Date(year, month - 1, day);
    }
  }

  const fallback = new Date(dateStr);
  return isNaN(fallback.getTime()) ? new Date() : fallback;
};

const getMonthYear = (dateStr: string) => {
  if (!dateStr) return { month: -1, year: -1 };
  try {
    const date = parseLocalDate(dateStr);
    if (isNaN(date.getTime())) return { month: -1, year: -1 };
    return { month: date.getMonth(), year: date.getFullYear() };
  } catch (e) {
    return { month: -1, year: -1 };
  }
};

// --- Helper Components ---
const LogoIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className}>
    <path d="M50 8L88 30V70L50 92L12 70V30L50 8Z" stroke="currentColor" strokeWidth="12" strokeLinejoin="round" />
    <text x="50" y="65" fontFamily="sans-serif" fontSize="28" fontWeight="900" fill="currentColor" textAnchor="middle" letterSpacing="-1">IVL</text>
  </svg>
);

function BottomNavItem({ active, icon, label, onClick }: { active: boolean, icon: ReactNode, label: string, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 flex-1 transition-all duration-300 ${active ? 'text-brand-accent' : 'text-gray-500'}`}
    >
      <div className={`transition-transform duration-300 ${active ? 'scale-110 shadow-glow' : 'scale-100'}`}>
        {icon}
      </div>
      <span className={`text-[9px] uppercase font-black tracking-tighter ${active ? 'opacity-100' : 'opacity-50'}`}>{label}</span>
      {active && <motion.div layoutId="bottomNavDot" className="w-1 h-1 bg-brand-accent rounded-full mt-0.5" />}
    </button>
  );
}

// --- Header Logo ---
const Logo = () => (
  <div className="flex items-center gap-3">
    <div className="relative group">
      <div className="absolute inset-0 bg-brand-vibrant blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
      <svg className="w-12 h-12 relative" viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="logo-border-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00D4FF" />
            <stop offset="100%" stopColor="#C9A84C" />
          </linearGradient>
        </defs>
        {/* Hexagonal Frame */}
        <path d="M50 8L88 30V70L50 92L12 70V30L50 8Z" stroke="url(#logo-border-grad)" strokeWidth="6" strokeLinejoin="round" />
        <path d="M50 15L80 32V68L50 85L20 68V32L50 15Z" fill="rgba(0, 212, 255, 0.08)" />
        
        {/* Stylized IVL */}
        <text 
          x="50" y="61" 
          fontFamily="Space Grotesk, sans-serif" 
          fontSize="24" 
          fontWeight="900" 
          fill="white" 
          textAnchor="middle" 
          letterSpacing="-0.5"
          className="drop-shadow-[0_0_8px_rgba(201,168,76,0.5)]"
        >
          IVL
        </text>

        {/* Decoration lines (Cuts) */}
        <path d="M35 25L65 25" stroke="#C9A84C" strokeWidth="1.5" strokeDasharray="3 3" className="opacity-40" />
        <path d="M35 75L65 75" stroke="#C9A84C" strokeWidth="1.5" strokeDasharray="3 3" className="opacity-40" />
      </svg>
    </div>
    <div>
      <h1 className="text-xl font-black tracking-tighter text-white leading-none">IVL Corte</h1>
      <p className="text-[10px] uppercase tracking-[0.3em] text-brand-vibrant font-bold opacity-80">Precisão em cada corte</p>
    </div>
  </div>
);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<Section>('dashboard');
  const [clients, setClients] = useState<Client[]>([]);
  const [riscos, setRiscos] = useState<Risco[]>([]);
  const [cortes, setCortes] = useState<Corte[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [estimateData, setEstimateData] = useState<{client: any, riscos: any[], cortes: any[]} | null>(null);

  // Auth Listener
  useEffect(() => {
    let isMounted = true;
    
    // Timeout fail-safe: se em 8 segundos o Firebase não responder, liberamos a tela 
    // para mostrar o Login ou erro de inicialização.
    const timeout = setTimeout(() => {
      if (isMounted) setAuthLoading(false);
    }, 8000);

    try {
      if (!firebase.auth || firebase.auth.isDummy) {
        console.error("Firebase Auth não foi inicializado corretamente (estado Dummy).");
        setAuthLoading(false);
        clearTimeout(timeout);
        return;
      }

      const unsubscribe = onAuthStateChanged(firebase.auth, async (u) => {
        if (!isMounted) return;
        
        try {
          setUser(u);
          if (u) {
            // Executamos em background para não travar o carregamento da UI
            firebase.ensureUserDoc(u).catch(console.error);
          }
        } catch (err) {
          console.error("Erro no processamento do usuário:", err);
        } finally {
          setAuthLoading(false);
          clearTimeout(timeout);
        }
      }, (error) => {
        console.error("Erro no observador de autenticação:", error);
        if (isMounted) {
          setAuthLoading(false);
          clearTimeout(timeout);
        }
      });

      return () => {
        isMounted = false;
        unsubscribe();
        clearTimeout(timeout);
      };
    } catch (err) {
      console.error("Erro ao configurar listener de autenticação:", err);
      setAuthLoading(false);
      clearTimeout(timeout);
    }
  }, []);

  // Data Subscriptions
  useEffect(() => {
    if (!user) {
      setClients([]);
      setRiscos([]);
      setCortes([]);
      return;
    }

    const unsubClients = firebase.subscribeClients(user.uid, setClients);
    const unsubRiscos = firebase.subscribeRiscos(user.uid, setRiscos);
    const unsubCortes = firebase.subscribeCortes(user.uid, setCortes);

    return () => {
      unsubClients();
      unsubRiscos();
      unsubCortes();
    };
  }, [user]);

  // Derived State
  const activeClientForHistory = useMemo(() => 
    clients.find(c => c.id === selectedClientId) || null,
  [clients, selectedClientId]);

  // --- Handlers ---
  const handleAddClient = async (clientData: any) => {
    if (!user) return;
    try {
      await firebase.addClient(user.uid, clientData);
    } catch (e: any) {
      alert('Erro ao salvar cliente. Verifique sua conexão.');
    }
  };

  const handleUpdateClient = async (client: Client) => {
    if (!user) return;
    try {
      await firebase.updateClient(user.uid, client);
    } catch (e: any) {
      alert('Erro ao atualizar cliente.');
    }
  };

  const handleRemoveClient = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este cliente?')) {
      if (!user) return;
      try {
        await firebase.deleteClient(user.uid, id);
      } catch (e: any) {
        alert('Erro ao excluir cliente.');
      }
    }
  };

  const handleAddRisco = async (riscoData: any) => {
    if (!user) return;
    try {
      await firebase.addRisco(user.uid, riscoData);
    } catch (e: any) {
      console.error(e);
      alert('Erro ao salvar risco. Verifique se o cliente ainda existe.');
    }
  };

  const handleRemoveRisco = async (id: string) => {
    if (!user) return;
    try {
      await firebase.deleteRisco(user.uid, id);
    } catch (e: any) {
      alert('Erro ao excluir risco.');
    }
  };

  const handleAddCorte = async (corteData: any) => {
    if (!user) return;
    try {
      await firebase.addCorte(user.uid, corteData);
    } catch (e: any) {
      alert('Erro ao salvar corte.');
    }
  };

  const handleRemoveCorte = async (id: string) => {
    if (!user) return;
    try {
      await firebase.deleteCorte(user.uid, id);
    } catch (e: any) {
      alert('Erro ao excluir corte.');
    }
  };

  const navigateToHistory = (clientId: string) => {
    setSelectedClientId(clientId);
    setActiveSection('historico');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-brand-primary flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginView onLogin={firebase.loginWithGoogle} />;
  }

  // --- Views ---
  const renderView = () => {
    switch (activeSection) {
      case 'dashboard': return <DashboardView clients={clients} riscos={riscos} cortes={cortes} onNavigateHistory={navigateToHistory} />;
      case 'clientes': return <ClientsView clients={clients} onAdd={handleAddClient} onUpdate={handleUpdateClient} onDelete={handleRemoveClient} onNavigateHistory={navigateToHistory} />;
      case 'risco': return <RiscoView riscos={riscos} clients={clients} onAdd={handleAddRisco} onDelete={handleRemoveRisco} />;
      case 'corte': return <CorteView cortes={cortes} clients={clients} onAdd={handleAddCorte} onDelete={handleRemoveCorte} />;
      case 'historico': return (
        <HistoryView 
          client={activeClientForHistory} 
          riscos={riscos} 
          cortes={cortes} 
          clients={clients} 
          onSelectClient={setSelectedClientId} 
          onOpenEstimate={(data: any) => setEstimateData(data)}
          onDeleteRisco={handleRemoveRisco}
          onDeleteCorte={handleRemoveCorte}
        />
      );
      case 'guia': return <GuideView />;
      default: return <DashboardView clients={clients} riscos={riscos} cortes={cortes} onNavigateHistory={navigateToHistory} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 glass border-r border-white/10 transform transition-transform duration-300 md:relative md:translate-x-0 no-print flex flex-col
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 shrink-0">
          <Logo />
        </div>

        <nav className="mt-6 px-4 space-y-2 flex-1 overflow-y-auto pb-44">
          <NavItem active={activeSection === 'dashboard'} icon={<LayoutDashboard size={20} />} label="Dashboard" onClick={() => { setActiveSection('dashboard'); setIsSidebarOpen(false); }} />
          <NavItem active={activeSection === 'clientes'} icon={<Users size={20} />} label="Clientes" onClick={() => { setActiveSection('clientes'); setIsSidebarOpen(false); }} />
          <NavItem active={activeSection === 'risco'} icon={<Scissors size={20} />} label="Risco" onClick={() => { setActiveSection('risco'); setIsSidebarOpen(false); }} />
          <NavItem active={activeSection === 'corte'} icon={<SquareStack size={20} />} label="Corte" onClick={() => { setActiveSection('corte'); setIsSidebarOpen(false); }} />
          <NavItem active={activeSection === 'historico'} icon={<History size={20} />} label="Histórico" onClick={() => { setActiveSection('historico'); setIsSidebarOpen(false); }} />
          <NavItem active={activeSection === 'guia'} icon={<BookOpen size={20} />} label="Guia de Uso" onClick={() => { setActiveSection('guia'); setIsSidebarOpen(false); }} />
        </nav>

        <div className="absolute bottom-6 left-0 right-0 px-4 space-y-4">
          <div className="bg-brand-accent/10 border border-brand-accent/20 p-4 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-accent/20 rounded-xl flex items-center justify-center text-brand-accent font-black text-xs border border-brand-accent/20">
              {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-[10px] font-bold text-white leading-tight truncate">{user.displayName || 'Usuário'}</p>
              <div className="flex items-center gap-1.5 opacity-60">
                <div className="w-1.5 h-1.5 bg-brand-vibrant rounded-full animate-pulse"></div>
                <span className="text-[8px] uppercase tracking-wider font-bold text-gray-300 truncate">{user.email}</span>
              </div>
            </div>
          </div>

          <button 
            onClick={firebase.logout}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 active:scale-[0.98]"
          >
            <LogOut size={18} />
            <span className="text-sm font-bold uppercase tracking-widest">Sair do Sistema</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <header className="md:hidden flex items-center justify-between p-4 glass border-b border-white/10 z-30 no-print">
        <Logo />
        <div className="flex items-center gap-2">
          <button 
            onClick={firebase.logout}
            className="p-2 text-red-400/60 hover:text-red-400 transition-colors"
            title="Sair"
          >
            <LogOut size={20} />
          </button>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-white bg-white/5 rounded-lg active:scale-95 transition-all">
            <Menu size={24} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className={`flex-1 overflow-y-auto p-4 md:p-8 bg-transparent pb-24 md:pb-8 ${estimateData ? 'no-print' : ''}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Tab Bar (Mobile) */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 glass border-t border-white/10 z-[100] px-2 py-3 flex justify-around items-center no-print ${estimateData ? 'hidden' : ''}`}>
        <BottomNavItem active={activeSection === 'dashboard'} icon={<LayoutDashboard size={22} />} label="Início" onClick={() => setActiveSection('dashboard')} />
        <BottomNavItem active={activeSection === 'clientes'} icon={<Users size={22} />} label="Clientes" onClick={() => setActiveSection('clientes')} />
        <div className="relative -top-6">
          <button 
            onClick={() => {
              setActiveSection('dashboard');
            }}
            className="w-14 h-14 bg-brand-accent text-brand-primary rounded-full flex items-center justify-center shadow-2xl shadow-brand-accent/40 border-4 border-brand-primary"
          >
            <LogoIcon size={24} />
          </button>
        </div>
        <BottomNavItem active={activeSection === 'risco'} icon={<Scissors size={22} />} label="Risco" onClick={() => setActiveSection('risco')} />
        <BottomNavItem active={activeSection === 'corte'} icon={<SquareStack size={22} />} label="Corte" onClick={() => setActiveSection('corte')} />
      </nav>

      {/* Global Modals */}
      <AnimatePresence>
        {estimateData && (
          <EstimateModal 
            client={estimateData.client}
            riscos={estimateData.riscos}
            cortes={estimateData.cortes}
            onClose={() => setEstimateData(null)}
          />
        )}
      </AnimatePresence>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden no-print" onClick={() => setIsSidebarOpen(false)}></div>
      )}
    </div>
  );
}

// --- Navigation Item Component ---
function NavItem({ active, icon, label, onClick }: { active: boolean, icon: ReactNode, label: string, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300
        ${active 
          ? 'bg-brand-accent/20 text-brand-accent font-bold border border-brand-accent/30 shadow-lg shadow-brand-accent/10' 
          : 'text-gray-400 hover:bg-white/5 hover:text-white'}
      `}
    >
      {icon}
      <span className="text-sm">{label}</span>
      {active && <motion.div layoutId="activeNav" className="ml-auto w-1 h-1 bg-brand-primary rounded-full"></motion.div>}
    </button>
  );
}

// --- Components ---

function LoginView({ onLogin }: { onLogin: () => void }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await onLogin();
    } catch (err: any) {
      console.error("Login Error:", err);
      if (err.code === 'auth/unauthorized-domain') {
        setError('Este domínio não está autorizado no Firebase. Adicione o domínio atual em "Authorized Domains" no console do Firebase.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Falha de rede ou bloqueio de comunicação. Se você estiver usando o preview do AI Studio, tente abrir o aplicativo em uma NOVA ABA utilizando o botão no canto superior direito do editor.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('O pop-up de login foi bloqueado. Por favor, autorize pop-ups para este site ou clique novamente.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('O login com Google não está ativado no console do Firebase (Authentication > Sign-in method).');
      } else if (err.message?.includes('cross-origin')) {
        setError('Erro de segurança (Cross-Origin). Tente abrir o aplicativo em uma NOVA ABA para realizar o login corretamente.');
      } else {
        setError(`Erro de login: ${err.message || 'Verifique sua conexão'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-primary flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
      <div className="max-w-md w-full space-y-8 my-8">
        <div className="flex flex-col items-center">
          <Logo />
          <div className="mt-8 space-y-2">
            <h2 className="text-2xl font-black text-white tracking-tight uppercase">
              Acessar Painel
            </h2>
            <p className="text-gray-400 font-medium text-sm">
              Gestão de corte têxtil profissional para a IVL.
            </p>
          </div>
        </div>

        <div className="glass-card p-8 space-y-8">
          {(!firebase.auth || firebase.auth.isDummy) && (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs p-4 rounded-xl text-left flex items-start gap-3">
              <Info size={18} className="shrink-0" />
              <p>
                <strong>Atenção:</strong> O serviço de autenticação não foi inicializado corretamente. 
                Verifique se as chaves da API no arquivo de configuração estão corretas ou se o Firebase já foi configurado para este projeto.
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div className="aspect-square w-16 h-16 bg-brand-accent/10 rounded-full flex items-center justify-center mx-auto mb-2">
              <Shield className="w-8 h-8 text-brand-accent" />
            </div>
            <h3 className="text-lg font-bold text-white">Login Seguro</h3>
            <p className="text-gray-400 text-xs px-4">
              Utilizamos a autenticação oficial do Google para garantir a segurança dos seus dados têxteis.
            </p>
          </div>

          <div className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl whitespace-pre-wrap text-left">
                {error}
              </div>
            )}

            <button 
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-brand-accent text-brand-primary font-bold py-5 rounded-2xl shadow-xl hover:shadow-brand-accent/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
              {loading ? 'Conectando...' : 'Entrar com Conta Google'}
            </button>
          </div>

          <p className="text-[10px] text-gray-500 font-medium leading-relaxed">
            Ao entrar, você concorda com as políticas de segurança <br/> internas da IVL Comércio e Confecções.
          </p>
        </div>

        <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">
          © 2026 IVL Comércio e Confecções LTDA
        </p>
      </div>
    </div>
  );
}

// --- Dashboard View ---
function DashboardView({ clients, riscos, cortes, onNavigateHistory }: any) {
  // Stats
  const totalClients = clients.length;
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const currentMonthRiscos = riscos.filter((r: any) => {
    const { month, year } = getMonthYear(r.date);
    return month === currentMonth && year === currentYear;
  });

  const currentMonthCortes = cortes.filter((c: any) => {
    const { month, year } = getMonthYear(c.date);
    return month === currentMonth && year === currentYear;
  });

  const monthlyRevenue = 
    currentMonthRiscos.reduce((acc: number, r: any) => acc + (parseFloat(r.totalCost) || 0), 0) +
    currentMonthCortes.reduce((acc: number, c: any) => acc + (parseFloat(c.totalCost) || 0), 0);

  const lastOrders = [
    ...riscos.map((r: any) => ({ ...r, type: 'Risco' })),
    ...cortes.map((c: any) => ({ ...c, type: 'Corte' }))
  ].sort((a, b) => b.id.localeCompare(a.id)).slice(0, 5);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      console.log('IVL App instalada com sucesso');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 md:gap-4 px-2 md:px-0">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight uppercase">Painel IVL</h2>
          <p className="text-gray-400 font-medium text-xs md:text-base">Monitoramento em tempo real</p>
        </div>
        <div className="flex items-center justify-between md:justify-end gap-4 mt-2 md:mt-0">
          {deferredPrompt && (
            <button 
              onClick={handleInstallClick}
              className="bg-brand-vibrant/10 text-brand-vibrant border border-brand-vibrant/30 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-brand-vibrant hover:text-brand-primary transition-all"
            >
              Instalar App
            </button>
          )}
          <div className="text-right">
            <p className="text-[10px] md:text-sm font-bold text-brand-accent uppercase tracking-[0.2em]">{formatDate(new Date().toISOString())}</p>
          </div>
        </div>
      </div>

      {/* Stats Cards - Adjusted for Mobile Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <StatCard icon={<Users className="text-brand-vibrant" size={20} />} label="Clientes (Total)" value={totalClients.toString()} color="brand-vibrant" />
        <StatCard icon={<Scissors className="text-brand-coral" size={20} />} label="Riscos (Mês)" value={currentMonthRiscos.length.toString()} color="brand-coral" />
        <StatCard icon={<SquareStack className="text-brand-accent" size={20} />} label="Cortes (Mês)" value={currentMonthCortes.length.toString()} color="brand-accent" />
        <StatCard icon={<TrendingUp className="text-green-400" size={20} />} label="Faturamento" value={formatCurrency(monthlyRevenue).replace('R$', '').trim()} color="green-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart Column */}
        <div className="lg:col-span-2 glass-card">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-white">Comparativo Mensal</h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-brand-coral rounded-full"></div>
                <span className="text-xs text-gray-400 uppercase font-bold">Risco</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-brand-vibrant rounded-full"></div>
                <span className="text-xs text-gray-400 uppercase font-bold">Corte</span>
              </div>
            </div>
          </div>
          
          <SimpleChart riscos={riscos} cortes={cortes} />
        </div>

        {/* Last Orders */}
        <div className="glass-card">
          <h3 className="text-xl font-bold text-white mb-6">Ordens Recentes</h3>
          <div className="space-y-4">
            {lastOrders.map((order, i) => (
              <div key={i} className="group flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-all cursor-pointer" onClick={() => onNavigateHistory(order.clientId)}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${order.type === 'Risco' ? 'bg-brand-coral/20 text-brand-coral' : 'bg-brand-vibrant/20 text-brand-vibrant'}`}>
                    {order.type[0]}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-brand-accent transition-colors">{order.model}</h4>
                    <p className="text-[10px] text-gray-500 font-bold uppercase">{clients.find((c: any) => c.id === order.clientId)?.name || 'Cliente'} • {formatDate(order.date)}</p>
                  </div>
                </div>
                <ArrowRight size={14} className="text-gray-600 group-hover:text-brand-accent group-hover:translate-x-1 transition-all" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: any) {
  return (
    <div className="glass-card relative overflow-hidden group p-4 md:p-6">
      <div className={`absolute top-0 left-0 w-1 md:w-1.5 h-full bg-${color} opacity-40 md:opacity-100`}></div>
      <div className="flex flex-col md:block">
        <div className="p-2 md:p-3 bg-white/5 rounded-xl md:rounded-2xl w-fit mb-3 md:mb-4 group-hover:scale-110 transition-transform duration-500">
          {icon}
        </div>
        <p className="text-[9px] md:text-xs text-gray-400 font-bold uppercase tracking-widest leading-tight">{label}</p>
        <h4 className="text-xl md:text-3xl font-black text-white mt-0.5 md:mt-1 font-mono tracking-tighter truncate">{value}</h4>
      </div>
    </div>
  );
}

function SimpleChart({ riscos, cortes }: any) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      
      canvas.width = rect.width * dpr;
      canvas.height = 200 * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `200px`;
      ctx.scale(dpr, dpr);

      const lastMonths = Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (5 - i));
        return { month: d.getMonth(), year: d.getFullYear(), label: new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(d) };
      });

      const data = lastMonths.map(m => {
        const rSum = riscos.filter((r: any) => {
          const { month, year } = getMonthYear(r.date);
          return month === m.month && year === m.year;
        }).reduce((acc: number, r: any) => acc + (parseFloat(r.totalCost) || 0), 0);

        const cSum = cortes.filter((c: any) => {
          const { month, year } = getMonthYear(c.date);
          return month === m.month && year === m.year;
        }).reduce((acc: number, c: any) => acc + (parseFloat(c.totalCost) || 0), 0);

        return { label: m.label, rSum, cSum };
      });

      const maxVal = Math.max(...data.map(d => Math.max(d.rSum, d.cSum)), 100) * 1.2;
      const padding = 30;
      const chartWidth = rect.width - padding * 2;
      const chartHeight = 150;
      const barGap = chartWidth / 6;
      const barWidth = Math.min(barGap * 0.35, 12);

      data.forEach((d, i) => {
        const x = padding + i * barGap + barGap / 2;
        const rH = (d.rSum / maxVal) * chartHeight;
        ctx.fillStyle = '#FF6B6B';
        ctx.beginPath();
        ctx.roundRect(x - barWidth - 2, 180 - rH, barWidth, rH, [4, 4, 0, 0]);
        ctx.fill();

        const cH = (d.cSum / maxVal) * chartHeight;
        ctx.fillStyle = '#00D4FF';
        ctx.beginPath();
        ctx.roundRect(x + 2, 180 - cH, barWidth, cH, [4, 4, 0, 0]);
        ctx.fill();

        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 9px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(d.label.toUpperCase(), x, 195);
      });
    };

    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) observer.observe(containerRef.current);
    handleResize();

    return () => observer.disconnect();
  }, [riscos, cortes]);

  return (
    <div ref={containerRef} className="w-full h-[200px]">
      <canvas ref={canvasRef} />
    </div>
  );
}

// --- Clients View ---
function ClientsView({ clients, onAdd, onUpdate, onDelete, onNavigateHistory }: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);

  const filteredClients = clients.filter((c: any) => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.document.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2 md:px-0">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight uppercase">Clientes</h2>
          <p className="text-gray-400 font-medium text-xs md:text-sm">Gestão da base de parceiros</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input 
              type="text" 
              placeholder="Nome ou CNPJ..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-brand-accent transition-colors"
            />
          </div>
          <button 
            onClick={() => { setEditingClient(null); setIsModalOpen(true); }}
            className="flex items-center gap-2 bg-brand-accent text-brand-primary font-bold px-4 py-3 rounded-xl hover:shadow-lg hover:shadow-brand-accent/20 transition-all active:scale-95 whitespace-nowrap"
          >
            <Plus size={18} />
            <span className="hidden md:inline">Novo Cliente</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 px-1 md:px-0">
        {filteredClients.map((client: any) => (
          <div key={client.id} className="glass-card flex flex-col h-full hover:border-brand-accent/30 !p-5">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-white/5 rounded-xl md:rounded-2xl flex items-center justify-center text-base md:text-lg font-black text-brand-vibrant border border-white/5 shadow-inner">
                {client.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setEditingClient(client); setIsModalOpen(true); }} className="p-2 text-gray-500 hover:text-brand-vibrant transition-colors">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => onDelete(client.id)} className="p-2 text-gray-500 hover:text-brand-coral transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            
            <h3 className="text-base md:text-lg font-black text-white mb-0.5 tracking-tight truncate uppercase">{client.name}</h3>
            <p className="text-[10px] text-gray-500 font-bold mb-4 uppercase tracking-[0.1em]">{client.document}</p>
            
            <div className="space-y-2 mb-6 flex-1 bg-white/5 p-3 rounded-xl border border-white/5">
              <div className="flex items-center justify-between text-[11px] text-gray-300">
                <span className="text-gray-500 uppercase font-bold">WhatsApp:</span>
                <span className="font-mono font-bold text-brand-accent">{client.whatsapp}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-gray-300">
                <span className="text-gray-500 uppercase font-bold">E-mail:</span>
                <span className="truncate ml-2">{client.email}</span>
              </div>
            </div>

            <button 
              onClick={() => onNavigateHistory(client.id)}
              className="w-full flex items-center justify-center gap-2 bg-brand-accent/10 text-[10px] text-brand-accent font-black py-4 rounded-xl border border-brand-accent/20 hover:bg-brand-accent hover:text-brand-primary transition-all group uppercase tracking-widest"
            >
              Histórico & O.S.
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <ClientModal 
          client={editingClient} 
          onClose={() => setIsModalOpen(false)} 
          onSubmit={(data: any) => {
            if (editingClient) onUpdate({ ...editingClient, ...data });
            else onAdd({ ...data, id: Date.now().toString(), createdAt: new Date().toISOString() });
            setIsModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

function ClientModal({ client, onClose, onSubmit }: any) {
  const [formData, setFormData] = useState(client || { name: '', document: '', whatsapp: '', email: '', notes: '', paymentMethod: '', pixKey: '' });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative glass-card w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors">
          <X size={20} />
        </button>

        <h3 className="text-2xl font-black text-white mb-6">
          {client ? 'Editar Cliente' : 'Novo Cliente'}
        </h3>

        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }}>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest pl-1">Nome / Razão Social</label>
            <input 
              required
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-white focus:outline-none focus:border-brand-accent transition-colors" 
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest pl-1">WhatsApp</label>
              <input 
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-white focus:outline-none focus:border-brand-accent transition-colors" 
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest pl-1">CPF / CNPJ</label>
              <input 
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-white focus:outline-none focus:border-brand-accent transition-colors" 
                value={formData.document}
                onChange={(e) => setFormData({ ...formData, document: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest pl-1">Forma de Pagamento Padrão</label>
            <select 
              className="w-full bg-[#1A1A2E] border border-white/10 rounded-2xl py-3 px-4 text-white focus:outline-none focus:border-brand-accent transition-colors appearance-none" 
              value={formData.paymentMethod || ''}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
            >
              <option value="">Selecione...</option>
              <option value="Pix">Pix</option>
              <option value="Boleto">Boleto Bancário</option>
              <option value="Transferência">Transferência Bancária</option>
              <option value="Dinheiro">Dinheiro</option>
            </select>
          </div>

          {formData.paymentMethod === 'Pix' && (
            <div className="space-y-1 animate-in fade-in zoom-in-95 duration-200">
              <label className="text-[10px] uppercase font-bold text-brand-vibrant tracking-widest pl-1">Chave Pix</label>
              <input 
                className="w-full bg-brand-vibrant/10 border border-brand-vibrant/30 rounded-2xl py-3 px-4 text-white focus:outline-none focus:border-brand-vibrant transition-colors" 
                value={formData.pixKey || ''}
                placeholder="Ex: CNPJ, Telefone, E-mail..."
                onChange={(e) => setFormData({ ...formData, pixKey: e.target.value })}
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest pl-1">Observações</label>
            <textarea 
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-white focus:outline-none focus:border-brand-accent transition-colors resize-none" 
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <button 
            type="submit"
            className="w-full bg-brand-accent text-brand-primary font-bold py-4 rounded-2xl mt-4 hover:shadow-xl hover:shadow-brand-accent/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Save size={20} />
            {client ? 'Salvar Alterações' : 'Cadastrar Cliente'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

// --- Risco View ---
function RiscoView({ riscos, clients, onAdd, onDelete }: any) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const filteredRiscos = riscos.filter((r: any) => {
    const clientName = clients.find((c: any) => c.id === r.clientId)?.name || '';
    const matchesSearch = r.model.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         clientName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = !dateFilter || r.date === dateFilter;
    return matchesSearch && matchesDate;
  });

  const totalMeters = filteredRiscos.reduce((acc: number, r: any) => {
    const amount = parseFloat(r.amount) || 0;
    return acc + (r.unit === 'cm' ? amount / 100 : amount);
  }, 0);
  const totalValue = filteredRiscos.reduce((acc: number, r: any) => acc + (parseFloat(r.totalCost) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2 md:px-0">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight uppercase">Risco</h2>
          <p className="text-gray-400 font-medium text-xs md:text-sm">Marcação e traçado de tecidos</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-brand-coral text-white font-bold px-5 py-3 rounded-xl hover:shadow-lg hover:shadow-brand-coral/20 transition-all active:scale-95 w-full md:w-auto justify-center"
        >
          <Plus size={20} />
          Registrar Risco
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 px-2 md:px-0">
        <div className="lg:col-span-2 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input 
              type="text" 
              placeholder="Buscar modelo ou cliente..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-brand-accent transition-colors"
            />
          </div>
          <input 
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-brand-accent transition-colors md:w-48"
          />
        </div>
        
        <div className="glass-card flex items-center justify-between p-4 border-l-4 border-brand-coral">
          <div>
            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Total Metros</p>
            <p className="text-xl font-black text-white font-mono">{totalMeters.toFixed(2)}m</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Total R$</p>
            <p className="text-xl font-black text-brand-coral font-mono">{formatCurrency(totalValue)}</p>
          </div>
        </div>
      </div>

      <div className="hidden md:block glass-card overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 text-[10px] uppercase tracking-widest text-gray-400 font-bold border-b border-white/10">
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Modelo</th>
                <th className="px-6 py-4">Medida</th>
                <th className="px-6 py-4">R$ / Metro</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredRiscos.map((risco: any) => (
                <tr key={risco.id} className="text-sm text-gray-300 hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4 font-bold">{formatDate(risco.date)}</td>
                  <td className="px-6 py-4">{clients.find((c: any) => c.id === risco.clientId)?.name}</td>
                  <td className="px-6 py-4 font-medium text-white">{risco.model}</td>
                  <td className="px-6 py-4 font-mono">{risco.amount}{risco.unit}</td>
                  <td className="px-6 py-4 font-mono text-gray-500">{formatCurrency(risco.unitCost)}</td>
                  <td className="px-6 py-4 font-bold text-brand-coral">{formatCurrency(risco.totalCost)}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => onDelete(risco.id)} className="p-2 text-gray-600 hover:text-brand-coral transition-all">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredRiscos.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 italic">Nenhum registro encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="md:hidden space-y-3 px-2">
        {filteredRiscos.map((risco: any) => (
          <div key={risco.id} className="glass-card relative border-l-4 border-brand-coral overflow-hidden p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-[10px] text-brand-coral font-bold uppercase tracking-widest">{formatDate(risco.date)}</p>
                <h3 className="text-base font-black text-white uppercase truncate">{risco.model}</h3>
              </div>
              <button onClick={() => onDelete(risco.id)} className="p-2 bg-brand-coral/10 text-brand-coral rounded-lg">
                <Trash2 size={16} />
              </button>
            </div>
            
            <div className="flex items-center gap-2 mb-4 bg-white/5 p-2 rounded-lg text-xs text-gray-300">
              <Users size={14} className="text-gray-500" />
              <span className="truncate">{clients.find((c: any) => c.id === risco.clientId)?.name}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/5">
              <div>
                <p className="text-[9px] text-gray-500 font-bold uppercase">Medida</p>
                <p className="text-sm font-black text-white font-mono">{risco.amount}{risco.unit}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-gray-500 font-bold uppercase">Total</p>
                <p className="text-sm font-black text-brand-coral font-mono">{formatCurrency(risco.totalCost)}</p>
              </div>
            </div>
          </div>
        ))}
        {filteredRiscos.length === 0 && (
          <div className="glass-card py-12 text-center text-gray-500 italic">Nenhum registro encontrado.</div>
        )}
      </div>

      {isModalOpen && (
        <RiscoModal 
          clients={clients} 
          onClose={() => setIsModalOpen(false)} 
          onSubmit={(data: any) => {
            onAdd({ ...data, id: Date.now().toString() });
            setIsModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

function RiscoModal({ clients, onClose, onSubmit }: any) {
  const [formData, setFormData] = useState({ 
    clientId: '', 
    date: new Date().toISOString().split('T')[0], 
    model: '', 
    amount: '', 
    unit: 'm' as 'm' | 'cm',
    unitCost: '', 
    notes: '' 
  });

  const amountNum = parseFloat(formData.amount) || 0;
  const metersValue = formData.unit === 'cm' ? amountNum / 100 : amountNum;
  const totalCostRaw = metersValue * (parseFloat(formData.unitCost) || 0);
  // Round to 2 decimals to avoid floating point drift in db
  const totalCost = Math.round((totalCostRaw + Number.EPSILON) * 100) / 100;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative glass-card w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors">
          <X size={20} />
        </button>

        <h3 className="text-2xl font-black text-white mb-6 uppercase tracking-tighter">Registrar Risco</h3>

        <form className="space-y-4" onSubmit={(e) => { 
          e.preventDefault(); 
          onSubmit({ 
            ...formData, 
            amount: parseFloat(formData.amount) || 0, 
            unitCost: parseFloat(formData.unitCost) || 0,
            totalCost 
          }); 
        }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest pl-1">Data</label>
              <input 
                type="date"
                required
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-white focus:outline-none focus:border-brand-accent transition-colors" 
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest pl-1">Cliente</label>
              <select 
                required
                className="w-full bg-brand-primary border border-white/10 rounded-2xl py-3 px-4 text-white focus:outline-none focus:border-brand-accent transition-colors appearance-none" 
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
              >
                <option value="">Selecione...</option>
                {clients.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest pl-1">Modelo / Referência</label>
            <input 
              required
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-white focus:outline-none focus:border-brand-accent transition-colors" 
              value={formData.model}
              placeholder="Ex: Camiseta Básica"
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest pl-1">Medida</label>
              <div className="relative">
                <input 
                  type="number"
                  step="0.01"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-4 text-white focus:outline-none focus:border-brand-accent transition-colors text-lg font-mono font-bold" 
                  value={formData.amount}
                  placeholder="0.00"
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex bg-white/10 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, unit: 'm' })}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${formData.unit === 'm' ? 'bg-brand-accent text-brand-primary' : 'text-gray-400'}`}
                  >
                    M
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, unit: 'cm' })}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${formData.unit === 'cm' ? 'bg-brand-accent text-brand-primary' : 'text-gray-400'}`}
                  >
                    CM
                  </button>
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest pl-1">R$ / Metro</label>
              <input 
                type="number"
                step="0.01"
                required
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-4 text-brand-accent focus:outline-none focus:border-brand-accent transition-colors text-lg font-mono font-bold" 
                value={formData.unitCost}
                placeholder="0.00"
                onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
              />
            </div>
          </div>

          <div className="bg-brand-coral/10 p-5 rounded-2xl border border-brand-coral/20 flex flex-col items-center">
            <span className="text-[10px] font-bold text-brand-coral uppercase tracking-[0.2em] mb-1">Custo Total Calculado</span>
            <span className="text-3xl font-black text-white font-mono">{formatCurrency(totalCost)}</span>
          </div>

          <button 
            type="submit"
            className="w-full bg-brand-coral text-white font-bold py-4 rounded-2xl mt-2 hover:shadow-xl hover:shadow-brand-coral/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Save size={20} />
            Salvar Registro
          </button>
        </form>
      </motion.div>
    </div>
  );
}

// --- Corte View ---
function CorteView({ cortes, clients, onAdd, onDelete }: any) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const filteredCortes = cortes.filter((c: any) => {
    const clientName = clients.find((cl: any) => cl.id === c.clientId)?.name || '';
    const matchesSearch = c.model.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         clientName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = !dateFilter || c.date === dateFilter;
    return matchesSearch && matchesDate;
  });

  const totalPieces = filteredCortes.reduce((acc: number, c: any) => acc + (parseInt(c.quantity) || 0), 0);
  const totalValue = filteredCortes.reduce((acc: number, c: any) => acc + (parseFloat(c.totalCost) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2 md:px-0">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight uppercase">Corte</h2>
          <p className="text-gray-400 font-medium text-xs md:text-sm">Produção e corte de peças</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-brand-vibrant text-brand-primary font-bold px-5 py-3 rounded-xl hover:shadow-lg hover:shadow-brand-vibrant/20 transition-all active:scale-95 w-full md:w-auto justify-center"
        >
          <Plus size={20} />
          Registrar Corte
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 px-2 md:px-0">
        <div className="lg:col-span-2 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input 
              type="text" 
              placeholder="Buscar modelo ou cliente..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-brand-accent transition-colors"
            />
          </div>
          <input 
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-brand-accent transition-colors md:w-48"
          />
        </div>
        
        <div className="glass-card flex items-center justify-between p-4 border-l-4 border-brand-vibrant">
          <div>
            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Peças Produzidas</p>
            <p className="text-xl font-black text-white font-mono">{totalPieces} un</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Total R$</p>
            <p className="text-xl font-black text-brand-vibrant font-mono">{formatCurrency(totalValue)}</p>
          </div>
        </div>
      </div>

      <div className="hidden md:block glass-card overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 text-[10px] uppercase tracking-widest text-gray-400 font-bold border-b border-white/10">
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Modelo</th>
                <th className="px-6 py-4">Qtd Peças</th>
                <th className="px-6 py-4">R$ / Peça</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredCortes.map((corte: any) => (
                <tr key={corte.id} className="text-sm text-gray-300 hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4 font-bold">{formatDate(corte.date)}</td>
                  <td className="px-6 py-4">{clients.find((c: any) => c.id === corte.clientId)?.name}</td>
                  <td className="px-6 py-4 font-medium text-white">{corte.model}</td>
                  <td className="px-6 py-4 font-mono">{corte.quantity} un</td>
                  <td className="px-6 py-4 font-mono text-gray-500">{formatCurrency(corte.pieceValue)}</td>
                  <td className="px-6 py-4 font-bold text-brand-vibrant">{formatCurrency(corte.totalCost)}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => onDelete(corte.id)} className="p-2 text-gray-600 hover:text-brand-coral transition-all">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredCortes.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 italic">Nenhum registro encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="md:hidden space-y-3 px-2">
        {filteredCortes.map((corte: any) => (
          <div key={corte.id} className="glass-card relative border-l-4 border-brand-vibrant overflow-hidden p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-[10px] text-brand-vibrant font-bold uppercase tracking-widest">{formatDate(corte.date)}</p>
                <h3 className="text-base font-black text-white uppercase truncate">{corte.model}</h3>
              </div>
              <button onClick={() => onDelete(corte.id)} className="p-2 bg-brand-vibrant/10 text-brand-vibrant rounded-lg">
                <Trash2 size={16} />
              </button>
            </div>
            
            <div className="flex items-center gap-2 mb-4 bg-white/5 p-2 rounded-lg text-xs text-gray-300">
              <Users size={14} className="text-gray-500" />
              <span className="truncate">{clients.find((cl: any) => cl.id === corte.clientId)?.name}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/5">
              <div>
                <p className="text-[9px] text-gray-500 font-bold uppercase">Quantidade</p>
                <p className="text-sm font-black text-white font-mono">{corte.quantity} un</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-gray-500 font-bold uppercase">Total</p>
                <p className="text-sm font-black text-brand-vibrant font-mono">{formatCurrency(corte.totalCost)}</p>
              </div>
            </div>
          </div>
        ))}
        {filteredCortes.length === 0 && (
          <div className="glass-card py-12 text-center text-gray-500 italic">Nenhum registro encontrado.</div>
        )}
      </div>

      {isModalOpen && (
        <CorteModal 
          clients={clients} 
          onClose={() => setIsModalOpen(false)} 
          onSubmit={(data: any) => {
            onAdd({ ...data, id: Date.now().toString() });
            setIsModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

function CorteModal({ clients, onClose, onSubmit }: any) {
  const [formData, setFormData] = useState({ 
    clientId: '', 
    date: new Date().toISOString().split('T')[0], 
    model: '', 
    pieceValue: '', 
    quantity: '', 
    notes: '' 
  });

  const totalCostRaw = (parseFloat(formData.pieceValue) || 0) * (parseInt(formData.quantity) || 0);
  const totalCost = Math.round((totalCostRaw + Number.EPSILON) * 100) / 100;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative glass-card w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors">
          <X size={20} />
        </button>

        <h3 className="text-2xl font-black text-white mb-6 uppercase tracking-tighter">Registrar Corte</h3>

        <form className="space-y-4" onSubmit={(e) => { 
          e.preventDefault(); 
          onSubmit({ 
            ...formData, 
            pieceValue: parseFloat(formData.pieceValue) || 0, 
            quantity: parseInt(formData.quantity) || 0,
            totalCost 
          }); 
        }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest pl-1">Data</label>
              <input 
                type="date"
                required
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-white focus:outline-none focus:border-brand-accent transition-colors" 
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest pl-1">Cliente</label>
              <select 
                required
                className="w-full bg-brand-primary border border-white/10 rounded-2xl py-3 px-4 text-white focus:outline-none focus:border-brand-accent transition-colors appearance-none" 
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
              >
                <option value="">Selecione...</option>
                {clients.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest pl-1">Modelo / Referência</label>
            <input 
              required
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-white focus:outline-none focus:border-brand-accent transition-colors" 
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest pl-1">Quantidade de Peças</label>
              <input 
                type="number"
                required
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-4 text-white focus:outline-none focus:border-brand-accent transition-colors text-lg font-mono font-bold" 
                value={formData.quantity}
                placeholder="0"
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest pl-1">R$ por Peça</label>
              <input 
                type="number"
                step="0.01"
                required
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-4 text-brand-vibrant focus:outline-none focus:border-brand-accent transition-colors text-lg font-mono font-bold" 
                value={formData.pieceValue}
                placeholder="0.00"
                onChange={(e) => setFormData({ ...formData, pieceValue: e.target.value })}
              />
            </div>
          </div>

          <div className="bg-brand-vibrant/10 p-5 rounded-2xl border border-brand-vibrant/20 flex flex-col items-center">
            <span className="text-[10px] font-bold text-brand-vibrant uppercase tracking-[0.2em] mb-1">Custo Total Calculado</span>
            <span className="text-3xl font-black text-white font-mono">{formatCurrency(totalCost)}</span>
          </div>

          <button 
            type="submit"
            className="w-full bg-brand-vibrant text-brand-primary font-bold py-4 rounded-2xl mt-2 hover:shadow-xl hover:shadow-brand-vibrant/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Save size={20} />
            Salvar Registro
          </button>
        </form>
      </motion.div>
    </div>
  );
}

// --- History & Estimate View ---
function HistoryView({ client, riscos, cortes, clients, onSelectClient, onOpenEstimate, onDeleteRisco, onDeleteCorte }: any) {
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [activeTab, setActiveTab] = useState<'both' | 'risco' | 'corte'>('both');

  if (!client) {
    return (
      <div className="glass-card flex flex-col items-center justify-center py-20 text-center px-4">
        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-8 text-brand-accent shadow-inner border border-white/5 ring-4 ring-brand-accent/5">
          <History size={48} className="animate-pulse" />
        </div>
        <h3 className="text-2xl font-black text-white mb-3 uppercase tracking-tight">Histórico de Clientes</h3>
        <p className="text-gray-500 max-w-sm mb-10 text-sm font-medium leading-relaxed">
          Selecione um parceiro abaixo para acessar o histórico detalhado de serviços e gerar ordens de serviço instantâneas.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 w-full max-w-5xl">
          {clients.map((c: any) => (
            <button 
              key={c.id} 
              onClick={() => onSelectClient(c.id)}
              className="glass p-5 rounded-2xl border-white/5 hover:border-brand-accent/50 hover:bg-white/10 transition-all text-xs font-black text-white text-center uppercase tracking-widest break-words"
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const clientRiscos = riscos.filter((r: any) => {
    if (r.clientId !== client.id) return false;
    if (dateRange.start && r.date < dateRange.start) return false;
    if (dateRange.end && r.date > dateRange.end) return false;
    return true;
  });

  const clientCortes = cortes.filter((c: any) => {
    if (c.clientId !== client.id) return false;
    if (dateRange.start && c.date < dateRange.start) return false;
    if (dateRange.end && c.date > dateRange.end) return false;
    return true;
  });

  const subtotalRisco = clientRiscos.reduce((acc: number, r: any) => acc + (parseFloat(r.totalCost) || 0), 0);
  const subtotalCorte = clientCortes.reduce((acc: number, c: any) => acc + (parseFloat(c.totalCost) || 0), 0);
  const totalGeral = subtotalRisco + subtotalCorte;

  return (
    <div className="space-y-6 md:space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 px-2 md:px-0">
        <div>
          <button onClick={() => onSelectClient(null)} className="text-[10px] font-black text-brand-accent uppercase tracking-[0.2em] flex items-center gap-2 mb-3 group">
            <ArrowRight size={14} className="rotate-180 group-hover:-translate-x-1 transition-transform" />
            Voltar para lista
          </button>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-accent text-brand-primary rounded-2xl flex items-center justify-center font-black text-xl">
              {client.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl md:text-4xl font-black text-white tracking-tight uppercase">{client.name}</h2>
              <p className="text-gray-400 font-medium text-xs md:text-sm">Gestão de histórico e ordens de serviço</p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-white/5 p-2 rounded-xl border border-white/10">
            <input 
              type="date" 
              className="bg-transparent text-xs text-white p-2 focus:outline-none"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            />
            <span className="text-gray-600 text-[10px] font-bold">ATÉ</span>
            <input 
              type="date" 
              className="bg-transparent text-xs text-white p-2 focus:outline-none"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            />
          </div>
          <button 
            onClick={() => onOpenEstimate({ client, riscos: clientRiscos, cortes: clientCortes })}
            className="flex items-center justify-center gap-2 bg-brand-accent text-brand-primary font-black px-8 py-4 rounded-xl hover:shadow-xl hover:shadow-brand-accent/20 transition-all active:scale-95 text-xs uppercase tracking-widest"
          >
            <Printer size={20} />
            Gerar O.S.
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 px-2 md:px-0">
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card !p-6 border-t-4 border-brand-accent">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Resumo Financeiro</h3>
            <div className="space-y-5">
              <div className="flex justify-between items-center group">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-coral"></div>
                  <span className="text-xs text-gray-400 font-bold uppercase">Risco</span>
                </div>
                <span className="font-bold text-brand-coral font-mono">{formatCurrency(subtotalRisco)}</span>
              </div>
              <div className="flex justify-between items-center group">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-vibrant"></div>
                  <span className="text-xs text-gray-400 font-bold uppercase">Corte</span>
                </div>
                <span className="font-bold text-brand-vibrant font-mono">{formatCurrency(subtotalCorte)}</span>
              </div>
              <div className="pt-5 border-t border-white/5">
                <div className="flex justify-between items-center">
                  <span className="text-white font-black uppercase text-[10px] tracking-widest">Saldo Total</span>
                  <span className="text-2xl font-black text-brand-accent font-mono tracking-tighter shadow-glow">{formatCurrency(totalGeral)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card !p-6 space-y-4">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Contato</h3>
            <div className="space-y-3">
              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <p className="text-[9px] text-gray-500 font-bold uppercase mb-1">WhatsApp</p>
                <p className="text-sm font-bold text-white font-mono">{client.whatsapp}</p>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <p className="text-[9px] text-gray-500 font-bold uppercase mb-1">CNPJ/CPF</p>
                <p className="text-sm font-bold text-white font-mono">{client.document}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="flex gap-2 bg-white/5 p-1.5 rounded-2xl w-fit">
            <button 
              onClick={() => setActiveTab('both')}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'both' ? 'bg-brand-accent text-brand-primary shadow-lg' : 'text-gray-500 hover:text-white'}`}
            >
              Tudo
            </button>
            <button 
              onClick={() => setActiveTab('risco')}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'risco' ? 'bg-brand-coral text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
            >
              Riscos
            </button>
            <button 
              onClick={() => setActiveTab('corte')}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'corte' ? 'bg-brand-vibrant text-brand-primary shadow-lg' : 'text-gray-500 hover:text-white'}`}
            >
              Cortes
            </button>
          </div>

          <div className="space-y-4">
            {(activeTab === 'both' || activeTab === 'risco') && clientRiscos.map((risco: any) => (
              <div key={risco.id} className="glass-card !p-0 overflow-hidden border-l-4 border-brand-coral group hover:border-brand-coral/50 transition-all">
                <div className="p-4 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-brand-coral/10 rounded-xl flex items-center justify-center text-brand-coral">
                      <Scissors size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] bg-brand-coral/20 text-brand-coral font-black px-2 py-0.5 rounded uppercase">Risco</span>
                        <span className="text-xs text-gray-500 font-bold">{formatDate(risco.date)}</span>
                      </div>
                      <h4 className="text-base font-black text-white uppercase tracking-tight">{risco.model}</h4>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end">
                    <div className="text-right">
                      <p className="text-[9px] text-gray-500 font-bold uppercase mb-1">Medida</p>
                      <p className="text-sm font-black text-white font-mono">{risco.amount}{risco.unit}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-gray-500 font-bold uppercase mb-1">Subtotal</p>
                      <p className="text-base font-black text-brand-coral font-mono">{formatCurrency(risco.totalCost)}</p>
                    </div>
                    <button onClick={() => onDeleteRisco(risco.id)} className="p-2 text-gray-600 hover:text-brand-coral transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {(activeTab === 'both' || activeTab === 'corte') && clientCortes.map((corte: any) => (
              <div key={corte.id} className="glass-card !p-0 overflow-hidden border-l-4 border-brand-vibrant group hover:border-brand-vibrant/50 transition-all">
                <div className="p-4 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-brand-vibrant/10 rounded-xl flex items-center justify-center text-brand-vibrant">
                      <SquareStack size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] bg-brand-vibrant/20 text-brand-vibrant font-black px-2 py-0.5 rounded uppercase">Corte</span>
                        <span className="text-xs text-gray-500 font-bold">{formatDate(corte.date)}</span>
                      </div>
                      <h4 className="text-base font-black text-white uppercase tracking-tight">{corte.model}</h4>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end">
                    <div className="text-right">
                      <p className="text-[9px] text-gray-500 font-bold uppercase mb-1">Produção</p>
                      <p className="text-sm font-black text-white font-mono">{corte.quantity} un</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-gray-500 font-bold uppercase mb-1">Subtotal</p>
                      <p className="text-base font-black text-brand-vibrant font-mono">{formatCurrency(corte.totalCost)}</p>
                    </div>
                    <button onClick={() => onDeleteCorte(corte.id)} className="p-2 text-gray-600 hover:text-brand-coral transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {(activeTab === 'both' && clientRiscos.length === 0 && clientCortes.length === 0) && (
              <div className="glass-card py-20 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 text-gray-600">
                  <History size={32} />
                </div>
                <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Nenhum registro no período</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EstimateModal({ client, riscos, cortes, onClose }: any) {
  const pdfContentRef = React.useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const subtotalRisco = riscos.reduce((acc: number, r: any) => acc + (parseFloat(r.totalCost) || 0), 0);
  const subtotalCorte = cortes.reduce((acc: number, c: any) => acc + (parseFloat(c.totalCost) || 0), 0);
  const totalGeral = subtotalRisco + subtotalCorte;

  const handlePrint = async () => {
    if (!pdfContentRef.current) {
        window.print();
        return;
    }
    
    try {
      setIsGeneratingPDF(true);
      
      // Ensure specific elements like fonts and images are fully ready before processing
      await document.fonts.ready;
      // Allow browser to perform a reflow
      await new Promise(resolve => requestAnimationFrame(resolve));
      // Fallback timeout to ensure DOM paints offscreen nodes
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Using toJpeg is significantly faster and uses less memory/storage than toPng
      // Reducing pixelRatio from 2 to 1.5 keeps it sharp but substantially improves generation time.
      const dataUrl = await toJpeg(pdfContentRef.current, {
        quality: 0.95,
        pixelRatio: 1.5,
        backgroundColor: '#ffffff'
      });
      
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (pdfContentRef.current.offsetHeight * pdfWidth) / pdfContentRef.current.offsetWidth;
      
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(dataUrl, 'JPEG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(dataUrl, 'JPEG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`OS_IVL_${client.name.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      window.print();
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleWhatsAppShare = () => {
    let message = `*IVL CONFECÇÕES - ORDEM DE SERVIÇO*\n`;
    message += `👤 *Cliente:* ${client.name}\n\n`;
    
    if (riscos.length > 0) {
      message += `✂️ *Riscos:*\n`;
      riscos.forEach((r: any) => {
        message += `• ${r.model} (${r.amount}${r.unit}) : ${formatCurrency(r.totalCost)}\n`;
      });
      message += `\n`;
    }

    if (cortes.length > 0) {
      message += `🧵 *Cortes:*\n`;
      cortes.forEach((c: any) => {
        message += `• ${c.model} (${c.quantity} un) : ${formatCurrency(c.totalCost)}\n`;
      });
      message += `\n`;
    }

    message += `💰 *TOTAL: ${formatCurrency(totalGeral)}*\n`;

    if (client.paymentMethod) {
      message += `💳 *Pagar com ${client.paymentMethod}*`;
      if (client.paymentMethod === 'Pix' && client.pixKey) {
        message += ` (Chave: *${client.pixKey}*)`;
      }
      message += `\n`;
    }

    message += `\n_Validade: 7 dias_`;

    const encodedMessage = encodeURIComponent(message);
    let phone = client.whatsapp.replace(/\D/g, ''); // Extract only numbers
    
    if (phone) {
        if (phone.length === 10 || phone.length === 11) {
            phone = `55${phone}`; // Add Brazil country code if not present
        }
        window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
    } else {
        window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
    }
  };

  const PrintableContent = ({ isPrintOnly = false }: { isPrintOnly?: boolean }) => (
    <div className={`text-slate-900 font-sans ${isPrintOnly ? 'print-container bg-white' : 'print-area'}`}>
      {/* Decorative Top Bar */}
      <div className={`h-1.5 w-full bg-gradient-to-r from-brand-primary via-brand-accent to-brand-vibrant mb-8 ${isPrintOnly ? '' : 'opacity-80'}`}></div>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start mb-12 gap-8">
        <div className="flex items-center gap-6">
          <div className={`w-20 h-20 md:w-24 md:h-24 bg-brand-primary rounded-3xl flex items-center justify-center shrink-0 rotate-3 ${isPrintOnly ? 'border-2 border-brand-primary' : 'shadow-2xl'}`}>
            <LogoIcon size={44} className="text-brand-accent md:scale-125" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-black text-brand-primary tracking-tighter leading-none">IVL COMÉRCIO E CONFECÇÕES</h1>
            <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-[0.3em]">Excelência Técnica em Moda e Vestuário</p>
            <div className="flex gap-2 pt-2">
              <span className="text-[8px] font-black text-brand-accent border border-brand-accent/20 px-2.5 py-1 rounded-lg uppercase tracking-widest">Corte de Precisão</span>
              <span className="text-[8px] font-black text-brand-vibrant border border-brand-vibrant/20 px-2.5 py-1 rounded-lg uppercase tracking-widest">Risco Industrial</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start md:items-end text-sm space-y-4">
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl w-full md:w-auto min-w-[200px]">
            <div className="flex justify-between md:justify-end gap-8 items-center mb-1">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ordem de Serviço nº</span>
              <span className="font-black font-mono text-brand-primary">#{Math.floor(Date.now() / 1000000)}</span>
            </div>
            <div className="flex justify-between md:justify-end gap-8 items-center">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Data de Emissão</span>
              <span className="font-bold text-slate-600 font-mono text-xs">{formatDate(new Date().toISOString())}</span>
            </div>
          </div>
          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest text-left md:text-right pr-2">
            Documento de Validade Fiscal / Gerencial
          </div>
        </div>
      </div>

      {/* Participants Section */}
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-0 border border-slate-100 rounded-[2.5rem] overflow-hidden mb-12 ${isPrintOnly ? '' : 'shadow-sm'}`}>
        <div className="p-8 bg-slate-50/50">
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-8 h-8 bg-brand-primary rounded-xl flex items-center justify-center text-brand-accent ${isPrintOnly ? '' : 'shadow-md'}`}>
              <Users size={16} />
            </div>
            <h3 className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em]">Dados do Contratante</h3>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Razão Social / Nome</p>
              <h4 className="text-xl font-black text-brand-primary uppercase tracking-tight">{client.name}</h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">CPF / CNPJ</p>
                <p className="text-xs font-bold font-mono text-brand-primary">{client.document}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">WhatsApp</p>
                <p className="text-xs font-bold font-mono text-brand-primary">{client.whatsapp}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 border-t md:border-t-0 md:border-l border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-8 h-8 bg-brand-accent rounded-xl flex items-center justify-center text-brand-primary ${isPrintOnly ? '' : 'shadow-md'}`}>
              <Package size={16} />
            </div>
            <h3 className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em]">Responsável Executivo</h3>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Empresa Emitente</p>
              <h4 className="text-xl font-black text-brand-primary uppercase tracking-tight">IVL CORTE & CONFECÇÕES</h4>
            </div>
            <div className="flex items-center gap-3">
              <div className={`w-1.5 h-1.5 rounded-full bg-green-500 ${isPrintOnly ? '' : 'animate-pulse'}`}></div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Serviço Especializado Ativo</p>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Services */}
      <div className="space-y-16">
        {riscos.length > 0 && (
          <div className={`px-1 ${isPrintOnly ? '' : 'animate-in fade-in slide-in-from-bottom-4 duration-500'}`}>
            <div className="flex items-center gap-4 mb-6 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 bg-brand-coral/10 rounded-2xl flex items-center justify-center text-brand-coral">
                <Scissors size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-brand-primary uppercase tracking-tight">Marcação e Risco Industrial</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Cálculo baseado em metragem linear do modelo</p>
              </div>
            </div>
            
            <div className="overflow-hidden rounded-3xl border border-slate-100">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[9px] uppercase font-black text-slate-400 tracking-widest">
                    <th className="px-6 py-5 border-b border-slate-100">Data</th>
                    <th className="px-6 py-5 border-b border-slate-100 text-brand-primary">Referência / Modelo</th>
                    <th className="px-6 py-5 border-b border-slate-100">Medida</th>
                    <th className="px-6 py-5 border-b border-slate-100">Valor Unit.</th>
                    <th className="px-6 py-5 border-b border-slate-100 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {riscos.map((r: any) => (
                    <tr key={r.id} className="text-[11px] group transition-colors">
                      <td className="px-6 py-5 font-mono text-slate-400">{formatDate(r.date)}</td>
                      <td className="px-6 py-5 font-black text-brand-primary uppercase">{r.model}</td>
                      <td className="px-6 py-5 font-bold text-slate-600">{r.amount}{r.unit}</td>
                      <td className="px-6 py-5 text-slate-400">{formatCurrency(r.unitCost)}</td>
                      <td className="px-6 py-5 text-right font-black text-brand-primary">{formatCurrency(r.totalCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {cortes.length > 0 && (
          <div className={`px-1 ${isPrintOnly ? '' : 'animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150'}`}>
            <div className="flex items-center gap-4 mb-6 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 bg-brand-vibrant/10 rounded-2xl flex items-center justify-center text-brand-vibrant">
                <SquareStack size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-brand-primary uppercase tracking-tight">Produção e Corte Têxtil</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Cálculo baseado em volume de peças e escala industrial</p>
              </div>
            </div>
            
            <div className="overflow-hidden rounded-3xl border border-slate-100">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[9px] uppercase font-black text-slate-400 tracking-widest">
                    <th className="px-6 py-5 border-b border-slate-100">Data</th>
                    <th className="px-6 py-5 border-b border-slate-100 text-brand-primary">Modelo Produzido</th>
                    <th className="px-6 py-5 border-b border-slate-100">Quantidade</th>
                    <th className="px-6 py-5 border-b border-slate-100">V. Unitário</th>
                    <th className="px-6 py-5 border-b border-slate-100 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {cortes.map((c: any) => (
                    <tr key={c.id} className="text-[11px] group transition-colors">
                      <td className="px-6 py-5 font-mono text-slate-400">{formatDate(c.date)}</td>
                      <td className="px-6 py-5 font-black text-brand-primary uppercase">{c.model}</td>
                      <td className="px-6 py-5 font-bold text-slate-600">{c.quantity} un</td>
                      <td className="px-6 py-5 text-slate-400">{formatCurrency(c.pieceValue)}</td>
                      <td className="px-6 py-5 text-right font-black text-brand-primary">{formatCurrency(c.totalCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Totals Board */}
      <div className="mt-20 grid grid-cols-1 md:grid-cols-5 items-end gap-12">
        <div className="md:col-span-2 space-y-6">
          <div>
            <h4 className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <ShieldCheck size={14} className="text-brand-accent" />
              Política de Garantia e Prazo
            </h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-primary"></div>
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed">Validade desta ordem de serviço restrita a 07 dias corridos.</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-primary"></div>
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed">Prazo de entrega sob consulta de cronograma industrial.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-3">
          <div className={`bg-brand-primary p-12 rounded-[3.5rem] relative overflow-hidden group ${isPrintOnly ? 'border-4 border-brand-primary' : 'shadow-2xl'}`}>
            {!isPrintOnly && (
              <>
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-accent/30 rounded-full -mr-32 -mt-32 blur-[100px] transition-all duration-1000 group-hover:scale-150"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-brand-vibrant/20 rounded-full -ml-16 -mb-16 blur-[60px]"></div>
              </>
            )}
            
            <div className="relative z-10 space-y-6">
              <div className="flex flex-col gap-2">
                <p className="text-[10px] font-black text-brand-accent/80 uppercase tracking-[0.4em] text-center">Resumo de Investimento</p>
                <div className="h-px w-20 bg-brand-accent/30 mx-auto"></div>
              </div>

              <div className={`space-y-4 py-6 border-y ${isPrintOnly ? 'border-brand-accent/20' : 'border-white/5'}`}>
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <span>Total em Riscos</span>
                  <span className="text-white font-mono text-xs">{formatCurrency(subtotalRisco)}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <span>Total em Cortes</span>
                  <span className="text-white font-mono text-xs">{formatCurrency(subtotalCorte)}</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[11px] font-black text-brand-accent uppercase tracking-[0.3em] mb-2">Total Final </p>
                  <p className="text-4xl md:text-5xl font-black text-white font-mono tracking-tighter">{formatCurrency(totalGeral)}</p>
                </div>
                <div className="w-20 h-20 bg-white/5 rounded-[2.5rem] flex items-center justify-center border border-white/10 backdrop-blur-sm">
                  <TrendingUp size={40} className="text-brand-accent" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Signature & Validation */}
      <div className="mt-24 pt-16 border-t border-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
          <div className="space-y-6 text-center">
            <div className="h-px w-full bg-slate-200"></div>
            <div>
              <p className="text-[10px] font-black text-brand-primary uppercase tracking-[0.3em]">IVL CORTE - GESTÃO ADMINISTRATIVA</p>
              <p className="text-[8px] text-slate-400 uppercase font-bold mt-1 tracking-widest">Responsável pela Emissão</p>
            </div>
          </div>
          <div className="space-y-6 text-center">
            <div className="h-px w-full bg-slate-200"></div>
            <div>
              <p className="text-[10px] font-black text-brand-primary uppercase tracking-[0.3em]">{client.name}</p>
              <p className="text-[8px] text-slate-400 uppercase font-bold mt-1 tracking-widest">Aceite do Contratante</p>
            </div>
          </div>
        </div>

        {/* Payment Info in PDF */}
        {client.paymentMethod && (
          <div className="mt-12 p-6 bg-slate-50 border border-slate-100 rounded-3xl flex justify-between items-center">
            <div className="space-y-1">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Dados para Pagamento</p>
              <div className="flex items-center gap-3">
                <span className="text-sm font-black text-brand-primary uppercase tracking-tight">{client.paymentMethod}</span>
                {client.paymentMethod === 'Pix' && client.pixKey && (
                  <span className="text-xs font-mono text-slate-600 font-bold bg-white px-3 py-1 rounded-lg border border-slate-200">
                    CHAVE: {client.pixKey}
                  </span>
                )}
              </div>
            </div>
            <div className={`w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center text-brand-accent ${isPrintOnly ? '' : 'shadow-md'}`}>
              <Zap size={18} />
            </div>
          </div>
        )}

        <div className="mt-16 flex flex-col items-center gap-2">
          <p className="text-[8px] text-slate-300 font-bold uppercase tracking-[0.4em]">IVL System • v3.0 • Powered by Antigravity AI Engine</p>
          <div className="flex gap-4">
            <div className="w-1 h-1 rounded-full bg-brand-accent"></div>
            <div className="w-1 h-1 rounded-full bg-brand-vibrant"></div>
            <div className="w-1 h-1 rounded-full bg-brand-coral"></div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[200]">
      {/* UI View - Hidden during print */}
      <div className="fixed inset-0 flex items-center justify-center p-0 md:p-6 no-print">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-brand-primary/95 backdrop-blur-xl" 
          onClick={onClose}
        ></motion.div>
        
        <div className="relative w-full max-w-5xl h-full md:h-[95vh] overflow-y-auto scrollbar-hide flex flex-col bg-gray-50/10">
          <div className="bg-white/95 backdrop-blur-md p-4 flex justify-between items-center sticky top-0 z-[210] border-b border-gray-100 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center shadow-lg shadow-brand-primary/20">
                <FileText className="text-brand-accent" size={20} />
              </div>
              <div className="hidden xs:block">
                <h3 className="font-black text-brand-primary uppercase tracking-tight text-sm">Ordem de Serviço</h3>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Gestão de Valores IVL</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleWhatsAppShare} 
                className="bg-green-500 text-white font-black px-4 sm:px-6 py-2.5 rounded-xl flex items-center gap-2 hover:shadow-xl hover:shadow-green-500/30 transition-all active:scale-95 text-[10px] sm:text-xs uppercase tracking-widest"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                <span className="hidden sm:inline">WhatsApp</span>
              </button>
              <button 
                onClick={handlePrint} 
                className="bg-brand-accent text-brand-primary font-black px-4 sm:px-6 py-2.5 rounded-xl flex items-center gap-2 hover:shadow-xl hover:shadow-brand-accent/30 transition-all active:scale-95 text-[10px] sm:text-xs uppercase tracking-widest disabled:opacity-50 disabled:pointer-events-none"
                disabled={isGeneratingPDF}
              >
                {isGeneratingPDF ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span className="hidden sm:inline">Gerando PDF...</span>
                    <span className="sm:hidden">Gerando...</span>
                  </>
                ) : (
                  <>
                    <Printer size={16} />
                    <span className="hidden sm:inline">Exportar PDF / Imprimir</span>
                    <span className="sm:hidden">Imprimir</span>
                  </>
                )}
              </button>
              <button 
                onClick={onClose} 
                className="bg-gray-100 p-2.5 rounded-xl text-gray-400 hover:text-brand-coral transition-all active:scale-90"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 flex justify-center py-4 md:py-12 px-2 md:px-0">
            <div className="bg-white w-full max-w-[210mm] p-6 md:p-16 shadow-2xl rounded-[2rem] md:rounded-[3rem] border border-white">
              <PrintableContent />
            </div>
          </div>
        </div>
      </div>

      {/* Optimized Generate PDF Flow - position absolute hidden but rendered for html2pdf */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '210mm' }}>
        <div ref={pdfContentRef} className="bg-white p-12" style={{ backgroundColor: 'white' }}>
          <PrintableContent isPrintOnly={true} />
        </div>
      </div>
    </div>
  );
}

function GuideView() {
  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      <div className="text-center space-y-4 px-4">
        <div className="w-20 h-20 bg-brand-accent/20 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-glow">
          <BookOpen size={40} className="text-brand-accent" />
        </div>
        <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight uppercase">Guia do Usuário IVL</h2>
        <p className="text-gray-400 font-medium max-w-xl mx-auto">Aprenda a dominar todas as ferramentas de precisão para sua confecção em poucos minutos.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4 md:px-0">
        <GuideCard 
          icon={<LayoutDashboard className="text-brand-accent" />}
          title="1. Painel de Controle"
          description="Visualize o faturamento mensal, o total de riscos e cortes realizados em tempo real. Use o gráfico para comparar o desempenho entre as categorias."
        />
        <GuideCard 
          icon={<Users className="text-brand-vibrant" />}
          title="2. Gestão de Clientes"
          description="Cadastre seus parceiros comerciais com WhatsApp e Documento (CPF/CNPJ). Clique no nome do cliente para ver seu histórico exclusivo."
        />
        <GuideCard 
          icon={<Scissors className="text-brand-coral" />}
          title="3. Lançamento de Risco"
          description="Registre marcações de risco informando o modelo e a metragem. O sistema calcula automaticamente o valor total baseado no preço por metro."
        />
        <GuideCard 
          icon={<SquareStack className="text-brand-accent" />}
          title="4. Lançamento de Corte"
          description="Registre a produção de corte por quantidade de peças. Perfeito para controle de lotes e cálculo de custo por unidade produzida."
        />
        <GuideCard 
          icon={<History className="text-white" />}
          title="5. Histórico Inteligente"
          description="Filtre serviços por data e tipo (Corte/Risco). Monitore o saldo devedor de cada parceiro em uma interface de fácil leitura."
        />
        <GuideCard 
          icon={<Printer className="text-green-400" />}
          title="6. Ordens de Serviço PDF ou WhatsApp"
          description="Dentro do Histórico, clique em 'Gerar O.S.'. O sistema cria uma ordem de serviço profissional pronta para imprimir ou compartilhar pelo WhatsApp."
        />
      </div>

      <div className="glass-card !p-8 border-t-4 border-brand-vibrant mx-4 md:mx-0">
        <div className="flex flex-col md:flex-row items-start gap-6">
          <div className="w-12 h-12 bg-brand-vibrant/20 rounded-2xl flex items-center justify-center shrink-0">
            <Info className="text-brand-vibrant" />
          </div>
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white uppercase tracking-tight">Dicas de Especialista</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm text-gray-400">
                <CheckCircle2 size={16} className="text-brand-accent shrink-0" />
                No mobile, use o botão central dourado para voltar rápido ao painel.
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-400">
                <CheckCircle2 size={16} className="text-brand-accent shrink-0" />
                O sistema funciona offline para visualização e sincroniza na nuvem quando detecta internet.
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-400">
                <CheckCircle2 size={16} className="text-brand-accent shrink-0" />
                Ao gerar uma ordem de serviço, o sistema consolida e soma todos os serviços selecionados.
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="text-center pb-10">
        <p className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.3em]">
          Suporte Técnico: Setor Administrativo IVL
        </p>
      </div>
    </div>
  );
}

function GuideCard({ icon, title, description }: any) {
  return (
    <div className="glass-card p-8 group hover:border-brand-accent/30 transition-all">
      <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        {React.cloneElement(icon, { size: 24 })}
      </div>
      <h4 className="text-lg font-bold text-white mb-3 uppercase tracking-tight group-hover:text-brand-accent transition-colors">{title}</h4>
      <p className="text-sm text-gray-500 font-medium leading-relaxed">{description}</p>
    </div>
  );
}

