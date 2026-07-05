import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import {
  Search, X, Wallet, CreditCard, BarChart3, FileText, Bell,
  ArrowUpRight, ArrowDownRight, ArrowRightLeft
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResult?: (type: string, id: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, onSelectResult }) => {
  const { accounts, transactions, financedPurchases, notes, reminders, categories, theme } = useAppStore();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    if (!query.trim()) {
      return { accounts: [], transactions: [], financedPurchases: [], notes: [], reminders: [] };
    }

    const searchQuery = query.toLowerCase();

    return {
      accounts: accounts
        .filter(a => a.name.toLowerCase().includes(searchQuery))
        .slice(0, 5),
      transactions: transactions
        .filter(t => {
          const category = categories.find(c => c.id === t.categoryId);
          return t.title.toLowerCase().includes(searchQuery) ||
            (t.notes && t.notes.toLowerCase().includes(searchQuery)) ||
            (category && category.name.toLowerCase().includes(searchQuery));
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5),
      financedPurchases: financedPurchases
        .filter(p => p.name.toLowerCase().includes(searchQuery) ||
          (p.notes && p.notes.toLowerCase().includes(searchQuery)))
        .slice(0, 5),
      notes: notes
        .filter(n => n.title.toLowerCase().includes(searchQuery) ||
          n.content.toLowerCase().includes(searchQuery))
        .slice(0, 5),
      reminders: reminders
        .filter(r => r.title.toLowerCase().includes(searchQuery) ||
          (r.description && r.description.toLowerCase().includes(searchQuery)))
        .slice(0, 5),
    };
  }, [query, accounts, transactions, financedPurchases, notes, reminders, categories]);

  const totalResults = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
  };

  const handleClear = () => {
    setQuery('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-4 px-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`
          relative w-full max-w-lg
          ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}
          rounded-2xl shadow-2xl
          max-h-[80vh] overflow-hidden
          flex flex-col
        `}
      >
        {/* Search Input */}
        <div className={`p-4 border-b ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'}`}>
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
            theme === 'dark' ? 'bg-white/10' : 'bg-gray-100'
          }`}>
            <Search size={20} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar en toda la app..."
              className={`flex-1 bg-transparent outline-none text-lg ${
                theme === 'dark' ? 'text-white placeholder-gray-400' : 'text-gray-900 placeholder-gray-500'
              }`}
              autoFocus
            />
            {query && (
              <button onClick={handleClear} className={`p-1 rounded ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-200'}`}>
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {!query.trim() ? (
            <div className={`p-8 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              <Search size={48} className="mx-auto mb-4 opacity-50" />
              <p>Escribe para buscar en cuentas, transacciones, notas y mas...</p>
            </div>
          ) : totalResults === 0 ? (
            <div className={`p-8 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              <Search size={48} className="mx-auto mb-4 opacity-50" />
              <p>No se encontraron resultados para "{query}"</p>
            </div>
          ) : (
            <div className="p-4 space-y-6">
              {/* Accounts */}
              {results.accounts.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet size={16} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} />
                    <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      Cuentas ({results.accounts.length})
                    </span>
                  </div>
                  <div className="space-y-2">
                    {results.accounts.map(account => (
                      <div
                        key={account.id}
                        onClick={() => onSelectResult?.('account', account.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer ${
                          theme === 'dark' ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: `${account.color}20` }}
                        >
                          <Wallet size={20} style={{ color: account.color }} />
                        </div>
                        <div className="flex-1">
                          <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {account.name}
                          </p>
                          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            {account.type === 'cash' ? 'Efectivo' : 'Banco'}
                          </p>
                        </div>
                        <p className={`font-bold ${account.balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {formatCurrency(account.balance)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Transactions */}
              {results.transactions.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard size={16} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} />
                    <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      Transacciones ({results.transactions.length})
                    </span>
                  </div>
                  <div className="space-y-2">
                    {results.transactions.map(transaction => {
                      const Icon = transaction.type === 'income'
                        ? ArrowUpRight
                        : transaction.type === 'expense'
                          ? ArrowDownRight
                          : ArrowRightLeft;

                      return (
                        <div
                          key={transaction.id}
                          onClick={() => onSelectResult?.('transaction', transaction.id)}
                          className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer ${
                            theme === 'dark' ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'
                          }`}
                        >
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{
                              backgroundColor: transaction.type === 'income'
                                ? 'rgba(34, 197, 94, 0.2)'
                                : 'rgba(239, 68, 68, 0.2)'
                            }}
                          >
                            <Icon
                              size={20}
                              className={
                                transaction.type === 'income'
                                  ? 'text-green-500'
                                  : 'text-red-500'
                              }
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              {transaction.title}
                            </p>
                            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                              {format(parseISO(transaction.date), 'dd/MM/yyyy')}
                            </p>
                          </div>
                          <p className={`font-bold ${
                            transaction.type === 'income'
                              ? 'text-green-500'
                              : 'text-red-500'
                          }`}>
                            {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Financed Purchases */}
              {results.financedPurchases.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 size={16} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} />
                    <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      Compras financiadas ({results.financedPurchases.length})
                    </span>
                  </div>
                  <div className="space-y-2">
                    {results.financedPurchases.map(purchase => (
                      <div
                        key={purchase.id}
                        onClick={() => onSelectResult?.('financedPurchase', purchase.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer ${
                          theme === 'dark' ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/20">
                          <CreditCard size={20} className="text-amber-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {purchase.name}
                          </p>
                          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            {purchase.paidInstallments}/{purchase.numberOfInstallments} cuotas
                          </p>
                        </div>
                        <p className="font-bold text-amber-500">
                          {formatCurrency(purchase.monthlyPayment)}/mes
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {results.notes.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText size={16} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} />
                    <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      Notas ({results.notes.length})
                    </span>
                  </div>
                  <div className="space-y-2">
                    {results.notes.map(note => (
                      <div
                        key={note.id}
                        onClick={() => onSelectResult?.('note', note.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer ${
                          theme === 'dark' ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                        style={{ borderLeft: `4px solid ${note.color}` }}
                      >
                        <FileText size={20} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} />
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {note.title}
                          </p>
                          <p className={`text-sm truncate ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            {note.content || 'Sin contenido'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reminders */}
              {results.reminders.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Bell size={16} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} />
                    <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      Recordatorios ({results.reminders.length})
                    </span>
                  </div>
                  <div className="space-y-2">
                    {results.reminders.map(reminder => (
                      <div
                        key={reminder.id}
                        onClick={() => onSelectResult?.('reminder', reminder.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer ${
                          theme === 'dark' ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <Bell size={20} className={reminder.completed ? 'text-green-500' : 'text-purple-500'} />
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {reminder.title}
                          </p>
                          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            {format(parseISO(reminder.date), 'dd/MM/yyyy')} a las {reminder.time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
