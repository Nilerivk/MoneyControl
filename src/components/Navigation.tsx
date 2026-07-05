import React from 'react';
import { useAppStore } from '../store';
import {
  Home, Wallet, CreditCard, BarChart3, FileText, Bell, Settings, Search, Tags, Grid
} from 'lucide-react';

interface NavigationProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentPage, onPageChange }) => {
  const { theme } = useAppStore();

  const navItems = [
    { id: 'home', label: 'Inicio', icon: Home },
    { id: 'accounts', label: 'Cuentas', icon: Wallet },
    { id: 'transactions', label: 'Historial', icon: CreditCard },
    { id: 'financed', label: 'Financiados', icon: BarChart3 },
    { id: 'statistics', label: 'Estadisticas', icon: BarChart3 },
    { id: 'categories', label: 'Categorias', icon: Tags },
    { id: 'notes', label: 'Notas', icon: FileText },
    { id: 'reminders', label: 'Recordatorios', icon: Bell },
    { id: 'settings', label: 'Ajustes', icon: Settings },
  ];

  return (
    <nav className={`
      fixed bottom-0 left-0 right-0
      ${theme === 'dark' ? 'bg-gray-900/95 border-white/10' : 'bg-white/95 border-gray-200'}
      border-t backdrop-blur-lg
      z-50
    `}>
      <div className="max-w-lg mx-auto px-2">
        <div className="flex justify-around items-center py-2">
          {navItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className={`
                  flex flex-col items-center justify-center
                  px-3 py-1.5 rounded-xl
                  transition-all duration-200
                  ${isActive
                    ? theme === 'dark'
                      ? 'text-blue-400'
                      : 'text-blue-500'
                    : theme === 'dark'
                      ? 'text-gray-500 hover:text-gray-300'
                      : 'text-gray-400 hover:text-gray-600'}
                `}
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                <span className={`text-[10px] mt-0.5 font-medium`}>
                  {item.label}
                </span>
              </button>
            );
          })}
          {/* More button */}
          <button
            onClick={() => onPageChange('more')}
            className={`
              flex flex-col items-center justify-center
              px-3 py-1.5 rounded-xl
              transition-all duration-200
              ${['more', 'categories', 'notes', 'reminders', 'settings', 'statistics', 'financed'].includes(currentPage)
                ? theme === 'dark'
                  ? 'text-blue-400'
                  : 'text-blue-500'
                : theme === 'dark'
                  ? 'text-gray-500 hover:text-gray-300'
                  : 'text-gray-400 hover:text-gray-600'}
            `}
          >
            <Grid size={22} />
            <span className={`text-[10px] mt-0.5 font-medium`}>
              Mas
            </span>
          </button>
        </div>
      </div>
    </nav>
  );
};

// Header component with search and menu
interface HeaderProps {
  title: string;
  onSearch?: () => void;
  rightAction?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, onSearch, rightAction }) => {
  const { theme } = useAppStore();

  return (
    <header className={`
      sticky top-0 z-40
      ${theme === 'dark' ? 'bg-gray-900/95' : 'bg-white/95'}
      backdrop-blur-lg
      border-b ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'}
    `}>
      <div className="px-4 py-3 flex items-center justify-between">
        <h1 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          {title}
        </h1>
        <div className="flex items-center gap-2">
          {onSearch && (
            <button
              onClick={onSearch}
              className={`p-2 rounded-xl transition-colors ${
                theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-100'
              }`}
            >
              <Search size={20} />
            </button>
          )}
          {rightAction}
        </div>
      </div>
    </header>
  );
};

// Bottom sheet navigation for more options
interface MoreMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onPageChange: (page: string) => void;
}

export const MoreMenu: React.FC<MoreMenuProps> = ({ isOpen, onClose, onPageChange }) => {
  const { theme } = useAppStore();

  const menuItems = [
    { id: 'categories', label: 'Categorias', icon: Tags },
    { id: 'notes', label: 'Notas', icon: FileText },
    { id: 'reminders', label: 'Recordatorios', icon: Bell },
    { id: 'settings', label: 'Ajustes', icon: Settings },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className={`
          absolute bottom-0 left-0 right-0
          ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}
          rounded-t-3xl
          animate-slide-up
        `}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4">
          <div className={`w-10 h-1 rounded-full mx-auto mb-4 ${theme === 'dark' ? 'bg-white/20' : 'bg-gray-200'}`} />
          <div className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onPageChange(item.id);
                    onClose();
                  }}
                  className={`
                    w-full flex items-center gap-4 px-4 py-3 rounded-xl
                    transition-colors
                    ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-100'}
                  `}
                >
                  <Icon size={24} />
                  <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="h-8" />
      </div>
    </div>
  );
};
