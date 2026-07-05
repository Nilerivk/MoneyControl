import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { Card, Modal, Input, Button, Select, DatePicker, EmptyState, ConfirmDialog, Toast, SegmentedControl, Badge } from './ui';
import { Transaction, TransactionType, Category, Account, AccountType } from '../types';
import {
  Plus, ArrowUpRight, ArrowDownRight, ArrowRightLeft,
  Filter, Search, Edit, Trash2
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, isWithinInterval, subDays } from 'date-fns';

export const Transactions: React.FC = () => {
  const {
    transactions, accounts, categories,
    addTransaction, updateTransaction, deleteTransaction, theme
  } = useAppStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState<TransactionType | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [filterDateRange, setFilterDateRange] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('month');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [type, setType] = useState<TransactionType>('expense');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [categoryId, setCategoryId] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [toAccount, setToAccount] = useState('');
  // Solo se usa cuando la cuenta elegida es de tipo 'both' (efectivo y banco)
  const [walletType, setWalletType] = useState<'cash' | 'bank' | ''>('');

  const today = startOfDay(new Date());

  // Emoji representativo segun el tipo de cuenta (efectivo/banco/ambos)
  const getAccountEmoji = (accountType: AccountType) => {
    if (accountType === 'cash') return '💵';
    if (accountType === 'bank') return '🏦';
    return '💰';
  };

  // Opciones del selector de cuenta: SIEMPRE construidas a partir de las
  // cuentas reales del usuario (nunca un valor 'cash' hardcodeado que no
  // corresponde a ninguna cuenta real).
  const accountOptions = useMemo(() => {
    return accounts.map(a => ({
      value: a.id,
      label: `${getAccountEmoji(a.type)} ${a.name}`,
    }));
  }, [accounts]);

  // El selector de "efectivo o banco" se pide siempre en ingresos/gastos,
  // independientemente de la cuenta elegida.
  const needsWalletType = type !== 'transfer';

  // Apply filters
  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(query) ||
        (t.notes && t.notes.toLowerCase().includes(query))
      );
    }

    // Type filter
    if (filterType !== 'all') {
      result = result.filter(t => t.type === filterType);
    }

    // Category filter
    if (filterCategory !== 'all') {
      result = result.filter(t => t.categoryId === filterCategory);
    }

    // Account filter
    if (filterAccount !== 'all') {
      result = result.filter(t =>
        t.paymentMethod === filterAccount || t.toAccount === filterAccount
      );
    }

    // Date filters
    if (filterDateRange !== 'all') {
      let start: Date, end: Date;
      const now = new Date();

      switch (filterDateRange) {
        case 'today':
          start = today;
          end = today;
          break;
        case 'week':
          start = startOfWeek(now, { weekStartsOn: 1 });
          end = endOfWeek(now, { weekStartsOn: 1 });
          break;
        case 'month':
          start = startOfMonth(now);
          end = endOfMonth(now);
          break;
        case 'custom':
          if (filterStartDate && filterEndDate) {
            start = parseISO(filterStartDate);
            end = parseISO(filterEndDate);
          } else {
            return result;
          }
          break;
        default:
          return result;
      }

      result = result.filter(t => {
        const transDate = parseISO(t.date);
        return isWithinInterval(transDate, { start, end });
      });
    }

    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchQuery, filterType, filterCategory, filterAccount, filterDateRange, filterStartDate, filterEndDate]);

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};

    filteredTransactions.forEach(t => {
      const groupKey = t.date;
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(t);
    });

    return Object.entries(groups)
      .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime());
  }, [filteredTransactions]);

  const resetForm = () => {
    setType('expense');
    setTitle('');
    setAmount('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setCategoryId('');
    setNotes('');
    setPaymentMethod('');
    setToAccount('');
    setWalletType('');
    setEditingTransaction(null);
  };

  const handleOpenModal = (transaction?: Transaction) => {
    if (transaction) {
      setEditingTransaction(transaction);
      setType(transaction.type);
      setTitle(transaction.title);
      setAmount(transaction.amount.toString());
      setDate(transaction.date);
      setCategoryId(transaction.categoryId);
      setNotes(transaction.notes || '');
      setPaymentMethod(transaction.paymentMethod);
      setToAccount(transaction.toAccount || '');
      setWalletType(transaction.walletType || '');
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  // La categoria ya no se pide en el formulario: cada transaccion se
  // etiqueta automaticamente con la categoria "Otros" correspondiente
  // (o la primera disponible de ese tipo si no existiera "Otros").
  const getDefaultCategoryId = (txType: TransactionType): string => {
    if (txType === 'transfer') return '';
    const ofType = categories.filter(c => c.type === txType);
    return ofType.find(c => c.name === 'Otros')?.id || ofType[0]?.id || '';
  };

  const handleSave = async () => {
    if (!title.trim() || !amount || !date) {
      setToast({ message: 'Por favor completa todos los campos obligatorios', type: 'error' });
      return;
    }

    // La cuenta es SIEMPRE obligatoria para ingresos y gastos, y tambien
    // como cuenta de origen en las transferencias.
    if (!paymentMethod) {
      setToast({ message: 'Por favor selecciona una cuenta', type: 'error' });
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setToast({ message: 'El importe debe ser un numero positivo', type: 'error' });
      return;
    }

    if (type === 'transfer' && !toAccount) {
      setToast({ message: 'Por favor selecciona la cuenta destino', type: 'error' });
      return;
    }

    if (type === 'transfer' && toAccount === paymentMethod) {
      setToast({ message: 'La cuenta de origen y destino no pueden ser la misma', type: 'error' });
      return;
    }

    if (needsWalletType && !walletType) {
      setToast({ message: 'Indica si el movimiento fue en efectivo o en banco', type: 'error' });
      return;
    }

    const resolvedCategoryId = categoryId || getDefaultCategoryId(type);

    try {
      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, {
          type,
          title: title.trim(),
          amount: amountNum,
          date,
          categoryId: resolvedCategoryId,
          notes,
          paymentMethod,
          toAccount: type === 'transfer' ? toAccount : undefined,
          walletType: needsWalletType ? (walletType as 'cash' | 'bank') : undefined,
        });
        setToast({ message: 'Transaccion actualizada', type: 'success' });
      } else {
        await addTransaction({
          type,
          title: title.trim(),
          amount: amountNum,
          date,
          categoryId: resolvedCategoryId,
          notes,
          paymentMethod,
          toAccount: type === 'transfer' ? toAccount : undefined,
          walletType: needsWalletType ? (walletType as 'cash' | 'bank') : undefined,
        });
        setToast({ message: 'Transaccion añadida', type: 'success' });
      }

      handleCloseModal();
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : 'No se pudo guardar la transaccion',
        type: 'error',
      });
    }
  };

  const handleDelete = async (id: string) => {
    await deleteTransaction(id);
    setDeleteConfirm(null);
    setToast({ message: 'Transaccion eliminada', type: 'success' });
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
  };

  const formatDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    const today = new Date();
    const yesterday = subDays(today, 1);

    if (format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
      return 'Hoy';
    }
    if (format(date, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')) {
      return 'Ayer';
    }
    return format(date, "EEEE, d 'de' MMMM");
  };

  const getCategoryData = (id: string): Category | undefined => {
    return categories.find(c => c.id === id);
  };

  const getAccountData = (id: string): Account | undefined => {
    return accounts.find(a => a.id === id);
  };

  // Calculate summary
  const summary = useMemo(() => {
    const income = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return { income, expenses, balance: income - expenses };
  }, [filteredTransactions]);

  return (
    <div className="pb-8">
      {/* Search Bar */}
      <div className="px-4 pt-4 pb-2">
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl ${
          theme === 'dark' ? 'bg-white/10' : 'bg-gray-100'
        }`}>
          <Search size={20} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar transacciones..."
            className={`flex-1 bg-transparent outline-none ${
              theme === 'dark' ? 'text-white placeholder-gray-400' : 'text-gray-900 placeholder-gray-500'
            }`}
          />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-1.5 rounded-lg ${showFilters ? 'bg-blue-500 text-white' : ''}`}
          >
            <Filter size={18} />
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="px-4 pb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Type filter */}
            <Select
              label="Tipo"
              value={filterType}
              onChange={(v) => setFilterType(v as TransactionType | 'all')}
              options={[
                { value: 'all', label: 'Todos' },
                { value: 'income', label: 'Ingresos' },
                { value: 'expense', label: 'Gastos' },
                { value: 'transfer', label: 'Transferencias' },
              ]}
            />

            {/* Date filter */}
            <Select
              label="Periodo"
              value={filterDateRange}
              onChange={(v) => setFilterDateRange(v as any)}
              options={[
                { value: 'all', label: 'Todo' },
                { value: 'today', label: 'Hoy' },
                { value: 'week', label: 'Esta semana' },
                { value: 'month', label: 'Este mes' },
                { value: 'custom', label: 'Personalizado' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Category filter */}
            <Select
              label="Categoria"
              value={filterCategory}
              onChange={setFilterCategory}
              options={[
                { value: 'all', label: 'Todas' },
                ...categories.map(c => ({ value: c.id, label: c.name })),
              ]}
            />

            {/* Account filter */}
            <Select
              label="Cuenta"
              value={filterAccount}
              onChange={setFilterAccount}
              options={[
                { value: 'all', label: 'Todas' },
                ...accounts.map(a => ({ value: a.id, label: a.name })),
              ]}
            />
          </div>

          {filterDateRange === 'custom' && (
            <div className="grid grid-cols-2 gap-3">
              <DatePicker
                label="Desde"
                value={filterStartDate}
                onChange={setFilterStartDate}
              />
              <DatePicker
                label="Hasta"
                value={filterEndDate}
                onChange={setFilterEndDate}
              />
            </div>
          )}
        </div>
      )}

      {/* Summary Card */}
      <div className="px-4 pb-4">
        <Card className={theme === 'dark' ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20' : 'bg-gradient-to-r from-blue-50 to-purple-50'}>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Ingresos</p>
              <p className="text-lg font-bold text-green-500">+{formatCurrency(summary.income)}</p>
            </div>
            <div>
              <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Gastos</p>
              <p className="text-lg font-bold text-red-500">-{formatCurrency(summary.expenses)}</p>
            </div>
            <div>
              <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Balance</p>
              <p className={`text-lg font-bold ${summary.balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatCurrency(summary.balance)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Transactions List */}
      {groupedTransactions.length === 0 ? (
        <div className="px-4">
          <EmptyState
            icon={<ArrowRightLeft size={48} />}
            title="Sin transacciones"
            description="No hay transacciones que coincidan con los filtros seleccionados"
            action={
              <Button onClick={() => handleOpenModal()}>
                <Plus size={18} />
                Nueva transaccion
              </Button>
            }
          />
        </div>
      ) : (
        <div className="px-4 space-y-6">
          {groupedTransactions.map(([date, trans]) => (
            <div key={date}>
              <h3 className={`text-sm font-medium mb-2 px-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                {formatDate(date)}
              </h3>
              <div className="space-y-2">
                {trans.map(transaction => {
                  const category = getCategoryData(transaction.categoryId);
                  const account = getAccountData(transaction.paymentMethod);
                  const IconComponent = transaction.type === 'income'
                    ? ArrowUpRight
                    : transaction.type === 'expense'
                      ? ArrowDownRight
                      : ArrowRightLeft;

                  return (
                    <Card
                      key={transaction.id}
                      onClick={() => handleOpenModal(transaction)}
                      className="cursor-pointer hover:scale-[1.01] transition-transform"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{
                              backgroundColor: transaction.type === 'income'
                                ? 'rgba(34, 197, 94, 0.2)'
                                : transaction.type === 'expense'
                                  ? 'rgba(239, 68, 68, 0.2)'
                                  : 'rgba(59, 130, 246, 0.2)'
                            }}
                          >
                            <IconComponent
                              size={20}
                              className={
                                transaction.type === 'income'
                                  ? 'text-green-500'
                                  : transaction.type === 'expense'
                                    ? 'text-red-500'
                                    : 'text-blue-500'
                              }
                            />
                          </div>
                          <div>
                            <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              {transaction.title}
                            </p>
                            <div className="flex items-center gap-2">
                              {category && (
                                <Badge color={category.color} size="sm">
                                  {category.name}
                                </Badge>
                              )}
                              {account && (
                                <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {account.name}
                                  {transaction.walletType === 'cash' && ' · 💵 Efectivo'}
                                  {transaction.walletType === 'bank' && ' · 🏦 Banco'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <div>
                            <p className={`font-bold ${
                              transaction.type === 'income'
                                ? 'text-green-500'
                                : transaction.type === 'expense'
                                  ? 'text-red-500'
                                  : theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>
                              {transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '-' : ''}
                              {formatCurrency(transaction.amount)}
                            </p>
                            {transaction.type === 'transfer' && account && (
                              <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                → {getAccountData(transaction.toAccount || '')?.name}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenModal(transaction);
                              }}
                              className={`p-1.5 rounded-lg ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirm(transaction.id);
                              }}
                              className={`p-1.5 rounded-lg text-red-500 ${theme === 'dark' ? 'hover:bg-red-500/20' : 'hover:bg-red-50'}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Transaction FAB */}
      <button
        onClick={() => handleOpenModal()}
        className={`
          fixed bottom-24 right-4 sm:bottom-8 sm:right-8
          w-14 h-14 rounded-full
          shadow-lg shadow-blue-500/30
          bg-blue-500 hover:bg-blue-600
          flex items-center justify-center
          text-white
          transition-all duration-200
          active:scale-95
          z-40
        `}
      >
        <Plus size={24} />
      </button>

      {/* Transaction Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingTransaction ? 'Editar transaccion' : 'Nueva transaccion'}
      >
        <div className="space-y-4">
          {/* Type selector */}
          <div className="space-y-2">
            <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Tipo
            </label>
            <SegmentedControl
              options={[
                { value: 'expense', label: 'Gasto' },
                { value: 'income', label: 'Ingreso' },
                { value: 'transfer', label: 'Transferencia' },
              ]}
              value={type}
              onChange={(v) => {
                setType(v as TransactionType);
              }}
            />
          </div>

          <Input
            label={type === 'transfer' ? 'Concepto' : 'Titulo'}
            value={title}
            onChange={setTitle}
            placeholder={
              type === 'income' ? 'Ej: Salario, Regalo...'
              : type === 'expense' ? 'Ej: Comida, Gasolina...'
              : 'Ej: Transferencia a ahorros'
            }
            required
          />

          <Input
            label="Importe"
            type="number"
            value={amount}
            onChange={setAmount}
            placeholder="0.00"
            min={0.01}
            step={0.01}
            required
          />

          <DatePicker
            label="Fecha"
            value={date}
            onChange={setDate}
          />

          {/* Payment method - siempre una cuenta real del usuario */}
          {accounts.length > 0 ? (
            <Select
              label={type === 'transfer' ? 'Desde cuenta' : 'Cuenta'}
              value={paymentMethod}
              onChange={(v) => {
                setPaymentMethod(v);
                setWalletType('');
              }}
              options={accountOptions}
              placeholder="Selecciona una cuenta"
              required
            />
          ) : (
            <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-yellow-500/20' : 'bg-yellow-50'}`}>
              <p className="text-sm text-yellow-500">
                No hay cuentas. Crea una en 'Cuentas' antes de añadir una transaccion.
              </p>
            </div>
          )}

          {/* Efectivo o banco - siempre en ingresos y gastos */}
          {needsWalletType && (
            <div className="space-y-2">
              <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                ¿Efectivo o banco? <span className="text-red-500">*</span>
              </label>
              <SegmentedControl
                options={[
                  { value: 'cash', label: '💵 Efectivo' },
                  { value: 'bank', label: '🏦 Banco' },
                ]}
                value={walletType}
                onChange={(v) => setWalletType(v as 'cash' | 'bank')}
              />
            </div>
          )}

          {/* To account - only for transfers */}
          {type === 'transfer' && (
            <Select
              label="A cuenta"
              value={toAccount}
              onChange={setToAccount}
              options={accountOptions.filter(o => o.value !== paymentMethod)}
              placeholder="Selecciona la cuenta destino"
              required
            />
          )}

          <Input
            label="Notas (opcional)"
            type="textarea"
            value={notes}
            onChange={setNotes}
            placeholder="Añade notas adicionales..."
          />

          <div className="flex gap-3 pt-4">
            <Button variant="secondary" fullWidth onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button fullWidth onClick={handleSave} disabled={accounts.length === 0}>
              {editingTransaction ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        title="Eliminar transaccion"
        message="¿Estas seguro de que quieres eliminar esta transaccion? Se revertira el cambio en el saldo de la cuenta."
        confirmText="Eliminar"
        variant="danger"
      />

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};
