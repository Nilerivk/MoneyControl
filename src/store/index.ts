import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Account,
  Category,
  Transaction,
  FinancedPurchase,
  Note,
  Reminder,
  Settings,
} from '../types';
import {
  accountsDB,
  categoriesDB,
  transactionsDB,
  financedPurchasesDB,
  notesDB,
  remindersDB,
  settingsDB,
  initializeDefaultData,
  getDB,
} from '../db/database';
import { format, startOfMonth, endOfMonth, parseISO, addMonths, isAfter, isBefore, startOfDay } from 'date-fns';

// ---------------------------------------------------------------------------
// Balance effect helpers
// ---------------------------------------------------------------------------
// Estas funciones son la UNICA via por la que una transaccion modifica el
// saldo de una cuenta. Centralizarlo aqui evita que crear/editar/borrar
// transacciones puedan desincronizar los balances.

type TransactionBalanceEffect = Pick<Transaction, 'type' | 'amount' | 'paymentMethod' | 'toAccount' | 'walletType'>;

// Calcula como debe quedar una cuenta tras aplicarle un cambio de saldo.
// Si la cuenta es 'cash' o 'bank' puras, simplemente se ajusta su unico
// saldo. Si es 'both' (efectivo y banco a la vez), el cambio se aplica
// SOLO al bolsillo indicado por walletType, para que efectivo y banco no
// se sumen los dos a la vez con el mismo movimiento.
function computeAccountBalanceUpdate(
  account: Account,
  delta: number,
  walletType?: 'cash' | 'bank'
): Partial<Account> {
  if (account.type !== 'both') {
    return { balance: account.balance + delta };
  }

  const cash = account.cashBalance ?? 0;
  const bank = account.bankBalance ?? 0;

  if (walletType === 'cash') {
    const newCash = cash + delta;
    return { cashBalance: newCash, bankBalance: bank, balance: newCash + bank };
  }

  // Por defecto (o si no se especifico, p.ej. en transferencias) el
  // ajuste va al bolsillo de banco.
  const newBank = bank + delta;
  return { cashBalance: cash, bankBalance: newBank, balance: cash + newBank };
}

async function applyTransactionBalanceEffect(
  get: () => AppState,
  set: (partial: Partial<AppState>) => void,
  effect: TransactionBalanceEffect
): Promise<void> {
  if (effect.type === 'transfer') {
    if (!effect.toAccount) return;
    const fromAccount = get().accounts.find(a => a.id === effect.paymentMethod);
    const toAccountEntity = get().accounts.find(a => a.id === effect.toAccount);
    if (!fromAccount || !toAccountEntity) return;

    const updatedFrom = await accountsDB.update(
      fromAccount.id,
      computeAccountBalanceUpdate(fromAccount, -effect.amount, effect.walletType)
    );
    const updatedTo = await accountsDB.update(
      toAccountEntity.id,
      computeAccountBalanceUpdate(toAccountEntity, effect.amount, effect.walletType)
    );

    if (updatedFrom && updatedTo) {
      set({
        accounts: get().accounts.map(a => {
          if (a.id === fromAccount.id) return updatedFrom;
          if (a.id === toAccountEntity.id) return updatedTo;
          return a;
        }),
      });
    }
    return;
  }

  const account = get().accounts.find(a => a.id === effect.paymentMethod);
  if (!account) return;

  const balanceChange = effect.type === 'income' ? effect.amount : -effect.amount;
  const updated = await accountsDB.update(account.id, computeAccountBalanceUpdate(account, balanceChange, effect.walletType));
  if (updated) {
    set({ accounts: get().accounts.map(a => (a.id === account.id ? updated : a)) });
  }
}

