import { openDB, DBSchema, IDBPDatabase } from 'idb';
import {
  Account,
  Category,
  Transaction,
  FinancedPurchase,
  Note,
  Reminder,
  Settings,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES
} from '../types';
import { v4 as uuidv4 } from 'uuid';

interface MoneyControlDB extends DBSchema {
  accounts: {
    key: string;
    value: Account;
    indexes: { 'by-type': string };
  };
  categories: {
    key: string;
    value: Category;
    indexes: { 'by-type': string };
  };
  transactions: {
    key: string;
    value: Transaction;
    indexes: { 'by-date': string; 'by-type': string };
  };
  financedPurchases: {
    key: string;
    value: FinancedPurchase;
  };
  notes: {
    key: string;
    value: Note;
  };
  reminders: {
    key: string;
    value: Reminder;
  };
  settings: {
    key: string;
    value: Settings;
  };
}

const DB_NAME = 'money-control-db';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<MoneyControlDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<MoneyControlDB>> {
  if (dbInstance) return dbInstance;

  try {
    dbInstance = await openDB<MoneyControlDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Accounts store
        if (!db.objectStoreNames.contains('accounts')) {
          const accountStore = db.createObjectStore('accounts', { keyPath: 'id' });
          accountStore.createIndex('by-type', 'type');
        }

        // Categories store
        if (!db.objectStoreNames.contains('categories')) {
          const categoryStore = db.createObjectStore('categories', { keyPath: 'id' });
          categoryStore.createIndex('by-type', 'type');
        }

        // Transactions store
        if (!db.objectStoreNames.contains('transactions')) {
          const transactionStore = db.createObjectStore('transactions', { keyPath: 'id' });
          transactionStore.createIndex('by-date', 'date');
          transactionStore.createIndex('by-type', 'type');
        }

        // Financed purchases store
        if (!db.objectStoreNames.contains('financedPurchases')) {
          db.createObjectStore('financedPurchases', { keyPath: 'id' });
        }

        // Notes store
        if (!db.objectStoreNames.contains('notes')) {
          db.createObjectStore('notes', { keyPath: 'id' });
        }

        // Reminders store
        if (!db.objectStoreNames.contains('reminders')) {
          db.createObjectStore('reminders', { keyPath: 'id' });
        }

        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }
      },
    });
    return dbInstance;
  } catch (error) {
    console.error('Error opening database:', error);
    throw error;
  }
}

// Guarda la promesa en curso para que, si initializeDefaultData() se llama
// varias veces casi a la vez (por ejemplo por el doble efecto de
// React.StrictMode en desarrollo), todas las llamadas esperen a la MISMA
// ejecucion en lugar de hacer cada una su propio "check-then-insert" y acabar
// creando cuentas o categorias duplicadas por una condicion de carrera.
let initializeDefaultDataPromise: Promise<void> | null = null;

export async function initializeDefaultData(): Promise<void> {
  if (!initializeDefaultDataPromise) {
    initializeDefaultDataPromise = runInitializeDefaultData().finally(() => {
      initializeDefaultDataPromise = null;
    });
  }
  return initializeDefaultDataPromise;
}

async function runInitializeDefaultData(): Promise<void> {
  const db = await getDB();

  try {
    await ensureDefaultCategories();
  } catch (error) {
    console.error('Error initializing categories:', error);
  }

  // Check if default account exists
  try {
    const existingAccounts = await db.getAll('accounts');
    if (existingAccounts.length === 0) {
      const now = new Date().toISOString();
      const defaultAccount: Account = {
        id: uuidv4(),
        name: 'Cuenta Principal',
        balance: 0,
        cashBalance: 0,
        bankBalance: 0,
        color: '#3b82f6',
        icon: 'Wallet',
        type: 'both',
        isDefault: true,
        createdAt: now,
        updatedAt: now,
      };
      await db.put('accounts', defaultAccount);
      console.log('Created default account');
    }
  } catch (error) {
    console.error('Error initializing default account:', error);
  }

  // Check if settings exist
  try {
    const existingSettings = await db.get('settings', 'main');
    if (!existingSettings) {
      await db.put('settings', {
        id: 'main',
        theme: 'auto',
        currency: 'EUR',
        currencySymbol: '€',
        dateFormat: 'DD/MM/YYYY',
      } as unknown as Settings);
    }
  } catch (error) {
    console.error('Error initializing settings:', error);
  }

  // Reparar cuentas por defecto duplicadas que hayan podido crearse en
  // sesiones anteriores (p.ej. por la condicion de carrera que arreglamos
  // arriba). Esto se ejecuta siempre, no solo la primera vez, para curar
  // instalaciones ya afectadas.
  try {
    await deduplicateDefaultAccounts();
  } catch (error) {
    console.error('Error deduplicating default accounts:', error);
  }

  // Igual que con las cuentas: repara categorias por defecto duplicadas
  // (p.ej. "Alimentacion" repetida) creadas antes de este arreglo.
  try {
    await deduplicateDefaultCategories();
  } catch (error) {
    console.error('Error deduplicating default categories:', error);
  }

  // Cuentas de tipo 'both' creadas antes de separar el saldo en efectivo y
  // banco no tienen cashBalance/bankBalance todavia: se los damos ahora,
  // asumiendo que el saldo que ya tenian estaba en el banco (para no
  // inventarnos dinero en efectivo que el usuario no dijo que tuviera).
  try {
    await ensureWalletSplit();
  } catch (error) {
    console.error('Error initializing cash/bank split:', error);
  }
}

