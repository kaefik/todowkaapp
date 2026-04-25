import { useState } from 'react'
import type { VerbTemplate } from '../hooks/useVerbTemplates'

interface VerbFabProps {
  templates: VerbTemplate[]
  activeVerb: string | null
  onSelect: (verb: VerbTemplate | null) => void
  onAddCustom: (text: string) => void
  isOpen: boolean
  onToggle: () => void
}

export function VerbFab({ templates, activeVerb, onSelect, onAddCustom, isOpen, onToggle }: VerbFabProps) {
  const [showAddInput, setShowAddInput] = useState(false)
  const [newVerbText, setNewVerbText] = useState('')

  const handleVerbClick = (template: VerbTemplate) => {
    onSelect(template)
  }

  const handleAddSubmit = () => {
    const text = newVerbText.trim()
    if (!text) return
    onAddCustom(text)
    setNewVerbText('')
    setShowAddInput(false)
  }

  const handleBackdropClick = () => {
    if (showAddInput) {
      setShowAddInput(false)
    } else {
      onToggle()
    }
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={onToggle}
          className="w-14 h-14 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 flex items-center justify-center text-2xl hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
        >
          ✏️
        </button>
      </div>
    )
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 z-30"
        onClick={handleBackdropClick}
      />
      <div className="fixed bottom-6 right-6 z-40 flex flex-col-reverse items-end gap-2">
        <button
          type="button"
          onClick={onToggle}
          className="w-14 h-14 rounded-full bg-gray-800 dark:bg-gray-700 text-white shadow-lg flex items-center justify-center text-2xl transition-transform rotate-45"
        >
          ✏️
        </button>
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="px-4 py-2 rounded-full text-sm font-medium shadow-md transition-colors flex items-center gap-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500"
        >
          <span>✏️</span>
          <span>Без глагола</span>
        </button>
        {templates.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => handleVerbClick(template)}
            className={`px-4 py-2 rounded-full text-sm font-medium shadow-md transition-colors flex items-center gap-2 ${
              activeVerb === template.id
                ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border-2 border-indigo-500'
                : 'bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600'
            }`}
          >
            <span>{template.icon}</span>
            <span>{template.text}</span>
          </button>
        ))}
        {showAddInput ? (
          <form
            onSubmit={(e) => { e.preventDefault(); handleAddSubmit() }}
            className="bg-white dark:bg-gray-800 rounded-full shadow-md flex items-center gap-1 px-2"
          >
            <input
              type="text"
              value={newVerbText}
              onChange={(e) => setNewVerbText(e.target.value)}
              placeholder="глагол"
              maxLength={30}
              autoFocus
              className="w-24 px-2 py-2 text-sm bg-transparent text-gray-900 dark:text-gray-100 focus:outline-none"
            />
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setShowAddInput(true)}
            className="px-4 py-2 rounded-full text-sm font-medium bg-indigo-600 dark:bg-indigo-500 text-white shadow-md hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
          >
            + свой
          </button>
        )}
      </div>
    </>
  )
}
