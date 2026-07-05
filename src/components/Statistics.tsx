import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { Card, SegmentedControl } from './ui';
import {
  format, parseISO, startOfMonth, endOfMonth, startOfYear, endOfYear, eachMonthOfInterval,
  isWithinInterval, subMonths
} from 'date-fns';
import {
  TrendingUp, TrendingDown, DollarSign, CreditCard,
  Calendar, PieChart as PieChartIcon, BarChart as BarChartIcon
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, Legend
} from 'recharts';

export const Statistics: React.FC = () => {
  const { transactions, accounts, financedPurchases, categories, theme } = useAppStore();
  const [period, setPeriod] = useState<'month' | 'year'>('month');

  const today = new Date();
  const currentMonth = startOfMonth(today);
  const currentYear = startOfYear(today);

  // Calculate date range based on period
  const dateRange = useMemo(() => {
    if (period === 'month') {
      return { start: currentMonth, end: endOfMonth(currentMonth) };
    }
    return { start: currentYear, end: endOfYear(currentYear) };
  }, [period, currentMonth, currentYear]);

  // Filter transactions for period
  const periodTransactions = useMemo(() => {
    return transactions.filter(t => {
      const date = parseISO(t.date);
      return isWithinInterval(date, dateRange);
    });
  }, [transactions, dateRange]);

  // Monthly summary
  const monthlyBalance = useMemo(() => {
    const income = periodTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const expenses = periodTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    return { income, expenses, balance: income - expenses };
  }, [periodTransactions]);

  // Yearly summary
  const yearlyBalance = useMemo(() => {
    const yearTransactions = transactions.filter(t => {
      const date = parseISO(t.date);
      return isWithinInterval(date, { start: currentYear, end: endOfYear(currentYear) });
    });

    const income = yearTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const expenses = yearTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    return { income, expenses, balance: income - expenses };
  }, [transactions, currentYear]);

  // Average spending
  const averageMonthlySpending = useMemo(() => {
    const months = eachMonthOfInterval({ start: subMonths(currentMonth, 11), end: currentMonth });
    const spendingByMonth = months.map(month => {
      const monthTransactions = transactions.filter(t => {
        const date = parseISO(t.date);
        return t.type === 'expense' && isWithinInterval(date, { start: startOfMonth(month), end: endOfMonth(month) });
      });
      return monthTransactions.reduce((sum, t) => sum + t.amount, 0);
    });
    return spendingByMonth.reduce((sum, s) => sum + s, 0) / months.length;
  }, [transactions, currentMonth]);

  // Average income
  const averageMonthlyIncome = useMemo(() => {
    const months = eachMonthOfInterval({ start: subMonths(currentMonth, 11), end: currentMonth });
    const incomeByMonth = months.map(month => {
      const monthTransactions = transactions.filter(t => {
        const date = parseISO(t.date);
        return t.type === 'income' && isWithinInterval(date, { start: startOfMonth(month), end: endOfMonth(month) });
      });
      return monthTransactions.reduce((sum, t) => sum + t.amount, 0);
    });
    return incomeByMonth.reduce((sum, i) => sum + i, 0) / months.length;
  }, [transactions, currentMonth]);

  // Most expensive category
  const mostExpensiveCategory = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    periodTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        if (!categoryTotals[t.categoryId]) categoryTotals[t.categoryId] = 0;
        categoryTotals[t.categoryId] += t.amount;
      });

    const sortedCategories = Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a);

    if (sortedCategories.length === 0) return null;

    const [categoryId, total] = sortedCategories[0];
    const category = categories.find(c => c.id === categoryId);
    return { category, total };
  }, [periodTransactions, categories]);

  // Total financed debt
  const financedDebt = useMemo(() => {
    return financedPurchases
      .filter(p => p.paidInstallments < p.numberOfInstallments)
      .reduce((sum, p) => sum + (p.originalPrice - (p.monthlyPayment * p.paidInstallments)), 0);
  }, [financedPurchases]);

  // Chart data - Monthly evolution
  const monthlyEvolutionData = useMemo(() => {
    const months = eachMonthOfInterval(
      period === 'month'
        ? { start: subMonths(currentMonth, 5), end: currentMonth }
        : { start: currentYear, end: endOfMonth(currentYear) }
    );

    return months.map(month => {
      const monthKey = format(month, 'yyyy-MM');
      const monthTrans = transactions.filter(t => {
        const date = parseISO(t.date);
        return format(date, 'yyyy-MM') === monthKey;
      });

      const income = monthTrans
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      const expenses = monthTrans
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        name: format(month, period === 'month' ? 'MMM' : 'MMM'),
        Ingresos: income,
        Gastos: expenses,
        balance: income - expenses,
      };
    });
  }, [transactions, period, currentMonth, currentYear]);

  // Chart data - Expenses by category
  const expensesByCategoryData = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    const total = periodTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => {
        if (!categoryTotals[t.categoryId]) categoryTotals[t.categoryId] = 0;
        categoryTotals[t.categoryId] += t.amount;
        return sum + t.amount;
      }, 0);

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
      .sort((a, b) => b.value - a.value);
  }, [periodTransactions, categories]);

  // Chart data - Account balances
  const accountBalancesData = useMemo(() => {
    return accounts.map(account => ({
      name: account.name,
      balance: account.balance,
      color: account.color,
    }));
  }, [accounts]);

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €`;
  };

  const stats = [
    {
      title: 'Balance mensual',
      value: formatCurrency(monthlyBalance.balance),
      icon: monthlyBalance.balance >= 0 ? TrendingUp : TrendingDown,
      color: monthlyBalance.balance >= 0 ? 'text-green-500' : 'text-red-500',
      bgColor: monthlyBalance.balance >= 0 ? 'bg-green-500/20' : 'bg-red-500/20',
    },
    {
      title: 'Balance anual',
      value: formatCurrency(yearlyBalance.balance),
      icon: yearlyBalance.balance >= 0 ? TrendingUp : TrendingDown,
      color: yearlyBalance.balance >= 0 ? 'text-green-500' : 'text-red-500',
      bgColor: yearlyBalance.balance >= 0 ? 'bg-green-500/20' : 'bg-red-500/20',
    },
    {
      title: 'Gasto promedio mensual',
      value: formatCurrency(averageMonthlySpending),
      icon: TrendingDown,
      color: 'text-red-500',
      bgColor: 'bg-red-500/20',
    },
    {
      title: 'Ingreso promedio mensual',
      value: formatCurrency(averageMonthlyIncome),
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-500/20',
    },
    {
      title: 'Deuda financiada',
      value: formatCurrency(financedDebt),
      icon: CreditCard,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/20',
    },
    {
      title: 'Balance total',
      value: formatCurrency(accounts.reduce((sum, a) => sum + a.balance, 0)),
      icon: DollarSign,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/20',
    },
  ];

  return (
    <div className="pb-8 px-4 pt-4 space-y-6">
      {/* Period selector */}
      <SegmentedControl
        options={[
          { value: 'month', label: 'Este mes' },
          { value: 'year', label: 'Este año' },
        ]}
        value={period}
        onChange={(v) => setPeriod(v as 'month' | 'year')}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${stat.bgColor}`}>
                  <Icon size={20} className={stat.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs truncate ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {stat.title}
                  </p>
                  <p className={`text-lg font-bold ${stat.color}`}>
                    {stat.value}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Most expensive category */}
      {mostExpensiveCategory && (
        <Card className={theme === 'dark' ? 'bg-gradient-to-r from-red-500/20 to-orange-500/20' : 'bg-gradient-to-r from-red-50 to-orange-50'}>
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${mostExpensiveCategory.category?.color || '#64748b'}30` }}
            >
              <PieChartIcon
                size={24}
                style={{ color: mostExpensiveCategory.category?.color || '#64748b' }}
              />
            </div>
            <div className="flex-1">
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Categoria con mas gastos
              </p>
              <p className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {mostExpensiveCategory.category?.name || 'Sin categoria'}
              </p>
              <p className="text-red-500 font-semibold">
                {formatCurrency(mostExpensiveCategory.total)}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Monthly Evolution Chart */}
      {monthlyEvolutionData.length > 0 && (
        <Card>
          <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            <Calendar size={18} className="inline mr-2" />
            Evolucion {period === 'month' ? 'mensual' : 'anual'}
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyEvolutionData}>
                <defs>
                  <linearGradient id="colorIngresosStat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorGastosStat" x1="0" y1="0" x2="0" y2="1">
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
                <Legend />
                <Area type="monotone" dataKey="Ingresos" stroke="#22c55e" fillOpacity={1} fill="url(#colorIngresosStat)" />
                <Area type="monotone" dataKey="Gastos" stroke="#ef4444" fillOpacity={1} fill="url(#colorGastosStat)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Expenses by Category Pie Chart */}
      {expensesByCategoryData.length > 0 && (
        <Card>
          <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            <PieChartIcon size={18} className="inline mr-2" />
            Gastos por categoria
          </h3>
          <div className="flex">
            <div className="w-40 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expensesByCategoryData}
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {expensesByCategoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme === 'dark' ? '#1f2937' : '#fff',
                      border: 'none',
                      borderRadius: '8px',
                    }}
                    formatter={(value) => formatCurrency(value as number)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 ml-4 space-y-2 overflow-auto max-h-40">
              {expensesByCategoryData.slice(0, 6).map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className={`text-sm truncate ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      {item.name}
                    </span>
                  </div>
                  <span className={`text-sm font-medium ml-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {item.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Account Balances Bar Chart */}
      {accountBalancesData.length > 0 && (
        <Card>
          <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            <BarChartIcon size={18} className="inline mr-2" />
            Balance por cuenta
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={accountBalancesData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: theme === 'dark' ? '#9ca3af' : '#6b7280', fontSize: 12 }}
                  width={80}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === 'dark' ? '#1f2937' : '#fff',
                    border: 'none',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => formatCurrency(value as number)}
                />
                <Bar dataKey="balance" radius={[0, 4, 4, 0]}>
                  {accountBalancesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Balance Evolution Line Chart */}
      <Card>
        <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          <TrendingUp size={18} className="inline mr-2" />
          Evolucion del balance
        </h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyEvolutionData}>
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
                }}
                formatter={(value) => formatCurrency(value as number)}
              />
              <Line
                type="monotone"
                dataKey="balance"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: '#3b82f6', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};
