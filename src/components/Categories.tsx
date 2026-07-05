import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Card, Modal, Input, Button, ColorPicker, IconPicker, SegmentedControl, EmptyState, ConfirmDialog, Toast, Badge } from './ui';
import { Category, COLOR_OPTIONS } from '../types';
import * as Icons from 'lucide-react';
import { Plus, Edit, Trash2, Tags } from 'lucide-react';

const getIconComponent = (iconName: string) => {
  const IconComponent = (Icons as unknown as Record<string, React.FC<{ size?: number; className?: string; color?: string }>>)[iconName];
  return IconComponent || Icons.Tags;
};

export const Categories: React.FC = () => {
  const { categories, addCategory, updateCategory, deleteCategory, theme } = useAppStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [filterType, setFilterType] = useState<'expense' | 'income'>('expense');

  // Form state
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('Tag');
  const [color, setColor] = useState(COLOR_OPTIONS[0]);

  const filteredCategories = categories.filter(c => c.type === filterType);

  const resetForm = () => {
    setName('');
    setIcon('Tag');
    setColor(COLOR_OPTIONS[0]);
    setEditingCategory(null);
  };

  const handleOpenModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setName(category.name);
      setIcon(category.icon);
      setColor(category.color);
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
    if (!name.trim()) {
      setToast({ message: 'El nombre es obligatorio', type: 'error' });
      return;
    }

    if (editingCategory) {
      await updateCategory(editingCategory.id, {
        name: name.trim(),
        icon,
        color,
      });
      setToast({ message: 'Categoria actualizada', type: 'success' });
    } else {
      await addCategory({
        name: name.trim(),
        type: filterType,
        icon,
        color,
        isDefault: false,
      });
      setToast({ message: 'Categoria creada', type: 'success' });
    }

    handleCloseModal();
  };

  const handleDelete = async (id: string) => {
    await deleteCategory(id);
    setDeleteConfirm(null);
    setToast({ message: 'Categoria eliminada', type: 'success' });
  };

  return (
    <div className="pb-8">
      {/* Summary */}
      <div className="px-4 pt-4 pb-4">
        <Card className={theme === 'dark' ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20' : 'bg-gradient-to-r from-indigo-50 to-purple-50'}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500 text-white">
              <Tags size={24} />
            </div>
            <div>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
                Total categorias
              </p>
              <p className="text-2xl font-bold text-indigo-500">
                {categories.length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Type filter */}
      <div className="px-4 pb-4">
        <SegmentedControl
          options={[
            { value: 'expense', label: 'Gastos' },
            { value: 'income', label: 'Ingresos' },
          ]}
          value={filterType}
          onChange={(v) => setFilterType(v as 'expense' | 'income')}
        />
      </div>

      {/* Categories list */}
      <div className="px-4">
        <h2 className={`text-lg font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Categorias de {filterType === 'expense' ? 'gastos' : 'ingresos'}
        </h2>

        {filteredCategories.length === 0 ? (
          <EmptyState
            icon={<Tags size={48} />}
            title="Sin categorias"
            description="Crea categorias para organizar tus transacciones"
            action={
              <Button onClick={() => handleOpenModal()}>
                <Plus size={18} />
                Nueva categoria
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {filteredCategories.map(category => {
              const IconComponent = getIconComponent(category.icon);
              return (
                <Card
                  key={category.id}
                  className="cursor-pointer hover:scale-[1.01] transition-transform"
                  onClick={() => handleOpenModal(category)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${category.color}20` }}
                      >
                        <IconComponent
                          size={20}
                          color={category.color}
                        />
                      </div>
                      <div>
                        <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {category.name}
                        </p>
                        <div className="flex items-center gap-2">
                          {category.isDefault && (
                            <Badge color="#64748b" size="sm">Predeterminada</Badge>
                          )}
                          {!category.isDefault && (
                            <Badge color="#22c55e" size="sm">Personalizada</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenModal(category);
                        }}
                        className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                      >
                        <Edit size={16} />
                      </button>
                      {!category.isDefault && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm(category.id);
                          }}
                          className={`p-2 rounded-lg text-red-500 ${theme === 'dark' ? 'hover:bg-red-500/20' : 'hover:bg-red-50'}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Add Category Button */}
        <Button
          fullWidth
          onClick={() => handleOpenModal()}
          className="mt-6"
        >
          <Plus size={18} />
          Nueva categoria
        </Button>
      </div>

      {/* Category Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingCategory ? 'Editar categoria' : 'Nueva categoria'}
      >
        <div className="space-y-4">
          <Input
            label="Nombre"
            value={name}
            onChange={setName}
            placeholder="Ej: Transporte, Ocio..."
            required
          />

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

          {/* Preview */}
          <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'}`}>
            <p className={`text-sm mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Vista previa
            </p>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${color}20` }}
              >
                {(() => {
                  const IconComponent = getIconComponent(icon);
                  return <IconComponent size={20} color={color} />;
                })()}
              </div>
              <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {name || 'Nombre de categoria'}
              </span>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="secondary" fullWidth onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button fullWidth onClick={handleSave}>
              {editingCategory ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        title="Eliminar categoria"
        message="¿Estas seguro de que quieres eliminar esta categoria? Las transacciones asociadas mantendran su categoria."
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