async function ensureWalletSplit(): Promise<void> {
  const db = await getDB();
  const accounts = await db.getAll('accounts');

  for (const acc of accounts) {
    if (acc.type === 'both' && (acc.cashBalance === undefined || acc.bankBalance === undefined)) {
      await db.put('accounts', {
        ...acc,
        cashBalance: acc.cashBalance ?? 0,
        bankBalance: acc.bankBalance ?? acc.balance,
        updatedAt: new Date().toISOString(),
      });
    }
  }
}

// Comprueba, una por una, que cada categoria predeterminada (nombre + tipo)
// exista en la base de datos, y crea solo las que falten. A diferencia del
// enfoque anterior ("si no hay ninguna categoria, crear todas"), esto se
// autorepara: si por cualquier motivo faltan algunas (p.ej. Salario,
// Regalo... desaparecieron pero "Negocio" seguia ahi), esta funcion las
// vuelve a crear sin duplicar las que ya existen ni tocar las categorias
// personalizadas del usuario.
async function ensureDefaultCategories(): Promise<void> {
  const db = await getDB();
  const existingCategories = await db.getAll('categories');
  const now = new Date().toISOString();

  const allDefaults = [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES];
  let created = 0;

  for (const def of allDefaults) {
    const exists = existingCategories.some(c => c.type === def.type && c.name === def.name);
    if (!exists) {
      await db.put('categories', {
        ...def,
        id: uuidv4(),
        createdAt: now,
      });
      created++;
    }
  }

  if (created > 0) {
    console.log('Restauradas', created, 'categoria(s) predeterminada(s) que faltaban');
  }
}
// Se queda con la mas antigua, le suma el saldo de las demas, y reasigna
// cualquier transaccion o compra financiada que apuntara a las cuentas
// eliminadas para no perder ni dinero ni historial.
async function deduplicateDefaultAccounts(): Promise<void> {
  const db = await getDB();
  const accounts = await db.getAll('accounts');

  const duplicates = accounts
    .filter(a => a.isDefault)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  if (duplicates.length <= 1) return;

  const [keep, ...extra] = duplicates;
  const extraIds = new Set(extra.map(a => a.id));

  const mergedBalance = extra.reduce((sum, a) => sum + a.balance, keep.balance);
  const mergedCash = extra.reduce((sum, a) => sum + (a.cashBalance ?? 0), keep.cashBalance ?? 0);
  const mergedBank = extra.reduce((sum, a) => sum + (a.bankBalance ?? 0), keep.bankBalance ?? 0);

  const tx = db.transaction(['accounts', 'transactions', 'financedPurchases'], 'readwrite');

  await tx.objectStore('accounts').put({
    ...keep,
    balance: mergedBalance,
    cashBalance: keep.type === 'both' ? mergedCash : keep.cashBalance,
    bankBalance: keep.type === 'both' ? mergedBank : keep.bankBalance,
    updatedAt: new Date().toISOString(),
  });

  for (const id of extraIds) {
    await tx.objectStore('accounts').delete(id);
  }

  const allTransactions = await tx.objectStore('transactions').getAll();
  for (const t of allTransactions) {
    let changed = false;
    if (extraIds.has(t.paymentMethod)) {
      t.paymentMethod = keep.id;
      changed = true;
    }
    if (t.toAccount && extraIds.has(t.toAccount)) {
      t.toAccount = keep.id;
      changed = true;
    }
    if (changed) {
      await tx.objectStore('transactions').put(t);
    }
  }

  const allFinanced = await tx.objectStore('financedPurchases').getAll();
  for (const p of allFinanced) {
    if (extraIds.has(p.accountId)) {
      p.accountId = keep.id;
      await tx.objectStore('financedPurchases').put(p);
    }
  }

  await tx.done;
  console.log('Fusionadas', extra.length, 'cuenta(s) principal(es) duplicada(s)');
}