// Revertir un efecto es aplicar exactamente el efecto contrario.
async function reverseTransactionBalanceEffect(
  get: () => AppState,
  set: (partial: Partial<AppState>) => void,
  effect: TransactionBalanceEffect
): Promise<void> {
  if (effect.type === 'transfer') {
    if (!effect.toAccount) return;
    await applyTransactionBalanceEffect(get, set, {
      type: 'transfer',
      amount: effect.amount,
      paymentMethod: effect.toAccount,
      toAccount: effect.paymentMethod,
      walletType: effect.walletType,
    });
    return;
  }

  await applyTransactionBalanceEffect(get, set, {
    type: effect.type === 'income' ? 'expense' : 'income',
    amount: effect.amount,
    paymentMethod: effect.paymentMethod,
    toAccount: effect.toAccount,
    walletType: effect.walletType,
  });
}

// Valida que una transaccion tenga cuenta(s) obligatoria(s) y que existan
// realmente entre las cuentas del usuario. Es la ultima linea de defensa
// (la UI ya deberia impedir llegar aqui sin cuenta seleccionada).
function validateTransactionAccounts(
  get: () => AppState,
  data: TransactionBalanceEffect
): string | null {
  if (!data.paymentMethod) {
    return 'Debes seleccionar una cuenta';
  }
  const accountExists = get().accounts.some(a => a.id === data.paymentMethod);
  if (!accountExists) {
    return 'La cuenta seleccionada no es valida';
  }
  if (data.type === 'transfer') {
    if (!data.toAccount) {
      return 'Debes seleccionar una cuenta destino';
    }
    if (data.toAccount === data.paymentMethod) {
      return 'La cuenta de origen y destino no pueden ser la misma';
    }
    const toAccountExists = get().accounts.some(a => a.id === data.toAccount);
    if (!toAccountExists) {
      return 'La cuenta destino no es valida';
    }
  }
  return null;
}

