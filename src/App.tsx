import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from './store';
import { Dashboard } from './components/Dashboard';
import { Accounts } from './components/Accounts';
import { Transactions } from './components/Transactions';
import { FinancedPurchases } from './components/FinancedPurchases';
import { Categories } from './components/Categories';
import { Notes } from './components/Notes';
import { Reminders } from './components/Reminders';
import { Statistics } from './components/Statistics';
import { Settings } from './components/Settings';
import { MorePage } from './components/MorePage';
import { Navigation, Header } from './components/Navigation';
import { SearchModal } from './components/Search';
import { Modal, Toast, Button, Input, Select, SegmentedControl } from './components/ui';
import { TransactionType } from './types';
import { format } from 'date-fns';

function App() {
  const { initialize, isLoading, initialized, theme, addTransaction, categories, accounts, toast, setToast, undoDelete } = useAppStore();

  const [currentPage, setCurrentPage] = useState('home');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState<TransactionType>('expense');

  // Quick add form state
  const [quickTitle, setQuickTitle] = useState('');
  const [quickAmount, setQuickAmount] = useState('');
  const [quickPaymentMethod, setQuickPaymentMethod] = useState('');
  const [quickWalletType, setQuickWalletType] = useState<'cash' | 'bank' | ''>('');

  // Initialize app
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Apply theme to body
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === 'z' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        undoDelete();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undoDelete]);

  const handleQuickAdd = useCallback((type: TransactionType) => {
    setQuickAddType(type);
    setIsQuickAddOpen(true);
    // Set default payment method (siempre una cuenta real, nunca 'cash')
    setQuickPaymentMethod(accounts.length > 0 ? accounts[0].id : '');
    setQuickWalletType('');
  }, [accounts]);

  // La categoria ya no se pide en el formulario rapido: se asigna sola
  // la categoria "Otros" del tipo correspondiente (o la primera que haya).
  const getDefaultCategoryId = (type: TransactionType): string => {
    const ofType = categories.filter(c => c.type === type);
    return ofType.find(c => c.name === 'Otros')?.id || ofType[0]?.id || '';
  };

  const handleQuickAddSave = async () => {
    if (!quickTitle.trim() || !quickAmount || !quickPaymentMethod) return;
    if (!quickWalletType) {
      setToast({ message: 'Indica si el movimiento fue en efectivo o en banco', type: 'error' });
      return;
    }

    const amount = parseFloat(quickAmount);
    if (isNaN(amount) || amount <= 0) return;

    try {
      await addTransaction({
        type: quickAddType,
        title: quickTitle.trim(),
        amount,
        date: format(new Date(), 'yyyy-MM-dd'),
        categoryId: getDefaultCategoryId(quickAddType),
        paymentMethod: quickPaymentMethod,
        walletType: quickWalletType,
      });

      // Reset form
      setQuickTitle('');
      setQuickAmount('');
      setQuickPaymentMethod('');
      setQuickWalletType('');
      setIsQuickAddOpen(false);
      setToast({ message: `${quickAddType === 'income' ? 'Ingreso' : 'Gasto'} añadido`, type: 'success' });
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : 'No se pudo añadir la transaccion',
        type: 'error',
      });
    }
  };

  // Get page title
  const getPageTitle = () => {
    switch (currentPage) {
      case 'home': return 'Money Control';
      case 'accounts': return 'Cuentas';
      case 'transactions': return 'Historial';
      case 'financed': return 'Financiados';
      case 'categories': return 'Categorias';
      case 'statistics': return 'Estadisticas';
      case 'notes': return 'Notas';
      case 'reminders': return 'Recordatorios';
      case 'settings': return 'Ajustes';
      case 'more': return 'Mas';
      default: return 'Money Control';
    }
  };

  // Render current page
  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Dashboard onQuickAdd={handleQuickAdd} />;
      case 'accounts':
        return <Accounts />;
      case 'transactions':
        return <Transactions />;
      case 'financed':
        return <FinancedPurchases />;
      case 'categories':
        return <Categories />;
      case 'statistics':
        return <Statistics />;
      case 'notes':
        return <Notes />;
      case 'reminders':
        return <Reminders />;
      case 'settings':
        return <Settings />;
      case 'more':
        return <MorePage onPageChange={setCurrentPage} />;
      default:
        return <Dashboard onQuickAdd={handleQuickAdd} />;
    }
  };

  if (isLoading || !initialized) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-500 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
          </div>
          <p className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Cargando...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <Header
        title={getPageTitle()}
        onSearch={() => setIsSearchOpen(true)}
      />

      {/* Main Content */}
      <main className="pb-20 overflow-x-hidden">
        {renderPage()}
      </main>

      {/* Navigation */}
      <Navigation
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />

      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectResult={(type) => {
          setIsSearchOpen(false);
          // Navigate to appropriate page based on type
          switch (type) {
            case 'account':
              setCurrentPage('accounts');
              break;
            case 'transaction':
              setCurrentPage('transactions');
              break;
            case 'financedPurchase':
              setCurrentPage('financed');
              break;
            case 'note':
              setCurrentPage('notes');
              break;
            case 'reminder':
              setCurrentPage('reminders');
              break;
          }
        }}
      />

      {/* Quick Add Modal */}
      <Modal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        title={quickAddType === 'income' ? 'Ingreso rapido' : 'Gasto rapido'}
      >
        <div className="space-y-4">
          <SegmentedControl
            options={[
              { value: 'income', label: 'Ingreso' },
              { value: 'expense', label: 'Gasto' },
            ]}
            value={quickAddType}
            onChange={(v) => setQuickAddType(v as TransactionType)}
          />

          <Input
            label="Titulo"
            value={quickTitle}
            onChange={setQuickTitle}
            placeholder={quickAddType === 'income' ? 'Ej: Salario' : 'Ej: Comida'}
            required
          />

          <Input
            label="Importe"
            type="number"
            value={quickAmount}
            onChange={setQuickAmount}
            placeholder="0.00"
            min={0.01}
            step={0.01}
            required
          />

          {accounts.length > 0 ? (
            <Select
              label="Cuenta"
              value={quickPaymentMethod}
              onChange={setQuickPaymentMethod}
              options={accounts.map(a => ({
                value: a.id,
                label: `${a.type === 'cash' ? '💵' : a.type === 'bank' ? '🏦' : '💰'} ${a.name}`,
              }))}
              required
            />
          ) : (
            <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-yellow-500/20' : 'bg-yellow-50'}`}>
              <p className="text-sm text-yellow-500">
                No hay cuentas. Crea una en 'Cuentas'.
              </p>
            </div>
          )}

          {/* Efectivo o banco - siempre en ingresos y gastos */}
          <div className="space-y-2">
            <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              ¿Efectivo o banco? <span className="text-red-500">*</span>
            </label>
            <SegmentedControl
              options={[
                { value: 'cash', label: '💵 Efectivo' },
                { value: 'bank', label: '🏦 Banco' },
              ]}
              value={quickWalletType}
              onChange={(v) => setQuickWalletType(v as 'cash' | 'bank')}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="secondary" fullWidth onClick={() => setIsQuickAddOpen(false)}>
              Cancelar
            </Button>
            <Button
              fullWidth
              onClick={handleQuickAddSave}
              disabled={accounts.length === 0 || !quickPaymentMethod || !quickWalletType}
            >
              Guardar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Global Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default App;
