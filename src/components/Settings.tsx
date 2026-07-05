import React, { useState, useRef } from 'react';
import { useAppStore } from '../store';
import { Card, Button, SegmentedControl, ConfirmDialog, Toast } from './ui';
import { ThemeMode } from '../types';
import {
  Moon, Sun, Monitor, Download, Upload, Trash2,
  RefreshCw, AlertTriangle, Database, Info
} from 'lucide-react';
import { dataExport } from '../db/database';

export const Settings: React.FC = () => {
  const { settings, updateSettings, setTheme, theme, undoDelete, initialize } = useAppStore();

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleThemeChange = (themeMode: string) => {
    setTheme(themeMode as ThemeMode);
  };

  const handleExport = async () => {
    try {
      const jsonData = await dataExport.exportAll();
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `money-control-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setToast({ message: 'Datos exportados correctamente', type: 'success' });
    } catch (error) {
      setToast({ message: 'Error al exportar datos', type: 'error' });
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      await dataExport.importAll(text);
      await initialize();
      setToast({ message: 'Datos importados correctamente', type: 'success' });
    } catch (error) {
      setToast({ message: 'Error al importar datos', type: 'error' });
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteAllData = async () => {
    try {
      await dataExport.deleteAll();
      await initialize();
      setToast({ message: 'Todos los datos han sido eliminados', type: 'success' });
    } catch (error) {
      setToast({ message: 'Error al eliminar datos', type: 'error' });
    }
    setConfirmDelete(false);
  };

  const handleUndoDelete = async () => {
    const result = await undoDelete();
    if (result) {
      setToast({ message: 'Elemento restaurado', type: 'success' });
    } else {
      setToast({ message: 'No hay nada que deshacer', type: 'error' });
    }
  };

  return (
    <div className="pb-8 px-4 pt-4 space-y-6">
      {/* App Info */}
      <Card className={theme === 'dark' ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20' : 'bg-gradient-to-r from-blue-50 to-purple-50'}>
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-white/10' : 'bg-white'}`}>
            <Database size={32} className="text-blue-500" />
          </div>
          <div>
            <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Money Control
            </h2>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Control de finanzas personales
            </p>
          </div>
        </div>
      </Card>

      {/* Theme Settings */}
      <Card>
        <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Tema
        </h3>
        <div className="space-y-4">
          <div
            onClick={() => handleThemeChange('light')}
            className={`
              flex items-center gap-4 p-4 rounded-xl cursor-pointer
              transition-all duration-200
              ${settings.theme === 'light'
                ? theme === 'dark'
                  ? 'bg-blue-500/20 border border-blue-500/50'
                  : 'bg-blue-50 border border-blue-200'
                : theme === 'dark'
                  ? 'bg-white/5 hover:bg-white/10'
                  : 'bg-gray-50 hover:bg-gray-100'}
            `}
          >
            <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-yellow-500/20' : 'bg-yellow-100'}`}>
              <Sun size={24} className="text-yellow-500" />
            </div>
            <div className="flex-1">
              <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Modo claro
              </p>
            </div>
            {settings.theme === 'light' && (
              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
            )}
          </div>

          <div
            onClick={() => handleThemeChange('dark')}
            className={`
              flex items-center gap-4 p-4 rounded-xl cursor-pointer
              transition-all duration-200
              ${settings.theme === 'dark'
                ? theme === 'dark'
                  ? 'bg-blue-500/20 border border-blue-500/50'
                  : 'bg-blue-50 border border-blue-200'
                : theme === 'dark'
                  ? 'bg-white/5 hover:bg-white/10'
                  : 'bg-gray-50 hover:bg-gray-100'}
            `}
          >
            <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}>
              <Moon size={24} className="text-indigo-500" />
            </div>
            <div className="flex-1">
              <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Modo oscuro
              </p>
            </div>
            {settings.theme === 'dark' && (
              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
            )}
          </div>

          <div
            onClick={() => handleThemeChange('auto')}
            className={`
              flex items-center gap-4 p-4 rounded-xl cursor-pointer
              transition-all duration-200
              ${settings.theme === 'auto'
                ? theme === 'dark'
                  ? 'bg-blue-500/20 border border-blue-500/50'
                  : 'bg-blue-50 border border-blue-200'
                : theme === 'dark'
                  ? 'bg-white/5 hover:bg-white/10'
                  : 'bg-gray-50 hover:bg-gray-100'}
            `}
          >
            <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-gray-500/20' : 'bg-gray-100'}`}>
              <Monitor size={24} className={`theme === 'dark' ? 'text-gray-400' : 'text-gray-600' `} />
            </div>
            <div className="flex-1">
              <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Automatico
              </p>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Seguir ajustes del sistema
              </p>
            </div>
            {settings.theme === 'auto' && (
              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Currency Settings */}
      <Card>
        <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Moneda
        </h3>
        <SegmentedControl
          options={[
            { value: 'EUR', label: 'EUR (€)' },
            { value: 'USD', label: 'USD ($)' },
            { value: 'GBP', label: 'GBP (£)' },
          ]}
          value={settings.currency}
          onChange={(v) => {
            const symbols: Record<string, string> = { EUR: '€', USD: '$', GBP: '£' };
            updateSettings({ currency: v, currencySymbol: symbols[v] || '€' });
          }}
        />
      </Card>

      {/* Data Management */}
      <Card>
        <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Gestion de datos
        </h3>
        <div className="space-y-3">
          <Button
            variant="secondary"
            fullWidth
            onClick={handleUndoDelete}
          >
            <RefreshCw size={18} />
            Deshacer ultima eliminacion
          </Button>

          <Button
            variant="secondary"
            fullWidth
            onClick={handleExport}
          >
            <Download size={18} />
            Exportar datos
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
          <Button
            variant="secondary"
            fullWidth
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={18} />
            Importar datos
          </Button>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className={theme === 'dark' ? 'border-red-500/30' : 'border-red-200'}>
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="text-red-500" size={20} />
          <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Zona de peligro
          </h3>
        </div>
        <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
          Estas acciones son irreversibles. Asegurate de tener una copia de seguridad.
        </p>
        <div className="space-y-3">
          <Button
            variant="danger"
            fullWidth
            onClick={() => setConfirmReset(true)}
          >
            <RefreshCw size={18} />
            Reiniciar datos de demo
          </Button>

          <Button
            variant="danger"
            fullWidth
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 size={18} />
            Eliminar todos los datos
          </Button>
        </div>
      </Card>

      {/* About */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <Info size={20} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} />
          <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Acerca de
          </h3>
        </div>
        <div className={`space-y-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
          <p>Money Control v1.0.0</p>
          <p>Aplicacion de control de finanzas personales</p>
          <p>Datos almacenados localmente en tu dispositivo</p>
          <p className="text-xs mt-4">
            Esta aplicacion funciona sin conexion y guarda todos los datos de forma segura en tu navegador usando IndexedDB.
          </p>
        </div>
      </Card>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDeleteAllData}
        title="Eliminar todos los datos"
        message="¿Estas seguro de que quieres eliminar TODOS los datos? Esta accion no se puede deshacer y perderas todas tus cuentas, transacciones, notas y recordatorios."
        confirmText="Eliminar todo"
        variant="danger"
      />

      {/* Confirm Reset Dialog */}
      <ConfirmDialog
        isOpen={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={async () => {
          await handleDeleteAllData();
          setConfirmReset(false);
        }}
        title="Reiniciar datos"
        message="Esto eliminara todos los datos actuales. Asegurate de haber exportado una copia de seguridad primero."
        confirmText="Reiniciar"
        variant="warning"
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
