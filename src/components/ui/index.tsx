import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../store';
import {
  X, AlertTriangle, Info, CheckCircle, AlertCircle, Edit, Trash2
} from 'lucide-react';
import * as Icons from 'lucide-react';

// Card Component
interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  blur?: boolean;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick, blur = false, style }) => {
  const { theme } = useAppStore();

  return (
    <div
      className={`
        ${blur ? 'backdrop-blur-xl' : ''}
        ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''}
        rounded-2xl p-4 transition-all duration-300
        ${theme === 'dark'
          ? 'bg-white/10 border border-white/10'
          : 'bg-white shadow-sm border border-gray-100'}
        ${className}
      `}
      onClick={onClick}
      style={style}
    >
      {children}
    </div>
  );
};

// Button Component
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  onClick,
  className = '',
}) => {
  const { theme } = useAppStore();

  const baseClasses = 'font-medium rounded-xl transition-all duration-200 active:scale-95 flex items-center justify-center gap-2';

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-6 py-4 text-lg',
  };

  const variantClasses = {
    primary: theme === 'dark'
      ? 'bg-blue-500 hover:bg-blue-600 text-white'
      : 'bg-blue-500 hover:bg-blue-600 text-white',
    secondary: theme === 'dark'
      ? 'bg-white/10 hover:bg-white/20 text-white'
      : 'bg-gray-100 hover:bg-gray-200 text-gray-800',
    danger: 'bg-red-500 hover:bg-red-600 text-white',
    ghost: theme === 'dark'
      ? 'bg-transparent hover:bg-white/10 text-white'
      : 'bg-transparent hover:bg-gray-100 text-gray-800',
  };

  return (
    <button
      className={`
        ${baseClasses}
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading && (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
};

// Modal Component
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  showClose?: boolean;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, showClose = true }) => {
  const { theme } = useAppStore();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />
      <div
        ref={modalRef}
        className={`
          relative w-full sm:max-w-lg sm:mx-4
          ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}
          rounded-t-3xl sm:rounded-2xl
          shadow-2xl
          transform transition-transform duration-300
          animate-slide-up sm:animate-scale-in
          max-h-[90vh] overflow-hidden
          flex flex-col
        `}
      >
        <div className={`
          flex items-center justify-between p-4 border-b
          ${theme === 'dark' ? 'border-white/10' : 'border-gray-100'}
        `}>
          <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {title}
          </h2>
          {showClose && (
            <button
              onClick={onClose}
              className={`
                p-2 rounded-full transition-colors
                ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-100'}
              `}
            >
              <X size={20} />
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {children}
        </div>
      </div>
    </div>
  );
};

// Input Component
interface InputProps {
  label?: string;
  type?: 'text' | 'number' | 'date' | 'time' | 'textarea';
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  icon?: React.ReactNode;
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  icon,
  min,
  max,
  step,
  required = false,
}) => {
  const { theme } = useAppStore();

  return (
    <div className="space-y-2">
      {label && (
        <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className={`absolute left-3 top-1/2 -translate-y-1/2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            {icon}
          </div>
        )}
        {type === 'textarea' ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`
              w-full px-4 py-3 rounded-xl resize-none
              ${icon ? 'pl-10' : ''}
              ${theme === 'dark'
                ? 'bg-white/10 border-white/10 text-white placeholder-gray-400'
                : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}
              border focus:outline-none focus:ring-2 focus:ring-blue-500/50
              transition-all duration-200
              ${error ? 'border-red-500' : ''}
            `}
            rows={3}
          />
        ) : (
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            min={min}
            max={max}
            step={step}
            className={`
              w-full px-4 py-3 rounded-xl
              ${icon ? 'pl-10' : ''}
              ${theme === 'dark'
                ? 'bg-white/10 border-white/10 text-white placeholder-gray-400'
                : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}
              border focus:outline-none focus:ring-2 focus:ring-blue-500/50
              transition-all duration-200
              ${error ? 'border-red-500' : ''}
            `}
          />
        )}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
};

