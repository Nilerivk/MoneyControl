import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Card, Modal, Input, Button, ColorPicker, IconPicker, SegmentedControl, EmptyState, ConfirmDialog, Toast } from './ui';
import { Account, ACCOUNT_ICONS, COLOR_OPTIONS, AccountType } from '../types';
import * as Icons from 'lucide-react';
import { Wallet, Plus, Landmark, Edit, Trash2 } from 'lucide-react';

const getIconComponent = (iconName: string) => {
  const IconComponent = (Icons as unknown as Record<string, React.FC<{ size?: number; className?: string; color?: string }>>)[iconName];
  return IconComponent || Wallet;
};

export const Accounts: React.FC = () => {
  const { accounts, addAccount, updateAccount, deleteAccount, theme, getCashTotal, getBankTotal, getTotalBalance } = useAppStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [icon, setIcon] = useState(ACCOUNT_ICONS[0]);
  const [type, setType] = useState<AccountType>('bank');

  const cashTotal = getCashTotal();
  const bankTotal = getBankTotal();
  const totalBalance = getTotalBalance();

  const resetForm = () => {
    setName('');
    setBalance('');
    setColor(COLOR_OPTIONS[0]);
    setIcon(ACCOUNT_ICONS[0]);
    setType('bank');
    setEditingAccount(null);
  };

  const handleOpenModal = (account?: Account) => {
    if (account) {
      setEditingAccount(account);
      setName(account.name);
      setBalance(account.balance.toString());
      setColor(account.color);
      setIcon(account.icon);
      setType(account.type);
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleSave = async () => {
    if (!name.trim() || !balance) {
      setToast({ message: 'Por favor completa todos los campos', type: 'error' });
      return;
    }

    const balanceNum = parseFloat(balance);
    if (isNaN(balanceNum)) {
      setToast({ message: 'El saldo debe ser un numero valido', type: 'error' });
      return;
    }

    if (editingAccount) {
      // Si la cuenta es (o pasa a ser) de tipo 'both', hay que mantener
      // cashBalance y bankBalance coherentes con el nuevo saldo total,
      // en vez de dejarlos desincronizados.
      let cashBalance = editingAccount.cashBalance;
      let bankBalance = editingAccount.bankBalance;
      if (type === 'both') {
        if (editingAccount.type === 'both') {
          // Ya era 'both': el ajuste manual del saldo se refleja en la
          // parte de banco, dejando el efectivo tal cual estaba.
          const delta = balanceNum - editingAccount.balance;
          cashBalance = editingAccount.cashBalance ?? 0;
          bankBalance = (editingAccount.bankBalance ?? 0) + delta;
        } else {
          // Antes era 'cash' o 'bank' pura: arrancamos el reparto con
          // todo el saldo en banco y el efectivo a cero.
          cashBalance = 0;
          bankBalance = balanceNum;
        }
      }

      await updateAccount(editingAccount.id, {
        name: name.trim(),
        balance: balanceNum,
        cashBalance,
        bankBalance,
        color,
        icon,
        type,
      });
      setToast({ message: 'Cuenta actualizada correctamente', type: 'success' });
    } else {
      await addAccount({
        name: name.trim(),
        balance: balanceNum,
        cashBalance: type === 'both' ? 0 : undefined,
        bankBalance: type === 'both' ? balanceNum : undefined,
        color,
        icon,
        type,
      });
      setToast({ message: 'Cuenta creada correctamente', type: 'success' });
    }

    handleCloseModal();
  };

  const handleDelete = async (id: string) => {
    await deleteAccount(id);
    setDeleteConfirm(null);
    setToast({ message: 'Cuenta eliminada', type: 'success' });
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
  };

  return (
    <div className="pb-8">
      {/* Summary Cards */}
      <div className="px-4 pt-4 pb-4 space-y-4">
        {/* Total */}
        <Card className={theme === 'dark'
          ? 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-blue-500/30'
          : 'bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200'}
        >
          <div className="text-center py-4">
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
              Balance Total
            </p>
            <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {formatCurrency(totalBalance)}
            </p>
          </div>
        </Card>

        {/* Cash and Bank totals */}
        <div className="grid grid-cols-2 gap-4">
          <Card className={theme === 'dark'
            ? 'bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30'
            : 'bg-gradient-to-br from-green-50 to-green-100 border-green-200'}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-green-500 text-white">
                <Wallet size={20} />
              </div>
              <div>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Total Efectivo
                </p>
                <p className={`text-lg font-bold text-green-500`}>
                  {formatCurrency(cashTotal)}
                </p>
              </div>
            </div>
          </Card>

          <Card className={theme === 'dark'
            ? 'bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30'
            : 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200'}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500 text-white">
                <Landmark size={20} />
              </div>
              <div>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Total Bancos
                </p>
                <p className={`text-lg font-bold text-blue-500`}>
                  {formatCurrency(bankTotal)}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Accounts List */}
      <div className="px-4">
        <h2 className={`text-lg font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Mis Cuentas
        </h2>

        {accounts.length === 0 ? (
          <EmptyState
            icon={<Wallet size={48} />}
            title="Sin cuentas"
            description="Crea tu primera cuenta para empezar a gestionar tus finanzas"
            action={
              <Button onClick={() => handleOpenModal()}>
                <Plus size={18} />
                Crear cuenta
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {accounts.map(account => {
              const IconComponent = getIconComponent(account.icon);
              return (
                <Card
                  key={account.id}
                  onClick={() => handleOpenModal(account)}
                  className={`cursor-pointer hover:scale-[1.02] transition-transform ${
                    account.isDefault ? 'border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${account.color}20` }}
                      >
                        <IconComponent
                          size={24}
                          color={account.color}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {account.name}
                          </p>
                          {account.isDefault && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-500">
                              Principal
                            </span>
                          )}
                        </div>
                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          {account.type === 'cash' ? 'Efectivo' : account.type === 'bank' ? 'Cuenta bancaria' : 'Efectivo y Banco'}
                          {account.type === 'both' && (
                            <span>
                              {' '}· 💵 {formatCurrency(account.cashBalance ?? 0)} · 🏦 {formatCurrency(account.bankBalance ?? 0)}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <p className={`text-lg font-bold ${
                        account.balance >= 0
                          ? 'text-green-500'
                          : 'text-red-500'
                      }`}>
                        {formatCurrency(account.balance)}
                      </p>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenModal(account);
                          }}
                          className={`p-2 rounded-lg transition-colors ${
                            theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                          }`}
                        >
                          <Edit size={16} />
                        </button>
                        {!account.isDefault && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm(account.id);
                            }}
                            className={`p-2 rounded-lg transition-colors text-red-500 ${
                              theme === 'dark' ? 'hover:bg-red-500/20' : 'hover:bg-red-50'
                            }`}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Add Account Button */}
        <Button
          fullWidth
          onClick={() => handleOpenModal()}
          className="mt-6"
        >
          <Plus size={18} />
          Nueva cuenta
        </Button>
      </div>

      {/* Account Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingAccount ? 'Editar cuenta' : 'Nueva cuenta'}
      >
        <div className="space-y-4">
          <Input
            label="Nombre de la cuenta"
            value={name}
            onChange={setName}
            placeholder="Ej: Santander, BBVA, Cash..."
            required
          />

          <Input
            label="Saldo actual"
            type="number"
            value={balance}
            onChange={setBalance}
            placeholder="0.00"
            min={-999999}
            max={999999999}
            step={0.01}
            required
          />

          <div className="space-y-2">
            <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Tipo de cuenta
            </label>
            <SegmentedControl
              options={[
                { value: 'bank', label: 'Banco' },
                { value: 'cash', label: 'Efectivo' },
                { value: 'both', label: 'Ambos' },
              ]}
              value={type}
              onChange={(v) => setType(v as AccountType)}
            />
          </div>

          <div className="space-y-2">
            <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Icono
            </label>
            <IconPicker value={icon} onChange={setIcon} />
          </div>

          <div className="space-y-2">
            <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Color
            </label>
            <ColorPicker value={color} onChange={setColor} />
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="secondary" fullWidth onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button fullWidth onClick={handleSave}>
              {editingAccount ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        title="Eliminar cuenta"
        message="¿Estas seguro de que quieres eliminar esta cuenta? Esta accion no se puede deshacer."
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
