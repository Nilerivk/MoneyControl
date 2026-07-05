// Types for Money Control App

export type ThemeMode = 'light' | 'dark' | 'auto';

export type AccountType = 'cash' | 'bank' | 'both';

export type TransactionType = 'income' | 'expense' | 'transfer';

export type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Account {
  id: string;
  name: string;
  balance: number;
  // Solo aplican cuando type === 'both': cuanto de ese saldo total esta
  // en efectivo y cuanto en banco. balance siempre debe ser la suma de
  // ambos para una cuenta 'both'.
  cashBalance?: number;
  bankBalance?: number;
  color: string;
  icon: string;
  type: AccountType;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
  isDefault: boolean;
  createdAt: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  title: string;
  amount: number;
  date: string;
  categoryId: string;
  notes?: string;
  paymentMethod: string; // accountId or 'cash'
  toAccount?: string; // for transfers
  // Cuando la cuenta usada (paymentMethod) es de tipo 'both' (efectivo y
  // banco a la vez), este campo indica en cual de las dos formas se movio
  // el dinero. No aplica a cuentas 'cash' o 'bank' puras, ni a transferencias.
  walletType?: 'cash' | 'bank';
  createdAt: string;
  updatedAt: string;
}

export interface FinancedPurchase {
  id: string;
  name: string;
  originalPrice: number;
  monthlyPayment: number;
  startDate: string;
  chargeDay: number; // 1-31
  numberOfInstallments: number;
  accountId: string;
  notes?: string;
  paidInstallments: number;
  processedPayments: string[]; // dates of processed payments
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Reminder {
  id: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  repeat: RepeatType;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  theme: ThemeMode;
  currency: string;
  currencySymbol: string;
  dateFormat: string;
}

export interface MonthlyStats {
  month: string;
  income: number;
  expenses: number;
}

export interface CategoryStats {
  categoryId: string;
  categoryName: string;
  amount: number;
  color: string;
  percentage: number;
}

// Default categories
export const DEFAULT_EXPENSE_CATEGORIES: Omit<Category, 'id' | 'createdAt'>[] = [
  { name: 'Alimentacion', type: 'expense', icon: 'UtensilsCrossed', color: '#ef4444', isDefault: true },
  { name: 'Supermercado', type: 'expense', icon: 'ShoppingCart', color: '#f97316', isDefault: true },
  { name: 'Transporte', type: 'expense', icon: 'Car', color: '#eab308', isDefault: true },
  { name: 'Combustible', type: 'expense', icon: 'Fuel', color: '#84cc16', isDefault: true },
  { name: 'Restaurantes', type: 'expense', icon: 'Coffee', color: '#22c55e', isDefault: true },
  { name: 'Ocio', type: 'expense', icon: 'Gamepad2', color: '#14b8a6', isDefault: true },
  { name: 'Compras', type: 'expense', icon: 'ShoppingBag', color: '#06b6d4', isDefault: true },
  { name: 'Salud', type: 'expense', icon: 'Heart', color: '#3b82f6', isDefault: true },
  { name: 'Hogar', type: 'expense', icon: 'Home', color: '#8b5cf6', isDefault: true },
  { name: 'Facturas', type: 'expense', icon: 'Receipt', color: '#a855f7', isDefault: true },
  { name: 'Suscripciones', type: 'expense', icon: 'CreditCard', color: '#ec4899', isDefault: true },
  { name: 'Educacion', type: 'expense', icon: 'GraduationCap', color: '#f43f5e', isDefault: true },
  { name: 'Viajes', type: 'expense', icon: 'Plane', color: '#64748b', isDefault: true },
  { name: 'Otros', type: 'expense', icon: 'MoreHorizontal', color: '#78716c', isDefault: true },
];

export const DEFAULT_INCOME_CATEGORIES: Omit<Category, 'id' | 'createdAt'>[] = [
  { name: 'Salario', type: 'income', icon: 'Wallet', color: '#22c55e', isDefault: true },
  { name: 'Regalo', type: 'income', icon: 'Gift', color: '#f97316', isDefault: true },
  { name: 'Reembolso', type: 'income', icon: 'RotateCcw', color: '#3b82f6', isDefault: true },
  { name: 'Inversion', type: 'income', icon: 'TrendingUp', color: '#8b5cf6', isDefault: true },
  { name: 'Negocio', type: 'income', icon: 'Briefcase', color: '#14b8a6', isDefault: true },
  { name: 'Otros', type: 'income', icon: 'MoreHorizontal', color: '#64748b', isDefault: true },
];

// Icon options for accounts
export const ACCOUNT_ICONS = [
  'Wallet', 'Landmark', 'Building2', 'CreditCard', 'PiggyBank',
  'Smartphone', 'Globe', 'DollarSign', 'Coins', 'Safe'
];

// Color options
export const COLOR_OPTIONS = [
  '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e',
  '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#a855f7',
  '#ec4899', '#f43f5e', '#64748b', '#78716c', '#1e293b'
];

export const NOTE_COLORS = [
  '#fef3c7', '#fce7f3', '#dbeafe', '#d1fae5', '#e0e7ff',
  '#fae8ff', '#fed7aa', '#e5e7eb', '#fee2e2', '#cffafe'
];