// Select Component
interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface SelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  required?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder = 'Seleccionar...',
  error,
  required = false,
}) => {
  const { theme } = useAppStore();

  return (
    <div className="space-y-2">
      {label && (
        <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`
          w-full px-4 py-3 rounded-xl appearance-none
          ${theme === 'dark'
            ? 'bg-white/10 border-white/10 text-white'
            : 'bg-gray-50 border-gray-200 text-gray-900'}
          border focus:outline-none focus:ring-2 focus:ring-blue-500/50
          transition-all duration-200
          ${error ? 'border-red-500' : ''}
        `}
      >
        <option value="" disabled>{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
};

// Color Picker Component
interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  colors?: string[];
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  value,
  onChange,
  colors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e', '#64748b', '#78716c', '#1e293b'],
}) => {
  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((color) => (
        <button
          key={color}
          onClick={() => onChange(color)}
          className={`
            w-8 h-8 rounded-full transition-transform duration-200
            ${value === color ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : 'hover:scale-105'}
          `}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
};

// Icon Picker Component
interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
  icons?: string[];
}

export const IconPicker: React.FC<IconPickerProps> = ({
  value,
  onChange,
  icons = ['Wallet', 'Landmark', 'Building2', 'CreditCard', 'PiggyBank', 'Smartphone', 'Globe', 'DollarSign', 'Coins', 'Safe', 'Home', 'Car', 'ShoppingCart', 'Gift', 'Briefcase'],
}) => {
  const { theme } = useAppStore();

  return (
    <div className="grid grid-cols-5 gap-2">
      {icons.map((iconName) => {
        const IconComponent = (Icons as unknown as Record<string, React.FC<{ size?: number }>>)[iconName] || Icons.Wallet;
        return (
          <button
            key={iconName}
            onClick={() => onChange(iconName)}
            className={`
              p-3 rounded-xl transition-all duration-200
              ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-100'}
              ${value === iconName
                ? 'ring-2 ring-blue-500'
                : 'hover:ring-1 hover:ring-gray-300'}
            `}
          >
            <IconComponent size={24} />
          </button>
        );
      })}
    </div>
  );
};

// Toggle/Switch Component
interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
}

export const Toggle: React.FC<ToggleProps> = ({ label, checked, onChange, description }) => {
  const { theme } = useAppStore();

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{label}</p>
        {description && (
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{description}</p>
        )}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`
          relative w-12 h-7 rounded-full transition-colors duration-200
          ${checked ? 'bg-blue-500' : theme === 'dark' ? 'bg-white/20' : 'bg-gray-300'}
        `}
      >
        <div
          className={`
            absolute top-0.5 w-6 h-6 rounded-full bg-white shadow
            transition-transform duration-200
            ${checked ? 'translate-x-5' : 'translate-x-0.5'}
          `}
        />
      </button>
    </div>
  );
};

// Segmented Control Component
interface SegmentedControlProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({ options, value, onChange }) => {
  const { theme } = useAppStore();

  return (
    <div className={`
      flex p-1 rounded-xl
      ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-100'}
    `}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`
            flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200
            ${value === option.value
              ? theme === 'dark'
                ? 'bg-white text-gray-900'
                : 'bg-white shadow text-gray-900'
              : theme === 'dark'
                ? 'text-gray-400 hover:text-white'
                : 'text-gray-500 hover:text-gray-900'}
          `}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

// Badge Component
interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ children, color = 'blue', size = 'sm' }) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  return (
    <span
      className={`
        inline-flex items-center rounded-full font-medium
        ${sizeClasses[size]}
      `}
      style={{ backgroundColor: `${color}20`, color }}
    >
      {children}
    </span>
  );
};

// Progress Bar Component
interface ProgressBarProps {
  value: number; // 0-100
  color?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  color = '#3b82f6',
  showLabel = true,
  size = 'md',
}) => {
  const { theme } = useAppStore();

  const heightClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between mb-1">
          <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            {value.toFixed(0)}%
          </span>
        </div>
      )}
      <div className={`
        w-full rounded-full overflow-hidden
        ${heightClasses[size]}
        ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-200'}
      `}>
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${Math.min(100, Math.max(0, value))}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
};

