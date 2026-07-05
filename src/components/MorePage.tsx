import React from 'react';
import { useAppStore } from '../store';
import { Card } from './ui';
import {
  Tags, FileText, Bell, Settings, BarChart3, CreditCard, PiggyBank, TrendingUp
} from 'lucide-react';

interface MorePageProps {
  onPageChange: (page: string) => void;
}

export const MorePage: React.FC<MorePageProps> = ({ onPageChange }) => {
  const { theme, accounts, financedPurchases, notes, reminders } = useAppStore();

  const menuItems = [
    {
      id: 'statistics',
      label: 'Estadisticas',
      description: 'Analisis de gastos e ingresos',
      icon: BarChart3,
      color: '#3b82f6',
      count: null,
    },
    {
      id: 'categories',
      label: 'Categorias',
      description: 'Gestiona tus categorias',
      icon: Tags,
      color: '#8b5cf6',
      count: null,
    },
    {
      id: 'financed',
      label: 'Financiados',
      description: 'Compras a plazos',
      icon: CreditCard,
      color: '#f59e0b',
      count: financedPurchases.filter(p => p.paidInstallments < p.numberOfInstallments).length || null,
    },
    {
      id: 'notes',
      label: 'Notas',
      description: 'Tus notas personales',
      icon: FileText,
      color: '#eab308',
      count: notes.length || null,
    },
    {
      id: 'reminders',
      label: 'Recordatorios',
      description: 'Eventos y alertas',
      icon: Bell,
      color: '#ec4899',
      count: reminders.filter(r => !r.completed).length || null,
    },
    {
      id: 'settings',
      label: 'Ajustes',
      description: 'Configuracion de la app',
      icon: Settings,
      color: '#64748b',
      count: null,
    },
  ];

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €`;
  };

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
  const totalDebt = financedPurchases
    .filter(p => p.paidInstallments < p.numberOfInstallments)
    .reduce((sum, p) => sum + (p.originalPrice - (p.monthlyPayment * p.paidInstallments)), 0);

  return (
    <div className="pb-8">
      {/* Summary Cards */}
      <div className="px-4 pt-4 pb-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Card className={theme === 'dark' ? 'bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30' : 'bg-gradient-to-br from-green-50 to-green-100 border-green-200'}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500 text-white">
                <TrendingUp size={18} />
              </div>
              <div>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Balance</p>
                <p className={`text-lg font-bold text-green-500`}>{formatCurrency(totalBalance)}</p>
              </div>
            </div>
          </Card>

          <Card className={theme === 'dark' ? 'bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-amber-500/30' : 'bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200'}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500 text-white">
                <PiggyBank size={18} />
              </div>
              <div>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Deuda total</p>
                <p className={`text-lg font-bold text-amber-500`}>{formatCurrency(totalDebt)}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Menu Grid */}
      <div className="px-4">
        <h2 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Secciones
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className="cursor-pointer hover:scale-[1.02] transition-transform"
              >
                <div className="flex flex-col items-center text-center py-2">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                    style={{ backgroundColor: `${item.color}20` }}
                  >
                    <Icon size={28} style={{ color: item.color }} />
                  </div>
                  <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {item.label}
                  </p>
                  <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {item.description}
                  </p>
                  {item.count !== null && item.count > 0 && (
                    <div
                      className="mt-2 px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ backgroundColor: `${item.color}30`, color: item.color }}
                    >
                      {item.count}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};
