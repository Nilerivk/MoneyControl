import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { Card, Modal, Input, Button, ColorPicker, EmptyState, ConfirmDialog, Toast } from './ui';
import { Note, NOTE_COLORS } from '../types';
import { Plus, FileText, Search, Pin, Edit, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export const Notes: React.FC = () => {
  const { notes, addNote, updateNote, deleteNote, theme } = useAppStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [viewingNote, setViewingNote] = useState<Note | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState(NOTE_COLORS[0]);
  const [pinned, setPinned] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Filter and sort notes
  const filteredNotes = useMemo(() => {
    let result = [...notes];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(n =>
        n.title.toLowerCase().includes(query) ||
        n.content.toLowerCase().includes(query)
      );
    }

    // Sort: pinned first, then by updatedAt
    result.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return result;
  }, [notes, searchQuery]);

  // Separate pinned and unpinned notes
  const pinnedNotes = filteredNotes.filter(n => n.pinned);
  const unpinnedNotes = filteredNotes.filter(n => !n.pinned);

  const resetForm = () => {
    setTitle('');
    setContent('');
    setColor(NOTE_COLORS[0]);
    setPinned(false);
    setEditingNote(null);
  };

  const handleOpenModal = (note?: Note) => {
    if (note) {
      setEditingNote(note);
      setTitle(note.title);
      setContent(note.content);
      setColor(note.color);
      setPinned(note.pinned);
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
    if (!title.trim() && !content.trim()) {
      setToast({ message: 'La nota debe tener titulo o contenido', type: 'error' });
      return;
    }

    if (editingNote) {
      await updateNote(editingNote.id, {
        title: title.trim() || 'Sin titulo',
        content: content.trim(),
        color,
        pinned,
      });
      setToast({ message: 'Nota actualizada', type: 'success' });
    } else {
      await addNote({
        title: title.trim() || 'Sin titulo',
        content: content.trim(),
        color,
        pinned,
      });
      setToast({ message: 'Nota creada', type: 'success' });
    }

    handleCloseModal();
  };

  const handleDelete = async (id: string) => {
    await deleteNote(id);
    setDeleteConfirm(null);
    setToast({ message: 'Nota eliminada', type: 'success' });
  };

  const handleTogglePin = async (note: Note) => {
    await updateNote(note.id, { pinned: !note.pinned });
  };

  const formatDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    return format(date, "d MMM yyyy, HH:mm");
  };

  const NoteCard: React.FC<{ note: Note }> = ({ note }) => (
    <Card
      onClick={() => setViewingNote(note)}
      className="cursor-pointer hover:scale-[1.02] transition-transform"
      style={{
        backgroundColor: theme === 'dark'
          ? `${note.color}30`
          : note.color,
        borderLeft: `4px solid ${note.color}`,
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <p className={`font-semibold line-clamp-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          {note.title}
        </p>
        {note.pinned && (
          <Pin size={16} className="text-amber-500 fill-amber-500" />
        )}
      </div>
      <p className={`text-sm line-clamp-3 mb-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
        {note.content || 'Sin contenido'}
      </p>
      <div className="flex items-center justify-between text-xs">
        <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
          {formatDate(note.updatedAt)}
        </span>
        <div className="flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleTogglePin(note);
            }}
            className={`p-1.5 rounded-lg ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}
          >
            <Pin
              size={14}
              className={note.pinned ? 'text-amber-500 fill-amber-500' : ''}
            />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleOpenModal(note);
            }}
            className={`p-1.5 rounded-lg ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}
          >
            <Edit size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleteConfirm(note.id);
            }}
            className={`p-1.5 rounded-lg text-red-500 ${theme === 'dark' ? 'hover:bg-red-500/20' : 'hover:bg-red-50'}`}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="pb-8">
      {/* Search Bar */}
      <div className="px-4 pt-4 pb-4">
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl ${
          theme === 'dark' ? 'bg-white/10' : 'bg-gray-100'
        }`}>
          <Search size={20} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar notas..."
            className={`flex-1 bg-transparent outline-none ${
              theme === 'dark' ? 'text-white placeholder-gray-400' : 'text-gray-900 placeholder-gray-500'
            }`}
          />
        </div>
      </div>

      {/* Notes Grid */}
      {notes.length === 0 ? (
        <div className="px-4">
          <EmptyState
            icon={<FileText size={48} />}
            title="Sin notas"
            description="Crea notas para guardar informacion importante"
            action={
              <Button onClick={() => handleOpenModal()}>
                <Plus size={18} />
                Nueva nota
              </Button>
            }
          />
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="px-4">
          <EmptyState
            icon={<Search size={48} />}
            title="Sin resultados"
            description="No se encontraron notas que coincidan con la busqueda"
          />
        </div>
      ) : (
        <div className="px-4 space-y-6">
          {/* Pinned Notes */}
          {pinnedNotes.length > 0 && (
            <div>
              <h2 className={`text-sm font-medium mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                <Pin size={14} className="inline mr-1" />
                Fijadas
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {pinnedNotes.map(note => (
                  <NoteCard key={note.id} note={note} />
                ))}
              </div>
            </div>
          )}

          {/* Other Notes */}
          {unpinnedNotes.length > 0 && (
            <div>
              {pinnedNotes.length > 0 && (
                <h2 className={`text-sm font-medium mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Otras notas
                </h2>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {unpinnedNotes.map(note => (
                  <NoteCard key={note.id} note={note} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add FAB */}
      {notes.length > 0 && (
        <button
          onClick={() => handleOpenModal()}
          className={`
            fixed bottom-24 right-4 sm:bottom-8 sm:right-8
            w-14 h-14 rounded-full
            shadow-lg shadow-yellow-500/30
            bg-yellow-500 hover:bg-yellow-600
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

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingNote ? 'Editar nota' : 'Nueva nota'}
      >
        <div className="space-y-4">
          <Input
            label="Titulo"
            value={title}
            onChange={setTitle}
            placeholder="Titulo de la nota..."
          />

          <Input
            label="Contenido"
            type="textarea"
            value={content}
            onChange={setContent}
            placeholder="Escribe tu nota aqui..."
          />

          <div className="space-y-2">
            <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Color
            </label>
            <ColorPicker value={color} onChange={setColor} colors={NOTE_COLORS} />
          </div>

          <div className={`flex items-center justify-between p-3 rounded-lg ${
            theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'
          }`}>
            <div className="flex items-center gap-2">
              <Pin size={18} />
              <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Fijar nota
              </span>
            </div>
            <button
              onClick={() => setPinned(!pinned)}
              className={`
                relative w-12 h-7 rounded-full transition-colors duration-200
                ${pinned ? 'bg-amber-500' : theme === 'dark' ? 'bg-white/20' : 'bg-gray-300'}
              `}
            >
              <div
                className={`
                  absolute top-0.5 w-6 h-6 rounded-full bg-white shadow
                  transition-transform duration-200
                  ${pinned ? 'translate-x-5' : 'translate-x-0.5'}
                `}
              />
            </button>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="secondary" fullWidth onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button fullWidth onClick={handleSave}>
              {editingNote ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Note Modal */}
      <Modal
        isOpen={!!viewingNote}
        onClose={() => setViewingNote(null)}
        title={viewingNote?.title}
      >
        {viewingNote && (
          <div className="space-y-4">
            <div
              className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'}`}
              style={{ borderLeft: `4px solid ${viewingNote.color}` }}
            >
              <p className={`whitespace-pre-wrap ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                {viewingNote.content || 'Sin contenido'}
              </p>
            </div>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Actualizada: {formatDate(viewingNote.updatedAt)}
            </p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => {
                  setViewingNote(null);
                  handleOpenModal(viewingNote);
                }}
              >
                <Edit size={16} />
                Editar
              </Button>
              <Button
                variant="danger"
                fullWidth
                onClick={() => {
                  setDeleteConfirm(viewingNote.id);
                  setViewingNote(null);
                }}
              >
                <Trash2 size={16} />
                Eliminar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        title="Eliminar nota"
        message="¿Estas seguro de que quieres eliminar esta nota?"
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
