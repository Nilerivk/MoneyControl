import React, { useMemo } from 'react';
import { useAppStore } from '../store';
import { Card } from './ui';
import {
  format, startOfMonth, endOfMonth, startOfYear, parseISO, subMonths, eachMonthOfInterval, isSameMonth, differenceInDays
} from 'date-fns';
import {
  Wallet, Landmark, TrendingUp, TrendingDown, DollarSign,
  Calendar, CreditCard, AlertCircle, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';

interface DashboardProps {
  onQuickAdd: (type: 'income' | 'expense') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onQuickAdd }) => {
  const {
    transactions, financedPurchases, categories,
    getTotalBalance, getCashTotal, getBankTotal,
    getMonthlyIncome, getMonthlyExpenses, getAvailableMoney,
    getUpcomingFinancedPayment, theme
  } = useAppStore();

  const today = new Date();
  const currentMonthKey = format(today, 'yyyy-MM');

  // Calculate totals
  const totalBalance = getTotalBalance();
  const cashTotal = getCashTotal();
  const bankTotal = getBankTotal();
  const monthlyIncome = getMonthlyIncome(currentMonthKey);
  const monthlyExpenses = getMonthlyExpenses(currentMonthKey);
  const availableMoney = getAvailableMoney();
  const upcomingPayment = getUpcomingFinancedPayment();

  // Income vs Expenses chart data
  const incomeVsExpensesData = useMemo(() => {
    const months = eachMonthOfInterval({
      start: subMonths(startOfMonth(today), 5),
      end: endOfMonth(today),
    });

    return months.map(month => {
      const income = transactions
        .filter(t => {
          const date = parseISO(t.date);
          return t.type === 'income' && isSameMonth(date, month);
        })
        .reduce((sum, t) => sum + t.amount, 0);

      const expenses = transactions
        .filter(t => {
          const date = parseISO(t.date);
          return t.type === 'expense' && isSameMonth(date, month);
        })
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        name: format(month, 'MMM'),
        Ingresos: income,
        Gastos: expenses,
      };
    });
  }, [transactions]);

  // Expenses by category data
  const expensesByCategory = useMemo(() => {
    const expenses = transactions.filter(t => {
      const date = parseISO(t.date);
      return t.type === 'expense' && isSameMonth(date, today);
    });

    const categoryTotals: Record<string, number> = {};

    expenses.forEach(t => {
      if (!categoryTotals[t.categoryId]) {
        categoryTotals[t.categoryId] = 0;
      }
      categoryTotals[t.categoryId] += t.amount;
    });

    const total = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);

    return Object.entries(categoryTotals)
      .map(([categoryId, amount]) => {
        const category = categories.find(c => c.id === categoryId);
        return {
          name: category?.name || 'Otros',
          value: amount,
          color: category?.color || '#64748b',
          percentage: total > 0 ? ((amount / total) * 100).toFixed(1) : 0,
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [transactions, categories]);

  // Monthly evolution data
  const monthlyEvolution = useMemo(() => {
    const months = eachMonthOfInterval({
      start: startOfYear(today),
      end: endOfMonth(today),
    });

    return months.map(month => {
      const monthTransactions = transactions.filter(t => {
        const date = parseISO(t.date);
        return isSameMonth(date, month);
      });

      let runningBalance = 0;
      monthTransactions.forEach(t => {
        if (t.type === 'income') runningBalance += t.amount;
        else if (t.type === 'expense') runningBalance -= t.amount;
      });

      return {
        name: format(month, 'MMM'),
        balance: Math.abs(runningBalance),
        positive: runningBalance >= 0,
      };
    });
  }, [transactions]);

  // Recent transactions
  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [transactions]);

  // Upcoming financed payments
  const upcomingFinancedPayments = useMemo(() => {
    return financedPurchases
      .filter(p => p.paidInstallments < p.numberOfInstallments)
      .map(p => {
        const startDate = parseISO(p.startDate);
        let nextPaymentDate = new Date(startDate);
        nextPaymentDate.setDate(p.chargeDay);
        nextPaymentDate = new Date(nextPaymentDate.setMonth(startDate.getMonth() + p.paidInstallments));

        return {
          ...p,
          nextPaymentDate,
          daysRemaining: differenceInDays(nextPaymentDate, today),
          remainingAmount: p.originalPrice - (p.monthlyPayment * p.paidInstallments),
        };
      })
      .filter(p => p.daysRemaining >= 0)
      .sort((a, b) => a.daysRemaining - b.daysRemaining)
      .slice(0, 3);
  }, [financedPurchases]);

  // Calculate budget warning
  const budgetWarning = monthlyExpenses > monthlyIncome && monthlyIncome > 0;

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="px-4 pt-2">
        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
          {format(today, "EEEE, d 'de' MMMM 'de' yyyy", { locale: undefined })}
        </p>
      </div>

      {/* Budget Warning */}
      {budgetWarning && (
        <Card className={`border-l-4 border-l-red-500 ${theme === 'dark' ? 'bg-red-500/10' : 'bg-red-50'}`}>
          <div className="flex items-center gap-3">
            <AlertCircle className="text-red-500" size={24} />
            <div>
              <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Atencion: Gastos exceden ingresos
              </p>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Este mes has gastado mas de lo que has ingresado
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Total Balance Card */}
      <Card className={(theme === 'dark' ? 'bg-gradient-to-br from-blue-600/20 to-purple-600/20' : 'bg-gradient-to-br from-blue-500 to-purple-600')}>
        <div className="text-center py-4">
          <p className={`text-sm mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-white/80'}`}>
            Balance Total
          </p>
          <p className="text-4xl font-bold text-white mb-4">
            {formatCurrency(totalBalance)}
          </p>
          <div className="flex justify-center gap-8">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-white/10' : 'bg-white/20'}`}>
                <Wallet size={20} className="text-white" />
              </div>
              <div className="text-left">
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-white/70'}`}>Efectivo</p>
                <p className="text-white font-semibold">{formatCurrency(cashTotal)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-white/10' : 'bg-white/20'}`}>
                <Landmark size={20} className="text-white" />
              </div>
              <div className="text-left">
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-white/70'}`}>Banco</p>
                <p className="text-white font-semibold">{formatCurrency(bankTotal)}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Monthly Summary */}
      <div className="px-4 grid grid-cols-2 gap-4">
        <Card className={theme === 'dark' ? 'bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30' : 'bg-gradient-to-br from-green-50 to-green-100 border-green-200'}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-green-500 text-white">
              <TrendingUp size={20} />
            </div>
            <div className="flex-1">
              <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Ingresos del mes
              </p>
              <p className={`text-lg font-bold text-green-500`}>
                +{formatCurrency(monthlyIncome)}
              </p>
            </div>
          </div>
        </Card>

        <Card className={theme === 'dark' ? 'bg-gradient-to-br from-red-500/20 to-red-600/10 border-red-500/30' : 'bg-gradient-to-br from-red-50 to-red-100 border-red-200'}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-500 text-white">
              <TrendingDown size={20} />
            </div>
            <div className="flex-1">
              <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Gastos del mes
              </p>
              <p className={`text-lg font-bold text-red-500`}>
                -{formatCurrency(monthlyExpenses)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="px-4 grid grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
              <DollarSign className="text-blue-500" size={20} />
            </div>
            <div className="flex-1">
              <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Dinero disponible
              </p>
              <p className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {formatCurrency(availableMoney)}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-purple-500/20' : 'bg-purple-50'}`}>
              <CreditCard className="text-purple-500" size={20} />
            </div>
            <div className="flex-1">
              <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Balance mensual
              </p>
              <p className={`text-lg font-bold ${(monthlyIncome - monthlyExpenses) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatCurrency(monthlyIncome - monthlyExpenses)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Upcoming Financed Payment */}
      {upcomingPayment && upcomingFinancedPayments.length > 0 && (
        <div className="px-4">
          <Card className={theme === 'dark' ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/30' : 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200'}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500 text-white">
                  <Calendar size={20} />
                </div>
                <div>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Proximo pago financiado
                  </p>
                  <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {upcomingFinancedPayments[0].name}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-amber-500">
                  {formatCurrency(upcomingFinancedPayments[0].monthlyPayment)}
                </p>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {upcomingFinancedPayments[0].daysRemaining === 0
                    ? 'Hoy'
                    : `En ${upcomingFinancedPayments[0].daysRemaining} dias`}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <div className="px-4">
        <div className="flex gap-3">
          <button
            onClick={() => onQuickAdd('income')}
            className={`
              flex-1 py-3 px-4 rounded-xl font-medium
              flex items-center justify-center gap-2
              transition-all duration-200 active:scale-95
              ${theme === 'dark'
                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                : 'bg-green-100 text-green-600 hover:bg-green-200'}
            `}
          >
            <ArrowUpRight size={20} />
            Ingreso rapido
          </button>
          <button
            onClick={() => onQuickAdd('expense')}
            className={`
              flex-1 py-3 px-4 rounded-xl font-medium
              flex items-center justify-center gap-2
              transition-all duration-200 active:scale-95
              ${theme === 'dark'
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'bg-red-100 text-red-600 hover:bg-red-200'}
            `}
          >
            <ArrowDownRight size={20} />
            Gasto rapido
          </button>
        </div>
      </div>

      {/* Income vs Expenses Chart */}
      {incomeVsExpensesData.length > 0 && (
        <div className="px-4">
          <Card>
            <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Ingresos vs Gastos
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={incomeVsExpensesData}>
                  <defs>
                    <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: theme === 'dark' ? '#9ca3af' : '#6b7280', fontSize: 12 }}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme === 'dark' ? '#1f2937' : '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      color: theme === 'dark' ? '#fff' : '#111',
                    }}
                    formatter={(value) => formatCurrency(value as number)}
                  />
                  <Area type="monotone" dataKey="Ingresos" stroke="#22c55e" fillOpacity={1} fill="url(#colorIngresos)" />
                  <Area type="monotone" dataKey="Gastos" stroke="#ef4444" fillOpacity={1} fill="url(#colorGastos)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* Expenses by Category */}
      {expensesByCategory.length > 0 && (
        <div className="px-4">
          <Card>
            <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Gastos por categoria
            </h3>
            <div className="flex">
              <div className="w-32 h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expensesByCategory}
                      innerRadius={35}
                      outerRadius={50}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {expensesByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {expensesByCategory.slice(0, 4).map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        {item.name}
                      </span>
                    </div>
                    <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {item.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Monthly Evolution */}
      {monthlyEvolution.length > 0 && (
        <div className="px-4">
          <Card>
            <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Evolucion mensual
            </h3>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyEvolution}>
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: theme === 'dark' ? '#9ca3af' : '#6b7280', fontSize: 12 }}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme === 'dark' ? '#1f2937' : '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      color: theme === 'dark' ? '#fff' : '#111',
                    }}
                    formatter={(value) => formatCurrency(value as number)}
                  />
                  <Bar
                    dataKey="balance"
                    radius={[4, 4, 0, 0]}
                    fill="#3b82f6"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* Recent Transactions */}
      {recentTransactions.length > 0 && (
        <div className="px-4">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Transacciones recientes
              </h3>
              <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                {format(format(today, 'yyyy-MM-dd'), 'dd/MM/yyyy')}
              </span>
            </div>
            <div className="space-y-3">
              {recentTransactions.map(transaction => {
                const category = categories.find(c => c.id === transaction.categoryId);
                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between py-2"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${category?.color || '#64748b'}20` }}
                      >
                        <span style={{ color: category?.color || '#64748b' }}>
                          {transaction.type === 'income' ? '↑' : transaction.type === 'expense' ? '↓' : '↔'}
                        </span>
                      </div>
                      <div>
                        <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {transaction.title}
                        </p>
                        <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          {category?.name || 'Sin categoria'}
                        </p>
                      </div>
                    </div>
                    <p className={`font-semibold ${
                      transaction.type === 'income'
                        ? 'text-green-500'
                        : transaction.type === 'expense'
                          ? 'text-red-500'
                          : theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '-' : ''}{formatCurrency(transaction.amount)}
                    </p>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* Upcoming Financed Payments List */}
      {upcomingFinancedPayments.length > 1 && (
        <div className="px-4">
          <Card>
            <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Proximos pagos financiados
            </h3>
            <div className="space-y-3">
              {upcomingFinancedPayments.slice(0, 3).map(purchase => {
                const progress = (purchase.paidInstallments / purchase.numberOfInstallments) * 100;
                return (
                  <div key={purchase.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {purchase.name}
                        </p>
                        <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          Cuota {purchase.paidInstallments + 1} de {purchase.numberOfInstallments}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-amber-500">
                          {formatCurrency(purchase.monthlyPayment)}
                        </p>
                        <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          {purchase.daysRemaining === 0
                            ? 'Hoy'
                            : `En ${purchase.daysRemaining} dias`}
                        </p>
                      </div>
                    </div>
                    <div className={`h-1.5 rounded-full ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-200'}`}>
                      <div
                        className="h-full rounded-full bg-amber-500 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