// Fusiona categorias predeterminadas duplicadas (mismo nombre + tipo,
// isDefault = true) creadas por la misma condicion de carrera al arrancar
// la app varias veces. Se queda con la mas antigua de cada grupo y
// reasigna las transacciones que usaran las duplicadas eliminadas.
async function deduplicateDefaultCategories(): Promise<void> {
  const db = await getDB();
  const categories = await db.getAll('categories');

  const groups = new Map<string, Category[]>();
  for (const cat of categories) {
    if (!cat.isDefault) continue;
    const key = `${cat.type}::${cat.name}`;
    const list = groups.get(key) || [];
    list.push(cat);
    groups.set(key, list);
  }

  const idsToDelete: string[] = [];
  const remap = new Map<string, string>(); // duplicateId -> keptId

  for (const list of groups.values()) {
    if (list.length <= 1) continue;
    const sorted = [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const [keep, ...extra] = sorted;
    for (const dup of extra) {
      idsToDelete.push(dup.id);
      remap.set(dup.id, keep.id);
    }
  }

  if (idsToDelete.length === 0) return;

  const tx = db.transaction(['categories', 'transactions'], 'readwrite');

  for (const id of idsToDelete) {
    await tx.objectStore('categories').delete(id);
  }

  const allTransactions = await tx.objectStore('transactions').getAll();
  for (const t of allTransactions) {
    const newId = remap.get(t.categoryId);
    if (newId) {
      t.categoryId = newId;
      await tx.objectStore('transactions').put(t);
    }
  }

  await tx.done;
  console.log('Fusionadas', idsToDelete.length, 'categoria(s) predeterminada(s) duplicada(s)');
}

// Account operations
export const accountsDB = {
  async getAll(): Promise<Account[]> {
    const db = await getDB();
    return db.getAll('accounts');
  },

  async getById(id: string): Promise<Account | undefined> {
    const db = await getDB();
    return db.get('accounts', id);
  },

  async create(account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Promise<Account> {
    const db = await getDB();
    const now = new Date().toISOString();
    const newAccount: Account = {
      ...account,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };
    await db.put('accounts', newAccount);
    return newAccount;
  },

  async update(id: string, updates: Partial<Account>): Promise<Account | undefined> {
    const db = await getDB();
    const existing = await db.get('accounts', id);
    if (!existing) return undefined;

    const updated: Account = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await db.put('accounts', updated);
    return updated;
  },

  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('accounts', id);
  },
};

// Category operations
export const categoriesDB = {
  async getAll(): Promise<Category[]> {
    const db = await getDB();
    return db.getAll('categories');
  },

  async getByType(type: 'income' | 'expense'): Promise<Category[]> {
    const db = await getDB();
    return db.getAllFromIndex('categories', 'by-type', type);
  },

  async create(category: Omit<Category, 'id' | 'createdAt'>): Promise<Category> {
    const db = await getDB();
    const newCategory: Category = {
      ...category,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    await db.put('categories', newCategory);
    return newCategory;
  },

  async update(id: string, updates: Partial<Category>): Promise<Category | undefined> {
    const db = await getDB();
    const existing = await db.get('categories', id);
    if (!existing) return undefined;

    const updated: Category = { ...existing, ...updates };
    await db.put('categories', updated);
    return updated;
  },

  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('categories', id);
  },
};

// Transaction operations
export const transactionsDB = {
  async getAll(): Promise<Transaction[]> {
    const db = await getDB();
    return db.getAll('transactions');
  },

  async getByDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
    const db = await getDB();
    const all = await db.getAll('transactions');
    return all.filter(t => t.date >= startDate && t.date <= endDate);
  },

  async create(transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> {
    const db = await getDB();
    const now = new Date().toISOString();
    const newTransaction: Transaction = {
      ...transaction,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };
    await db.put('transactions', newTransaction);
    return newTransaction;
  },

  async update(id: string, updates: Partial<Transaction>): Promise<Transaction | undefined> {
    const db = await getDB();
    const existing = await db.get('transactions', id);
    if (!existing) return undefined;

    const updated: Transaction = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await db.put('transactions', updated);
    return updated;
  },

  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('transactions', id);
  },
};

// Financed purchases operations
export const financedPurchasesDB = {
  async getAll(): Promise<FinancedPurchase[]> {
    const db = await getDB();
    return db.getAll('financedPurchases');
  },

  async getById(id: string): Promise<FinancedPurchase | undefined> {
    const db = await getDB();
    return db.get('financedPurchases', id);
  },

  async create(purchase: Omit<FinancedPurchase, 'id' | 'createdAt' | 'updatedAt' | 'paidInstallments' | 'processedPayments'>): Promise<FinancedPurchase> {
    const db = await getDB();
    const now = new Date().toISOString();
    const newPurchase: FinancedPurchase = {
      ...purchase,
      id: uuidv4(),
      paidInstallments: 0,
      processedPayments: [],
      createdAt: now,
      updatedAt: now,
    };
    await db.put('financedPurchases', newPurchase);
    return newPurchase;
  },

  async update(id: string, updates: Partial<FinancedPurchase>): Promise<FinancedPurchase | undefined> {
    const db = await getDB();
    const existing = await db.get('financedPurchases', id);
    if (!existing) return undefined;

    const updated: FinancedPurchase = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await db.put('financedPurchases', updated);
    return updated;
  },

  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('financedPurchases', id);
  },
};