interface DeletedItem {
  type: 'account' | 'transaction' | 'financedPurchase' | 'note' | 'reminder' | 'category';
  data: Account | Transaction | FinancedPurchase | Note | Reminder | Category;
  deletedAt: string;
}

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface AppState {
  // Data
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  financedPurchases: FinancedPurchase[];
  notes: Note[];
  reminders: Reminder[];
  settings: Settings;

  // UI State
  isLoading: boolean;
  initialized: boolean;
  deletedItems: DeletedItem[];
  toast: ToastState | null;

  // Theme
  theme: 'light' | 'dark';

  // Actions
  initialize: () => Promise<void>;
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;

  // Account actions
  addAccount: (account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Account>;
  updateAccount: (id: string, updates: Partial<Account>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;

  // Category actions
  addCategory: (category: Omit<Category, 'id' | 'createdAt'>) => Promise<Category>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  // Transaction actions
  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Transaction>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  // Financed purchase actions
  addFinancedPurchase: (purchase: Omit<FinancedPurchase, 'id' | 'createdAt' | 'updatedAt' | 'paidInstallments' | 'processedPayments'>) => Promise<FinancedPurchase>;
  updateFinancedPurchase: (id: string, updates: Partial<FinancedPurchase>) => Promise<void>;
  deleteFinancedPurchase: (id: string) => Promise<void>;
  processPendingPayments: () => Promise<void>;

  // Note actions
  addNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Note>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;

  // Reminder actions
  addReminder: (reminder: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Reminder>;
  updateReminder: (id: string, updates: Partial<Reminder>) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;

  // Settings actions
  updateSettings: (updates: Partial<Settings>) => Promise<void>;

  // Toast actions
  setToast: (toast: ToastState | null) => void;

  // Undo actions
  undoDelete: () => Promise<boolean>;

  // Computed values
  getTotalBalance: () => number;
  getCashTotal: () => number;
  getBankTotal: () => number;
  getMonthlyIncome: (month?: string) => number;
  getMonthlyExpenses: (month?: string) => number;
  getAvailableMoney: () => number;
  getUpcomingFinancedPayment: () => FinancedPurchase | null;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      accounts: [],
      categories: [],
      transactions: [],
      financedPurchases: [],
      notes: [],
      reminders: [],
      settings: {
        theme: 'auto',
        currency: 'EUR',
        currencySymbol: '€',
        dateFormat: 'DD/MM/YYYY',
      },
      isLoading: true,
      initialized: false,
      deletedItems: [],
      toast: null,
      theme: 'light',

      // Initialize
      initialize: async () => {
        try {
          // Get DB with timeout
          await Promise.race([
            getDB(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('DB timeout')), 3000))
          ]);

          await initializeDefaultData();

          const [accounts, categories, transactions, financedPurchases, notes, reminders, settings] = await Promise.all([
            accountsDB.getAll(),
            categoriesDB.getAll(),
            transactionsDB.getAll(),
            financedPurchasesDB.getAll(),
            notesDB.getAll(),
            remindersDB.getAll(),
            settingsDB.get(),
          ]);

          const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
          const theme = settings?.theme === 'auto' ? systemTheme : (settings?.theme || systemTheme);

          set({
            accounts: accounts || [],
            categories: categories || [],
            transactions: transactions || [],
            financedPurchases: financedPurchases || [],
            notes: notes || [],
            reminders: reminders || [],
            settings: settings || { theme: 'auto', currency: 'EUR', currencySymbol: '€', dateFormat: 'DD/MM/YYYY' },
            theme,
            isLoading: false,
            initialized: true,
          });

          // Process pending payments
          get().processPendingPayments().catch(console.error);
        } catch (error) {
          console.error('Failed to initialize:', error);
          const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
          set({
            isLoading: false,
            initialized: true,
            accounts: [],
            categories: [],
            transactions: [],
            financedPurchases: [],
            notes: [],
            reminders: [],
            settings: { theme: 'auto', currency: 'EUR', currencySymbol: '€', dateFormat: 'DD/MM/YYYY' },
            theme: systemTheme,
          });
        }
      },

      setTheme: (themeMode) => {
        const actualTheme = themeMode === 'auto'
          ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
          : themeMode;
        set({ theme: actualTheme, settings: { ...get().settings, theme: themeMode } });
        settingsDB.update({ theme: themeMode });
      },

      // Account actions
      addAccount: async (accountData) => {
        const account = await accountsDB.create(accountData);
        set({ accounts: [...get().accounts, account] });
        return account;
      },

      updateAccount: async (id, updates) => {
        const updated = await accountsDB.update(id, updates);
        if (updated) {
          set({ accounts: get().accounts.map(a => a.id === id ? updated : a) });
        }
      },

      deleteAccount: async (id) => {
        const account = get().accounts.find(a => a.id === id);
        if (account) {
          set({
            accounts: get().accounts.filter(a => a.id !== id),
            deletedItems: [...get().deletedItems, { type: 'account', data: account, deletedAt: new Date().toISOString() }],
          });
          await accountsDB.delete(id);
        }
      },

      // Category actions
      addCategory: async (categoryData) => {
        const category = await categoriesDB.create(categoryData);
        set({ categories: [...get().categories, category] });
        return category;
      },

      updateCategory: async (id, updates) => {
        const updated = await categoriesDB.update(id, updates);
        if (updated) {
          set({ categories: get().categories.map(c => c.id === id ? updated : c) });
        }
      },

      deleteCategory: async (id) => {
        const category = get().categories.find(c => c.id === id);
        if (category) {
          set({
            categories: get().categories.filter(c => c.id !== id),
            deletedItems: [...get().deletedItems, { type: 'category', data: category, deletedAt: new Date().toISOString() }],
          });
          await categoriesDB.delete(id);
        }
      },

      // Transaction actions
      addTransaction: async (transactionData) => {
        // La cuenta es obligatoria para ingresos y gastos, y origen+destino
        // obligatorios y distintos para transferencias.
        const validationError = validateTransactionAccounts(get, transactionData);
        if (validationError) {
          throw new Error(validationError);
        }

        const transaction = await transactionsDB.create(transactionData);

        // Aplicar el efecto en los saldos de las cuentas implicadas
        await applyTransactionBalanceEffect(get, set, transaction);

        set({ transactions: [...get().transactions, transaction] });
        return transaction;
      },

      updateTransaction: async (id, updates) => {
        const existing = get().transactions.find(t => t.id === id);
        if (!existing) return;

        // Datos resultantes tras aplicar los cambios
        const merged: Transaction = { ...existing, ...updates };

        const validationError = validateTransactionAccounts(get, merged);
        if (validationError) {
          throw new Error(validationError);
        }

        // 1. Revertir el efecto que la transaccion original tenia sobre las cuentas
        await reverseTransactionBalanceEffect(get, set, existing);

        // 2. Persistir los nuevos datos de la transaccion
        const updated = await transactionsDB.update(id, updates);
        if (!updated) {
          // No se pudo actualizar: restauramos el efecto original para no perder saldo
          await applyTransactionBalanceEffect(get, set, existing);
          return;
        }

        // 3. Aplicar el nuevo efecto (con la cuenta nueva o la misma, importe nuevo, etc.)
        await applyTransactionBalanceEffect(get, set, updated);

        set({ transactions: get().transactions.map(t => (t.id === id ? updated : t)) });
      },

      deleteTransaction: async (id) => {
        const transaction = get().transactions.find(t => t.id === id);
        if (transaction) {
          // Revertir el efecto sobre el saldo (incluye transferencias)
          await reverseTransactionBalanceEffect(get, set, transaction);

          set({
            transactions: get().transactions.filter(t => t.id !== id),
            deletedItems: [...get().deletedItems, { type: 'transaction', data: transaction, deletedAt: new Date().toISOString() }],
          });
          await transactionsDB.delete(id);
        }
      },

      // Financed purchase actions
      addFinancedPurchase: async (purchaseData) => {
        const purchase = await financedPurchasesDB.create(purchaseData);
        set({ financedPurchases: [...get().financedPurchases, purchase] });
        return purchase;
      },

      updateFinancedPurchase: async (id, updates) => {
        const updated = await financedPurchasesDB.update(id, updates);
        if (updated) {
          set({ financedPurchases: get().financedPurchases.map(p => p.id === id ? updated : p) });
        }
      },

      deleteFinancedPurchase: async (id) => {
        const purchase = get().financedPurchases.find(p => p.id === id);
        if (purchase) {
          set({
            financedPurchases: get().financedPurchases.filter(p => p.id !== id),
            deletedItems: [...get().deletedItems, { type: 'financedPurchase', data: purchase, deletedAt: new Date().toISOString() }],
          });
          await financedPurchasesDB.delete(id);
        }
      },

      processPendingPayments: async () => {
        const purchases = get().financedPurchases;
        const today = startOfDay(new Date());
        let hasChanges = false;

        for (const purchase of purchases) {
          if (purchase.paidInstallments >= purchase.numberOfInstallments) continue;

          // Check for pending payments
          const startDate = parseISO(purchase.startDate);
          let paymentDate = new Date(startDate);
          paymentDate.setDate(purchase.chargeDay);

          let newPaidCount = purchase.paidInstallments;
          const newProcessedPayments = [...purchase.processedPayments];

          for (let i = purchase.paidInstallments; i < purchase.numberOfInstallments; i++) {
            const installmentDate = addMonths(paymentDate, i);
            const paymentKey = format(installmentDate, 'yyyy-MM-dd');

            if (!isAfter(installmentDate, today) && !purchase.processedPayments.includes(paymentKey)) {
              // Process the payment
              const account = get().accounts.find(a => a.id === purchase.accountId);
              if (account) {
                await accountsDB.update(account.id, { balance: account.balance - purchase.monthlyPayment });

                // Create expense transaction
                await transactionsDB.create({
                  type: 'expense',
                  title: `${purchase.name} - Cuota ${i + 1}/${purchase.numberOfInstallments}`,
                  amount: purchase.monthlyPayment,
                  date: format(installmentDate, 'yyyy-MM-dd'),
                  categoryId: get().categories.find(c => c.name === 'Otros' && c.type === 'expense')?.id || '',
                  notes: `Pago automatico - ${purchase.name}`,
                  paymentMethod: purchase.accountId,
                });

                newPaidCount = i + 1;
                newProcessedPayments.push(paymentKey);
                hasChanges = true;
              }
            }
          }

          if (newPaidCount !== purchase.paidInstallments) {
            await financedPurchasesDB.update(purchase.id, {
              paidInstallments: newPaidCount,
              processedPayments: newProcessedPayments,
            });
          }
        }

        if (hasChanges) {
          // Reload data
          const [accounts, transactions, financedPurchases] = await Promise.all([
            accountsDB.getAll(),
            transactionsDB.getAll(),
            financedPurchasesDB.getAll(),
          ]);
          set({ accounts, transactions, financedPurchases });
        }
      },

      // Note actions
      addNote: async (noteData) => {
        const note = await notesDB.create(noteData);
        set({ notes: [...get().notes, note] });
        return note;
      },

      updateNote: async (id, updates) => {
        const updated = await notesDB.update(id, updates);
        if (updated) {
          set({ notes: get().notes.map(n => n.id === id ? updated : n) });
        }
      },

      deleteNote: async (id) => {
        const note = get().notes.find(n => n.id === id);
        if (note) {
          set({
            notes: get().notes.filter(n => n.id !== id),
            deletedItems: [...get().deletedItems, { type: 'note', data: note, deletedAt: new Date().toISOString() }],
          });
          await notesDB.delete(id);
        }
      },

      // Reminder actions
      addReminder: async (reminderData) => {
        const reminder = await remindersDB.create(reminderData);
        set({ reminders: [...get().reminders, reminder] });
        return reminder;
      },

      updateReminder: async (id, updates) => {
        const updated = await remindersDB.update(id, updates);
        if (updated) {
          set({ reminders: get().reminders.map(r => r.id === id ? updated : r) });
        }
      },

      deleteReminder: async (id) => {
        const reminder = get().reminders.find(r => r.id === id);
        if (reminder) {
          set({
            reminders: get().reminders.filter(r => r.id !== id),
            deletedItems: [...get().deletedItems, { type: 'reminder', data: reminder, deletedAt: new Date().toISOString() }],
          });
          await remindersDB.delete(id);
        }
      },

      // Settings actions
      updateSettings: async (updates) => {
        const updated = await settingsDB.update(updates);
        set({ settings: updated });
      },

      // Toast actions
      setToast: (toast) => {
        set({ toast });
      },

      // Undo actions
      undoDelete: async () => {
        const deletedItems = get().deletedItems;
        if (deletedItems.length === 0) return false;

        const lastItem = deletedItems[deletedItems.length - 1];
        const newDeletedItems = deletedItems.slice(0, -1);

        // Restore the item based on its type
        switch (lastItem.type) {
          case 'account': {
            const account = lastItem.data as Account;
            await accountsDB.create({
              name: account.name,
              balance: account.balance,
              color: account.color,
              icon: account.icon,
              type: account.type,
            });
            const accounts = await accountsDB.getAll();
            set({ accounts, deletedItems: newDeletedItems });
            break;
          }
          case 'transaction': {
            const transaction = lastItem.data as Transaction;
            await get().addTransaction({
              type: transaction.type,
              title: transaction.title,
              amount: transaction.amount,
              date: transaction.date,
              categoryId: transaction.categoryId,
              notes: transaction.notes,
              paymentMethod: transaction.paymentMethod,
              toAccount: transaction.toAccount,
            });
            set({ deletedItems: newDeletedItems });
            break;
          }
          case 'financedPurchase': {
            const purchase = lastItem.data as FinancedPurchase;
            await financedPurchasesDB.create({
              name: purchase.name,
              originalPrice: purchase.originalPrice,
              monthlyPayment: purchase.monthlyPayment,
              startDate: purchase.startDate,
              chargeDay: purchase.chargeDay,
              numberOfInstallments: purchase.numberOfInstallments,
              accountId: purchase.accountId,
              notes: purchase.notes,
            });
            const financedPurchases = await financedPurchasesDB.getAll();
            set({ financedPurchases, deletedItems: newDeletedItems });
            break;
          }
          case 'note': {
            const note = lastItem.data as Note;
            await notesDB.create({
              title: note.title,
              content: note.content,
              color: note.color,
              pinned: note.pinned,
            });
            const notes = await notesDB.getAll();
            set({ notes, deletedItems: newDeletedItems });
            break;
          }
          case 'reminder': {
            const reminder = lastItem.data as Reminder;
            await remindersDB.create({
              title: reminder.title,
              description: reminder.description,
              date: reminder.date,
              time: reminder.time,
              repeat: reminder.repeat,
              completed: reminder.completed,
            });
            const reminders = await remindersDB.getAll();
            set({ reminders, deletedItems: newDeletedItems });
            break;
          }
          case 'category': {
            const category = lastItem.data as Category;
            await categoriesDB.create({
              name: category.name,
              type: category.type,
              icon: category.icon,
              color: category.color,
              isDefault: category.isDefault,
            });
            const categories = await categoriesDB.getAll();
            set({ categories, deletedItems: newDeletedItems });
            break;
          }
        }

        return true;
      },

      // Computed values
      getTotalBalance: () => {
        return get().accounts.reduce((sum, account) => sum + account.balance, 0);
      },

      getCashTotal: () => {
        return get().accounts.reduce((sum, account) => {
          if (account.type === 'cash') return sum + account.balance;
          if (account.type === 'both') return sum + (account.cashBalance ?? 0);
          return sum;
        }, 0);
      },

      getBankTotal: () => {
        return get().accounts.reduce((sum, account) => {
          if (account.type === 'bank') return sum + account.balance;
          if (account.type === 'both') return sum + (account.bankBalance ?? 0);
          return sum;
        }, 0);
      },

      getMonthlyIncome: (month) => {
        const targetMonth = month || format(new Date(), 'yyyy-MM');
        const start = startOfMonth(new Date(targetMonth + '-01'));
        const end = endOfMonth(start);

        return get().transactions
          .filter(t => {
            const date = parseISO(t.date);
            return t.type === 'income' && date >= start && date <= end;
          })
          .reduce((sum, t) => sum + t.amount, 0);
      },

      getMonthlyExpenses: (month) => {
        const targetMonth = month || format(new Date(), 'yyyy-MM');
        const start = startOfMonth(new Date(targetMonth + '-01'));
        const end = endOfMonth(start);

        return get().transactions
          .filter(t => {
            const date = parseISO(t.date);
            return t.type === 'expense' && date >= start && date <= end;
          })
          .reduce((sum, t) => sum + t.amount, 0);
      },

      getAvailableMoney: () => {
        // El dinero disponible es SIEMPRE la suma del saldo real de todas las
        // cuentas (efectivo + bancos). Las financiaciones NO se descuentan aqui:
        // solo afectan al saldo de la cuenta cuando se procesa la cuota mensual
        // correspondiente (ver processPendingPayments), momento en el que ya
        // queda reflejado en el balance de la cuenta.
        return get().getTotalBalance();
      },

      getUpcomingFinancedPayment: () => {
        const today = new Date();
        const upcoming = get().financedPurchases
          .filter(p => p.paidInstallments < p.numberOfInstallments)
          .map(p => {
            const startDate = parseISO(p.startDate);
            let nextPaymentDate = addMonths(startDate, p.paidInstallments);
            nextPaymentDate.setDate(p.chargeDay);
            return { ...p, nextPaymentDate };
          })
          .filter(p => !isBefore(p.nextPaymentDate, today))
          .sort((a, b) => a.nextPaymentDate.getTime() - b.nextPaymentDate.getTime());

        return upcoming[0] || null;
      },
    }),
    {
      name: 'money-control-store',
      partialize: (state) => ({
        deletedItems: state.deletedItems,
      }),
    }
  )
);
