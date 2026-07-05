import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { Card, Modal, Input, Button, Select, DatePicker, EmptyState, ConfirmDialog, Toast } from './ui';
import { Reminder, RepeatType } from '../types';
import {
  Plus, Bell, Calendar, Clock, Repeat,
  Edit, Trash2, CheckCircle, Circle
} from 'lucide-react';
import { format, parseISO, isToday, isTomorrow, isPast, addDays, addWeeks, addMonths, addYears } from 'date-fns';

export const Reminders: React.FC = () => {
  const { reminders, addReminder, updateReminder, deleteReminder, theme } = useAppStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState('12:00');
  const [repeat, setRepeat] = useState<RepeatType>('none');
  const [completed, setCompleted] = useState(false);

  // Sort reminders: pending first (by date), completed last
  const sortedReminders = useMemo(() => {
    const pending = reminders
      .filter(r => !r.completed)
      .sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());

    const completedList = reminders
      .filter(r => r.completed)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { pending, completed: completedList };
  }, [reminders]);

  // Group pending reminders by date
  const groupedReminders = useMemo(() => {
    const groups: Record<string, Reminder[]> = {};

    sortedReminders.pending.forEach(reminder => {
      const reminderDate = parseISO(reminder.date);
      let groupKey: string;

      if (isToday(reminderDate)) {
        groupKey = 'today';
      } else if (isTomorrow(reminderDate)) {
        groupKey = 'tomorrow';
      } else if (isPast(reminderDate)) {
        groupKey = 'overdue';
      } else {
        groupKey = reminder.date;
      }

      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(reminder);
    });

    return groups;
  }, [sortedReminders.pending]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setTime('12:00');
    setRepeat('none');
    setCompleted(false);
    setEditingReminder(null);
  };

  const handleOpenModal = (reminder?: Reminder) => {
    if (reminder) {
      setEditingReminder(reminder);
      setTitle(reminder.title);
      setDescription(reminder.description || '');
      setDate(reminder.date);
      setTime(reminder.time);
      setRepeat(reminder.repeat);
      setCompleted(reminder.completed);
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
    if (!title.trim()) {
      setToast({ message: 'El titulo es obligatorio', type: 'error' });
      return;
    }

    if (editingReminder) {
      await updateReminder(editingReminder.id, {
        title: title.trim(),
        description: description.trim(),
        date,
        time,
        repeat,
        completed,
      });
      setToast({ message: 'Recordatorio actualizado', type: 'success' });
    } else {
      await addReminder({
        title: title.trim(),
        description: description.trim(),
        date,
        time,
        repeat,
        completed,
      });
      setToast({ message: 'Recordatorio creado', type: 'success' });
    }

    handleCloseModal();
  };

  const handleDelete = async (id: string) => {
    await deleteReminder(id);
    setDeleteConfirm(null);
    setToast({ message: 'Recordatorio eliminado', type: 'success' });
  };

  const handleToggleComplete = async (reminder: Reminder) => {
    // If completing a recurring reminder, create next occurrence
    if (!reminder.completed && reminder.repeat !== 'none') {
      const nextDate = calculateNextDate(reminder.date, reminder.repeat);
      await updateReminder(reminder.id, {
        completed: true,
        date: nextDate,
      });
      // Reset completion for next occurrence
      setTimeout(() => {
        updateReminder(reminder.id, { completed: false });
      }, 100);
    } else {
      await updateReminder(reminder.id, { completed: !reminder.completed });
    }
  };

  const calculateNextDate = (currentDate: string, repeatType: RepeatType): string => {
    const date = parseISO(currentDate);
    let nextDate: Date;

    switch (repeatType) {
      case 'daily':
        nextDate = addDays(date, 1);
        break;
      case 'weekly':
        nextDate = addWeeks(date, 1);
        break;
      case 'monthly':
        nextDate = addMonths(date, 1);
        break;
      case 'yearly':
        nextDate = addYears(date, 1);
        break;
      default:
        return currentDate;
    }

    return format(nextDate, 'yyyy-MM-dd');
  };

  const formatDateGroup = (key: string) => {
    switch (key) {
      case 'today':
        return 'Hoy';
      case 'tomorrow':
        return 'Manana';
      case 'overdue':
        return 'Vencidos';
      default:
        const date = parseISO(key);
        return format(date, "EEEE, d 'de' MMMM");
    }
  };

  const repeatOptions = [
    { value: 'none', label: 'Una vez' },
    { value: 'daily', label: 'Diario' },
    { value: 'weekly', label: 'Semanal' },
    { value: 'monthly', label: 'Mensual' },
    { value: 'yearly', label: 'Anual' },
  ];

  return (
    <div className="pb-8">
      {/* Summary */}
      <div className="px-4 pt-4 pb-4">
        <Card className={theme === 'dark' ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20' : 'bg-gradient-to-r from-purple-50 to-pink-50'}>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Pendientes</p>
              <p className="text-2xl font-bold text-amber-500">{sortedReminders.pending.length}</p>
            </div>
            <div>
              <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Completados</p>
              <p className="text-2xl font-bold text-green-500">{sortedReminders.completed.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Reminders List */}
      {reminders.length === 0 ? (
        <div className="px-4">
          <EmptyState
            icon={<Bell size={48} />}
            title="Sin recordatorios"
            description="Crea recordatorios para no olvidar eventos importantes"
            action={
              <Button onClick={() => handleOpenModal()}>
                <Plus size={18} />
                Nuevo recordatorio
              </Button>
            }
          />
        </div>
      ) : (
        <div className="px-4 space-y-6">
          {/* Pending Reminders */}
          {Object.entries(groupedReminders).map(([groupKey, groupReminders]) => (
            <div key={groupKey}>
              <h2 className={`text-sm font-medium mb-3 px-2 ${
                groupKey === 'overdue'
                  ? 'text-red-500'
                  : groupKey === 'today'
                    ? 'text-amber-500'
                    : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {formatDateGroup(groupKey)}
              </h2>
              <div className="space-y-2">
                {groupReminders.map(reminder => (
                  <Card
                    key={reminder.id}
                    className={`
                      cursor-pointer hover:scale-[1.01] transition-transform
                      ${groupKey === 'overdue'
                        ? 'border-l-4 border-l-red-500'
                        : groupKey === 'today'
                          ? 'border-l-4 border-l-amber-500'
                          : ''}
                    `}
                    onClick={() => handleOpenModal(reminder)}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleComplete(reminder);
                        }}
                        className={`mt-0.5 ${
                          reminder.completed
                            ? 'text-green-500'
                            : theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        {reminder.completed ? (
                          <CheckCircle size={24} className="fill-green-500 text-white" />
                        ) : (
                          <Circle size={24} />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium ${reminder.completed
                          ? 'line-through text-gray-400'
                          : theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                          {reminder.title}
                        </p>
                        {reminder.description && (
                          <p className={`text-sm truncate ${
                            reminder.completed
                              ? 'text-gray-400'
                              : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            {reminder.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs">
                          <span className={`flex items-center gap-1 ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            <Calendar size={12} />
                            {format(parseISO(reminder.date), 'dd/MM/yyyy')}
                          </span>
                          <span className={`flex items-center gap-1 ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            <Clock size={12} />
                            {reminder.time}
                          </span>
                          {reminder.repeat !== 'none' && (
                            <span className={`flex items-center gap-1 ${
                              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                              <Repeat size={12} />
                              {repeatOptions.find(o => o.value === reminder.repeat)?.label}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenModal(reminder);
                          }}
                          className={`p-1.5 rounded-lg ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm(reminder.id);
                          }}
                          className={`p-1.5 rounded-lg text-red-500 ${theme === 'dark' ? 'hover:bg-red-500/20' : 'hover:bg-red-50'}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}

          {/* Completed Reminders */}
          {sortedReminders.completed.length > 0 && (
            <div>
              <h2 className={`text-sm font-medium mb-3 px-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Completados
              </h2>
              <div className="space-y-2">
                {sortedReminders.completed.slice(0, 5).map(reminder => (
                  <Card
                    key={reminder.id}
                    className={`
                      cursor-pointer opacity-60 hover:opacity-100 transition-opacity
                      ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'}
                    `}
                    onClick={() => handleOpenModal(reminder)}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleComplete(reminder);
                        }}
                        className="text-green-500"
                      >
                        <CheckCircle size={24} className="fill-green-500 text-white" />
                      </button>
                      <p className={`flex-1 font-medium line-through ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {reminder.title}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm(reminder.id);
                        }}
                        className={`p-1.5 rounded-lg text-red-500 ${theme === 'dark' ? 'hover:bg-red-500/20' : 'hover:bg-red-50'}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add FAB */}
      {reminders.length > 0 && (
        <button
          onClick={() => handleOpenModal()}
          className={`
            fixed bottom-24 right-4 sm:bottom-8 sm:right-8
            w-14 h-14 rounded-full
            shadow-lg shadow-purple-500/30
            bg-purple-500 hover:bg-purple-600
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
        title={editingReminder ? 'Editar recordatorio' : 'Nuevo recordatorio'}
      >
        <div className="space-y-4">
          <Input
            label="Titulo"
            value={title}
            onChange={setTitle}
            placeholder="Ej: Reunion, Cita medica..."
            required
          />

          <Input
            label="Descripcion (opcional)"
            value={description}
            onChange={setDescription}
            placeholder="Añade detalles adicionales..."
          />

          <div className="grid grid-cols-2 gap-4">
            <DatePicker
              label="Fecha"
              value={date}
              onChange={setDate}
            />

            <div className="space-y-2">
              <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                Hora
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={`
                  w-full px-4 py-3 rounded-xl
                  ${theme === 'dark'
                    ? 'bg-white/10 border-white/10 text-white'
                    : 'bg-gray-50 border-gray-200 text-gray-900'}
                  border focus:outline-none focus:ring-2 focus:ring-blue-500/50
                `}
              />
            </div>
          </div>

          <Select
            label="Repetir"
            value={repeat}
            onChange={(v) => setRepeat(v as RepeatType)}
            options={repeatOptions}
          />

          {editingReminder && (
            <div className={`flex items-center justify-between p-3 rounded-lg ${
              theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'
            }`}>
              <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Completado
              </span>
              <button
                onClick={() => setCompleted(!completed)}
                className={`
                  relative w-12 h-7 rounded-full transition-colors duration-200
                  ${completed ? 'bg-green-500' : theme === 'dark' ? 'bg-white/20' : 'bg-gray-300'}
                `}
              >
                <div
                  className={`
                    absolute top-0.5 w-6 h-6 rounded-full bg-white shadow
                    transition-transform duration-200
                    ${completed ? 'translate-x-5' : 'translate-x-0.5'}
                  `}
                />
              </button>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button variant="secondary" fullWidth onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button fullWidth onClick={handleSave}>
              {editingReminder ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        title="Eliminar recordatorio"
        message="¿Estas seguro de que quieres eliminar este recordatorio?"
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