// Notes operations
export const notesDB = {
  async getAll(): Promise<Note[]> {
    const db = await getDB();
    return db.getAll('notes');
  },

  async create(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<Note> {
    const db = await getDB();
    const now = new Date().toISOString();
    const newNote: Note = {
      ...note,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };
    await db.put('notes', newNote);
    return newNote;
  },

  async update(id: string, updates: Partial<Note>): Promise<Note | undefined> {
    const db = await getDB();
    const existing = await db.get('notes', id);
    if (!existing) return undefined;

    const updated: Note = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await db.put('notes', updated);
    return updated;
  },

  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('notes', id);
  },
};

// Reminders operations
export const remindersDB = {
  async getAll(): Promise<Reminder[]> {
    const db = await getDB();
    return db.getAll('reminders');
  },

  async create(reminder: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>): Promise<Reminder> {
    const db = await getDB();
    const now = new Date().toISOString();
    const newReminder: Reminder = {
      ...reminder,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };
    await db.put('reminders', newReminder);
    return newReminder;
  },

  async update(id: string, updates: Partial<Reminder>): Promise<Reminder | undefined> {
    const db = await getDB();
    const existing = await db.get('reminders', id);
    if (!existing) return undefined;

    const updated: Reminder = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await db.put('reminders', updated);
    return updated;
  },

  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('reminders', id);
  },
};

// Settings operations
export const settingsDB = {
  async get(): Promise<Settings> {
    try {
      const db = await getDB();
      const settings = await db.get('settings', 'main');
      return settings || {
        theme: 'auto',
        currency: 'EUR',
        currencySymbol: '€',
        dateFormat: 'DD/MM/YYYY',
      };
    } catch {
      return {
        theme: 'auto',
        currency: 'EUR',
        currencySymbol: '€',
        dateFormat: 'DD/MM/YYYY',
      };
    }
  },

  async update(updates: Partial<Settings>): Promise<Settings> {
    const db = await getDB();
    const existing = await this.get();
    const updated = { ...existing, ...updates };
    await db.put('settings', { ...updated, id: 'main' } as unknown as Settings);
    return updated;
  },
};

// Export/Import data
export const dataExport = {
  async exportAll(): Promise<string> {
    const db = await getDB();
    const data = {
      accounts: await db.getAll('accounts'),
      categories: await db.getAll('categories'),
      transactions: await db.getAll('transactions'),
      financedPurchases: await db.getAll('financedPurchases'),
      notes: await db.getAll('notes'),
      reminders: await db.getAll('reminders'),
      settings: await settingsDB.get(),
      exportDate: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  },

  async importAll(jsonData: string): Promise<void> {
    const db = await getDB();
    const data = JSON.parse(jsonData);

    // Clear existing data
    const tx = db.transaction(['accounts', 'categories', 'transactions', 'financedPurchases', 'notes', 'reminders', 'settings'], 'readwrite');

    await Promise.all([
      tx.objectStore('accounts').clear(),
      tx.objectStore('categories').clear(),
      tx.objectStore('transactions').clear(),
      tx.objectStore('financedPurchases').clear(),
      tx.objectStore('notes').clear(),
      tx.objectStore('reminders').clear(),
      tx.objectStore('settings').clear(),
    ]);

    // Import new data
    for (const account of data.accounts || []) {
      await tx.objectStore('accounts').put(account);
    }
    for (const category of data.categories || []) {
      await tx.objectStore('categories').put(category);
    }
    for (const transaction of data.transactions || []) {
      await tx.objectStore('transactions').put(transaction);
    }
    for (const purchase of data.financedPurchases || []) {
      await tx.objectStore('financedPurchases').put(purchase);
    }
    for (const note of data.notes || []) {
      await tx.objectStore('notes').put(note);
    }
    for (const reminder of data.reminders || []) {
      await tx.objectStore('reminders').put(reminder);
    }
    if (data.settings) {
      await tx.objectStore('settings').put({ ...data.settings, id: 'main' });
    }

    await tx.done;
  },

  async deleteAll(): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(['accounts', 'categories', 'transactions', 'financedPurchases', 'notes', 'reminders', 'settings'], 'readwrite');

    await Promise.all([
      tx.objectStore('accounts').clear(),
      tx.objectStore('categories').clear(),
      tx.objectStore('transactions').clear(),
      tx.objectStore('financedPurchases').clear(),
      tx.objectStore('notes').clear(),
      tx.objectStore('reminders').clear(),
    ]);

    await tx.done;
  },
};
