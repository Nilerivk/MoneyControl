import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { Card, Modal, Input, Button, Select, DatePicker, EmptyState, ConfirmDialog, Toast, ProgressBar } from './ui';
import { FinancedPurchase } from '../types';
import {
  Plus, CreditCard, Calendar, Edit, Trash2, CheckCircle
} from 'lucide-react';
import { format, parseISO, addMonths, differenceInDays, startOfDay } from 'date-fns';

export const FinancedPurchases: React.FC = () => {
  const {
    financedPurchases, accounts,
    addFinancedPurchase, updateFinancedPurchase, deleteFinancedPurchase, theme
  } = useAppStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<FinancedPurchase | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [monthlyPayment, setMonthlyPayment] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [chargeDay, setChargeDay] = useState('1');
  const [numberOfInstallments, setNumberOfInstallments] = useState('1');
  const [accountId, setAccountId] = useState('');
  const [notes, setNotes] = useState('');

  const today = startOfDay(new Date());

  // Process financed purchases with calculated data
  const processedPurchases = useMemo(() => {
    return financedPurchases.map(purchase => {
      const startDateParsed = parseISO(purchase.startDate);
      const remainingInstallments = purchase.numberOfInstallments - purchase.paidInstallments;
      const remainingAmount = purchase.originalPrice - (purchase.monthlyPayment * purchase.paidInstallments);
      const totalPaid = purchase.monthlyPayment * purchase.paidInstallments;
      const progress = (purchase.paidInstallments / purchase.numberOfInstallments) * 100;

      // Calculate next payment date
      let nextPaymentDate = new Date(startDateParsed);
      nextPaymentDate.setDate(purchase.chargeDay);
      nextPaymentDate = addMonths(nextPaymentDate, purchase.paidInstallments);

      const daysRemaining = differenceInDays(nextPaymentDate, today);
      const isCompleted = purchase.paidInstallments >= purchase.numberOfInstallments;
      const isOverdue = daysRemaining < 0 && !isCompleted;

      return {
        ...purchase,
        startDateParsed,
        remainingInstallments,
        remainingAmount,
        totalPaid,
        progress,
        nextPaymentDate,
        daysRemaining,
        isCompleted,
        isOverdue,
        account: accounts.find(a => a.id === purchase.accountId),
      };
    });
  }, [financedPurchases, accounts]);

  // Separate active and completed purchases
  const activePurchases = processedPurchases
    .filter(p => !p.isCompleted)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  const completedPurchases = processedPurchases
    .filter(p => p.isCompleted)
    .sort((a, b) => b.paidInstallments - a.paidInstallments);

  // Calculate total financed debt
  const totalFinancedDebt = useMemo(() => {
    return activePurchases.reduce((sum, p) => sum + p.remainingAmount, 0);
  }, [activePurchases]);

  // Calculate total monthly payments
  const totalMonthlyPayments = useMemo(() => {
    return activePurchases.reduce((sum, p) => sum + p.monthlyPayment, 0);
  }, [activePurchases]);

  const resetForm = () => {
    setName('');
    setOriginalPrice('');
    setMonthlyPayment('');
    setStartDate(format(new Date(), 'yyyy-MM-dd'));
    setChargeDay('1');
    setNumberOfInstallments('1');
    setAccountId('');
    setNotes('');
    setEditingPurchase(null);
  };

  const handleOpenModal = (purchase?: FinancedPurchase) => {
    if (purchase) {
      setEditingPurchase(purchase);
      setName(purchase.name);
      setOriginalPrice(purchase.originalPrice.toString());
      setMonthlyPayment(purchase.monthlyPayment.toString());
      setStartDate(purchase.startDate);
      setChargeDay(purchase.chargeDay.toString());
      setNumberOfInstallments(purchase.numberOfInstallments.toString());
      setAccountId(purchase.accountId);
      setNotes(purchase.notes || '');
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
    if (!name.trim() || !originalPrice || !monthlyPayment || !startDate || !accountId || !numberOfInstallments) {
      setToast({ message: 'Por favor completa todos los campos obligatorios', type: 'error' });
      return;
    }

    const originalPriceNum = parseFloat(originalPrice);
    const monthlyPaymentNum = parseFloat(monthlyPayment);
    const chargeDayNum = parseInt(chargeDay);
    const numberOfInstallmentsNum = parseInt(numberOfInstallments);

    if (isNaN(originalPriceNum) || originalPriceNum <= 0) {
      setToast({ message: 'El precio original debe ser un numero positivo', type: 'error' });
      return;
    }

    if (isNaN(monthlyPaymentNum) || monthlyPaymentNum <= 0) {
      setToast({ message: 'La cuota mensual debe ser un numero positivo', type: 'error' });
      return;
    }

    if (chargeDayNum < 1 || chargeDayNum > 31) {
      setToast({ message: 'El dia de cargo debe estar entre 1 y 31', type: 'error' });
      return;
    }

    if (numberOfInstallmentsNum < 1 || numberOfInstallmentsNum > 32) {
      setToast({ message: 'El numero de cuotas debe estar entre 1 y 32', type: 'error' });
      return;
    }

    if (editingPurchase) {
      await updateFinancedPurchase(editingPurchase.id, {
        name: name.trim(),
        originalPrice: originalPriceNum,
        monthlyPayment: monthlyPaymentNum,
        startDate,
        chargeDay: chargeDayNum,
        numberOfInstallments: numberOfInstallmentsNum,
        accountId,
        notes,
      });
      setToast({ message: 'Compra actualizada correctamente', type: 'success' });
    } else {
      await addFinancedPurchase({
        name: name.trim(),
        originalPrice: originalPriceNum,
        monthlyPayment: monthlyPaymentNum,
        startDate,
        chargeDay: chargeDayNum,
        numberOfInstallments: numberOfInstallmentsNum,
        accountId,
        notes,
      });
      setToast({ message: 'Compra financiada creada correctamente', type: 'success' });
    }

    handleCloseModal();
  };

  const handleDelete = async (id: string) => {
    await deleteFinancedPurchase(id);
    setDeleteConfirm(null);
    setToast({ message: 'Compra eliminada', type: 'success' });
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
  };

  const formatDateShort = (date: Date) => {
    return format(date, 'dd/MM/yyyy');
  };

  // Generate charge day options (1-31)
  const chargeDayOptions = Array.from({ length: 31 }, (_, i) => ({
    value: (i + 1).toString(),
    label: (i + 1).toString(),
  }));

  // Generate installment options (1-32)
  const installmentOptions = Array.from({ length: 32 }, (_, i) => ({
    value: (i + 1).toString(),
    label: `${i + 1} cuota${i > 0 ? 's' : ''}`,
  }));

  return (
    <div className="pb-8">
      {/* Summary Cards */}
      <div className="px-4 pt-4 pb-4 space-y-4">
        <Card className={theme === 'dark'
          ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500/30'
          : 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200'}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-amber-500 text-white">
              <CreditCard size={24} />
            </div>
            <div>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
                Deuda financiada total
              </p>
              <p className="text-2xl font-bold text-amber-500">
                {formatCurrency(totalFinancedDebt)}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-amber-200/50">
            <div>
              <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Pagos mensuales
              </p>
              <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {formatCurrency(totalMonthlyPayments)}
              </p>
            </div>
            <div>
              <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Compras activas
              </p>
              <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {activePurchases.length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Active Purchases */}
      {activePurchases.length > 0 && (
        <div className="px-4 pb-4">
          <h2 className={`text-lg font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Compras activas
          </h2>
          <div className="space-y-3">
            {activePurchases.map(purchase => (
              <Card
                key={purchase.id}
                onClick={() => handleOpenModal(purchase)}
                className="cursor-pointer hover:scale-[1.01] transition-transform overflow-hidden"
              >
                {/* Overdue indicator */}
                {purchase.isOverdue && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-red-500" />
                )}

                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`
                        p-2.5 rounded-xl
                        ${purchase.isOverdue
                          ? 'bg-red-500/20'
                          : purchase.daysRemaining <= 7
                            ? 'bg-amber-500/20'
                            : 'bg-blue-500/20'}
                      `}>
                        <CreditCard
                          size={24}
                          className={
                            purchase.isOverdue
                              ? 'text-red-500'
                              : purchase.daysRemaining <= 7
                                ? 'text-amber-500'
                                : 'text-blue-500'
                          }
                        />
                      </div>
                      <div>
                        <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {purchase.name}
                        </p>
                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          {purchase.account?.name || 'Sin cuenta'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenModal(purchase);
                        }}
                        className={`p-1.5 rounded-lg ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm(purchase.id);
                        }}
                        className={`p-1.5 rounded-lg text-red-500 ${theme === 'dark' ? 'hover:bg-red-500/20' : 'hover:bg-red-50'}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Progress */}
                  <ProgressBar
                    value={purchase.progress}
                    color={purchase.isOverdue ? '#ef4444' : '#f59e0b'}
                    showLabel={false}
                    size="md"
                  />

                  {/* Stats grid */}
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'}`}>
                      <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Cuotas</p>
                      <p className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {purchase.paidInstallments}/{purchase.numberOfInstallments}
                      </p>
                    </div>
                    <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'}`}>
                      <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Pagado</p>
                      <p className="font-bold text-green-500">{purchase.progress.toFixed(0)}%</p>
                    </div>
                    <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'}`}>
                      <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Restante</p>
                      <p className="font-bold text-amber-500">{formatCurrency(purchase.remainingAmount)}</p>
                    </div>
                    <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'}`}>
                      <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Proximo</p>
                      <p className={`font-bold ${
                        purchase.daysRemaining <= 0
                          ? 'text-red-500'
                          : purchase.daysRemaining <= 7
                            ? 'text-amber-500'
                            : theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        {purchase.daysRemaining <= 0
                          ? 'Ahora'
                          : `${purchase.daysRemaining}d`}
                      </p>
                    </div>
                  </div>

                  {/* Next payment info */}
                  <div className={`flex items-center justify-between p-3 rounded-lg ${
                    theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} />
                      <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        Proximo pago: {formatDateShort(purchase.nextPaymentDate)}
                      </span>
                    </div>
                    <p className="font-bold text-amber-500">
                      {formatCurrency(purchase.monthlyPayment)}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Completed Purchases */}
      {completedPurchases.length > 0 && (
        <div className="px-4 pb-4">
          <h2 className={`text-lg font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Completadas
          </h2>
          <div className="space-y-3">
            {completedPurchases.map(purchase => (
              <Card
                key={purchase.id}
                className={`
                  ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'}
                  border-l-4 border-l-green-500
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/20">
                      <CheckCircle size={20} className="text-green-500" />
                    </div>
                    <div>
                      <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {purchase.name}
                      </p>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {purchase.numberOfInstallments} cuotas · {formatCurrency(purchase.originalPrice)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Total pagado
                      </p>
                      <p className="font-bold text-green-500">
                        {formatCurrency(purchase.totalPaid)}
                      </p>
                    </div>
                    <button
                      onClick={() => setDeleteConfirm(purchase.id)}
                      className={`p-2 rounded-lg text-red-500 ${theme === 'dark' ? 'hover:bg-red-500/20' : 'hover:bg-red-50'}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {financedPurchases.length === 0 && (
        <div className="px-4">
          <EmptyState
            icon={<CreditCard size={48} />}
            title="Sin compras financiadas"
            description="Añade compras a	plazos para llevar un control de tus pagos mensuales"
            action={
              <Button onClick={() => handleOpenModal()}>
                <Plus size={18} />
                Nueva compra
              </Button>
            }
          />
        </div>
      )}

      {/* Add FAB */}
      {financedPurchases.length > 0 && (
        <button
          onClick={() => handleOpenModal()}
          className={`
            fixed bottom-24 right-4 sm:bottom-8 sm:right-8
            w-14 h-14 rounded-full
            shadow-lg shadow-amber-500/30
            bg-amber-500 hover:bg-amber-600
            flex items-center justify-center
            text-white
            transition-all duration-200
            active:scale-95
            z-40
          `}
        >
          <Plus size={24} />
        </button>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingPurchase ? 'Editar compra financiada' : 'Nueva compra financiada'}
      >
        <div className="space-y-4">
          <Input
            label="Nombre de la compra"
            value={name}
            onChange={setName}
            placeholder="Ej: iPhone 15, Portatil, Muebles..."
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Precio original"
              type="number"
              value={originalPrice}
              onChange={setOriginalPrice}
              placeholder="0.00"
              min={0.01}
              step={0.01}
              required
            />

            <Input
              label="Cuota mensual"
              type="number"
              value={monthlyPayment}
              onChange={setMonthlyPayment}
              placeholder="0.00"
              min={0.01}
              step={0.01}
              required
            />
          </div>

          <DatePicker
            label="Fecha de inicio"
            value={startDate}
            onChange={setStartDate}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Dia de cargo"
              value={chargeDay}
              onChange={setChargeDay}
              options={chargeDayOptions}
            />

            <Select
              label="Numero de cuotas"
              value={numberOfInstallments}
              onChange={setNumberOfInstallments}
              options={installmentOptions}
            />
          </div>

          <Select
            label="Cuenta de cargo"
            value={accountId}
            onChange={setAccountId}
            options={accounts.map(a => ({ value: a.id, label: a.name }))}
            placeholder="Selecciona una cuenta"
            required
          />

          <Input
            label="Notas (opcional)"
            type="textarea"
            value={notes}
            onChange={setNotes}
            placeholder="Añade notas adicionales..."
          />

          {/* Preview */}
          {originalPrice && monthlyPayment && numberOfInstallments && (
            <Card className={`${theme === 'dark' ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-200'}`}>
              <p className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                Vista previa
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>Total a pagar</p>
                  <p className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {formatCurrency(parseFloat(monthlyPayment || '0') * parseInt(numberOfInstallments || '0'))}
                  </p>
                </div>
                <div>
                  <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>Duracion</p>
                  <p className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {numberOfInstallments} meses
                  </p>
                </div>
              </div>
            </Card>
          )}

          <div className="flex gap-3 pt-4">
            <Button variant="secondary" fullWidth onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button fullWidth onClick={handleSave}>
              {editingPurchase ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        title="Eliminar compra financiada"
        message="¿Estas seguro de que quieres eliminar esta compra financiada? Se perdera el historial de pagos."
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
