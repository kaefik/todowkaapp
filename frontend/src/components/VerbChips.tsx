import { useState } from 'react'
import type { VerbTemplate } from '../hooks/useVerbTemplates'

interface VerbChipsProps {
  templates: VerbTemplate[]
  activeVerb: string | null
  onSelect: (verb: VerbTemplate | null) => void
  onAddCustom: (text: string) => void
}

export function VerbChips({ templates, activeVerb, onSelect, onAddCustom }: VerbChipsProps) {
  const [showAddInput, setShowAddInput] = useState(false)
  const [newVerbText, setNewVerbText] = useState('')

  const handleChipClick = (template: VerbTemplate) => {
    if (activeVerb === template.id) {
      onSelect(null)
    } else {
      onSelect(template)
    }
  }

  const handleAddSubmit = () => {
    const text = newVerbText.trim()
    if (!text) return
    onAddCustom(text)
    setNewVerbText('')
    setShowAddInput(false)
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-gray-100 dark:border-gray-700">
      {templates.map((template) => (
        <button
          key={template.id}
          type="button"
          onClick={() => handleChipClick(template)}
          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            activeVerb === template.id
              ? 'bg-indigo-600 dark:bg-indigo-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          <span>{template.icon}</span>
          <span>{template.text}</span>
        </button>
      ))}
      {showAddInput ? (
        <form
          onSubmit={(e) => { e.preventDefault(); handleAddSubmit() }}
          className="inline-flex items-center gap-1"
        >
          <input
            type="text"
            value={newVerbText}
            onChange={(e) => setNewVerbText(e.target.value)}
            placeholder="глагол"
            maxLength={30}
            autoFocus
            onBlur={() => { if (!newVerbText.trim()) setShowAddInput(false) }}
            className="w-20 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowAddInput(true)}
          className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          + ещё
        </button>
      )}
    </div>
  )
}