// Empty State Component
interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => {
  const { theme } = useAppStore();

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className={`
        p-4 rounded-full mb-4
        ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-100'}
      `}>
        <div className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
          {icon}
        </div>
      </div>
      <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
        {title}
      </h3>
      {description && (
        <p className={`text-sm mb-4 max-w-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
          {description}
        </p>
      )}
      {action}
    </div>
  );
};

// Floating Action Button
interface FABProps {
  icon: React.ReactNode;
  onClick: () => void;
  label?: string;
}

export const FAB: React.FC<FABProps> = ({ icon, onClick, label }) => {
  return (
    <button
      onClick={onClick}
      className={`
        fixed bottom-24 right-4 sm:bottom-8 sm:right-8
        flex items-center gap-2
        px-4 py-4 rounded-full
        shadow-lg shadow-blue-500/30
        bg-blue-500 hover:bg-blue-600
        text-white font-medium
        transition-all duration-300
        active:scale-95
        z-40
        ${label ? 'pr-6' : ''}
      `}
    >
      {icon}
      {label && <span>{label}</span>}
    </button>
  );
};

// Toast Component
interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'info', onClose }) => {
  const { theme } = useAppStore();

  const icons = {
    success: <CheckCircle className="text-green-500" size={20} />,
    error: <AlertCircle className="text-red-500" size={20} />,
    warning: <AlertTriangle className="text-yellow-500" size={20} />,
    info: <Info className="text-blue-500" size={20} />,
  };

  const colors = {
    success: 'border-green-500/50',
    error: 'border-red-500/50',
    warning: 'border-yellow-500/50',
    info: 'border-blue-500/50',
  };

  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`
      fixed bottom-28 left-4 right-4 sm:left-auto sm:right-8 sm:w-auto sm:min-w-80
      flex items-center gap-3 px-4 py-3 rounded-xl
      ${theme === 'dark' ? 'bg-gray-800/90' : 'bg-white/90'}
      backdrop-blur-lg border ${colors[type]}
      shadow-lg animate-slide-up
      z-50
    `}>
      {icons[type]}
      <p className={`flex-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
        {message}
      </p>
      <button onClick={onClose} className={`p-1 rounded ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
        <X size={16} />
      </button>
    </div>
  );
};

// Swipe Action Component
interface SwipeActionProps {
  children: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const SwipeAction: React.FC<SwipeActionProps> = ({ children, onEdit, onDelete }) => {
  const { theme } = useAppStore();
  const [offset, setOffset] = useState(0);
  const [startX, setStartX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const diff = e.touches[0].clientX - startX;
    setOffset(Math.max(-120, Math.min(0, diff)));
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (offset < -60) {
      setOffset(-120);
    } else {
      setOffset(0);
    }
  };

  return (
    <div className="relative overflow-hidden">
      <div
        className={`
          absolute right-0 top-0 bottom-0 flex
          ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}
        `}
        style={{ width: 120 }}
      >
        {onEdit && (
          <button
            onClick={() => { onEdit(); setOffset(0); }}
            className="flex-1 flex items-center justify-center bg-blue-500 text-white"
          >
            <Edit size={20} />
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => { onDelete(); setOffset(0); }}
            className="flex-1 flex items-center justify-center bg-red-500 text-white"
          >
            <Trash2 size={20} />
          </button>
        )}
      </div>
      <div
        className={`
          relative transition-transform duration-200
          ${isDragging ? '' : 'transition-transform'}
        `}
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
};

// Date Picker Component
interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  label?: string;
  min?: string;
  max?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, label, min, max }) => {
  const { theme } = useAppStore();

  return (
    <div className="space-y-2">
      {label && (
        <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
          {label}
        </label>
      )}
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        max={max}
        className={`
          w-full px-4 py-3 rounded-xl
          ${theme === 'dark'
            ? 'bg-white/10 border-white/10 text-white'
            : 'bg-gray-50 border-gray-200 text-gray-900'}
          border focus:outline-none focus:ring-2 focus:ring-blue-500/50
          transition-all duration-200
        `}
      />
    </div>
  );
};

// Confirmation Dialog
interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
}) => {
  const { theme } = useAppStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className={`
        relative w-full max-w-sm p-6 rounded-2xl
        ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}
        shadow-2xl
        animate-scale-in
      `}>
        <div className="text-center mb-4">
          <div className={`
            inline-flex p-3 rounded-full mb-4
            ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-100'}
          `}>
            <AlertTriangle className={variant === 'danger' ? 'text-red-500' : 'text-yellow-500'} size={24} />
          </div>
          <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {title}
          </h3>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            {message}
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            fullWidth
            onClick={onClose}
          >
            {cancelText}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            fullWidth
            onClick={() => { onConfirm(); onClose(); }}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export * as Icons from 'lucide-react';
