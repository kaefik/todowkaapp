import { useState } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useVerbTemplates, type VerbTemplate } from '../hooks/useVerbTemplates'
import { useToastStore } from '../stores/toastStore'

const RANDOM_ICONS = ['🎯', '📖', '🔧', '💡', '📊', '🗂️', '🚀', '⭐', '📝', '🎪']

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const result = [...arr]
  const [item] = result.splice(from, 1)
  result.splice(to, 0, item)
  return result
}

function GripIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <circle cx="5" cy="3" r="1.5" />
      <circle cx="11" cy="3" r="1.5" />
      <circle cx="5" cy="8" r="1.5" />
      <circle cx="11" cy="8" r="1.5" />
      <circle cx="5" cy="13" r="1.5" />
      <circle cx="11" cy="13" r="1.5" />
    </svg>
  )
}

function SortableVerbItem({
  template,
  editingId,
  editText,
  editIcon,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  setEditText,
  setEditIcon,
}: {
  template: VerbTemplate
  editingId: string | null
  editText: string
  editIcon: string
  onStartEdit: (id: string, text: string, icon: string) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onDelete: (id: string) => void
  setEditText: (v: string) => void
  setEditIcon: (v: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: template.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-1 flex-shrink-0 focus:outline-none"
        aria-label="Перетащить"
      >
        <GripIcon />
      </button>
      {editingId === template.id ? (
        <>
          <input
            type="text"
            value={editIcon}
            onChange={(e) => setEditIcon(e.target.value)}
            maxLength={10}
            className="w-12 px-2 py-1 text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            maxLength={30}
            className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            onKeyDown={(e) => e.key === 'Enter' && onSaveEdit()}
          />
          <button onClick={onSaveEdit} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
            Сохранить
          </button>
          <button onClick={onCancelEdit} className="text-sm text-gray-500 hover:underline">
            Отмена
          </button>
        </>
      ) : (
        <>
          <span className="text-lg">{template.icon}</span>
          <span className="flex-1 text-sm text-gray-900 dark:text-gray-100">{template.text}</span>
          <button onClick={() => onStartEdit(template.id, template.text, template.icon)} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
            Изменить
          </button>
          <button onClick={() => onDelete(template.id)} className="text-sm text-red-600 dark:text-red-400 hover:underline">
            Удалить
          </button>
        </>
      )}
    </div>
  )
}

export function VerbSettings() {
  const { templates, addVerb, updateVerb, deleteVerb, reorderVerbs, resetVerbs } = useVerbTemplates()
  const addToast = useToastStore(s => s.addToast)
  const [newText, setNewText] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [editIcon, setEditIcon] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = templates.findIndex(t => t.id === active.id)
    const newIndex = templates.findIndex(t => t.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(templates, oldIndex, newIndex)
    await reorderVerbs(reordered.map(t => t.id))
  }

  const handleAdd = async () => {
    const text = newText.trim()
    if (!text) return
    const icon = RANDOM_ICONS[Math.floor(Math.random() * RANDOM_ICONS.length)]
    await addVerb(text, icon)
    setNewText('')
  }

  const handleStartEdit = (id: string, text: string, icon: string) => {
    setEditingId(id)
    setEditText(text)
    setEditIcon(icon)
  }

  const handleSaveEdit = async () => {
    if (!editingId) return
    const data: { text?: string; icon?: string } = {}
    if (editText.trim()) data.text = editText.trim()
    if (editIcon.trim()) data.icon = editIcon.trim()
    await updateVerb(editingId, data)
    setEditingId(null)
  }

  const handleDelete = async (id: string) => {
    await deleteVerb(id)
  }

  const handleReset = async () => {
    await resetVerbs()
    addToast({ title: 'Готово', body: 'Глаголы сброшены по умолчанию', type: 'success' })
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Быстрые глаголы
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Глаголы для быстрого добавления задач. На десктопе — чипы над полем ввода, на мобильном — кнопка ✏️. Перетаскивайте за ручку для изменения порядка.
      </p>

      <div className="space-y-2 mb-4">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={templates.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {templates.map((template) => (
              <SortableVerbItem
                key={template.id}
                template={template}
                editingId={editingId}
                editText={editText}
                editIcon={editIcon}
                onStartEdit={handleStartEdit}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={() => setEditingId(null)}
                onDelete={handleDelete}
                setEditText={setEditText}
                setEditIcon={setEditIcon}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Новый глагол..."
          maxLength={30}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
        <button
          onClick={handleAdd}
          disabled={!newText.trim()}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Добавить
        </button>
      </div>

      <button
        onClick={handleReset}
        className="text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:underline"
      >
        Сбросить по умолчанию
      </button>
    </div>
  )
}
