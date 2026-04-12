import { useState } from 'react'
import { HexColorInput } from 'react-colorful'

const PRESET_COLORS = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#eab308',
  '#84cc16',
  '#22c55e',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#a855f7',
  '#d946ef',
  '#ec4899',
  '#f43f5e',
  '#78716c',
]

interface ColorPickerFieldProps {
  value: string | null
  onChange: (value: string | null) => void
}

export function ColorPickerField({ value, onChange }: ColorPickerFieldProps) {
  const [isOpen, setIsOpen] = useState(false)

  const toggleOpen = () => setIsOpen((prev) => !prev)

  const handlePresetClick = (color: string) => {
    onChange(color)
    setIsOpen(false)
  }

  const handleInputChange = (newValue: string) => {
    if (newValue === '') {
      onChange(null)
    } else {
      onChange(`#${newValue}`)
    }
  }

  const handleClear = () => {
    onChange(null)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        className="w-full h-[38px] flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
      >
        <span
          className="w-5 h-5 rounded-full border border-gray-300 dark:border-gray-500 flex-shrink-0"
          style={{ backgroundColor: value || 'transparent' }}
        />
        <span className="text-sm text-gray-600 dark:text-gray-300">
          {value || 'Цвет'}
        </span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full right-0 mt-1 z-20 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 w-56">
            <div className="grid grid-cols-8 gap-1.5 mb-3">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handlePresetClick(color)}
                  className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${
                    value === color
                      ? 'border-gray-900 dark:border-white scale-110'
                      : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-gray-400 dark:text-gray-500 text-sm flex-shrink-0">#</span>
              <HexColorInput
                color={value || ''}
                onChange={handleInputChange}
                className="flex-1 min-w-0 w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 uppercase"
                placeholder="RRGGBB"
              />
            </div>

            {value && (
              <button
                type="button"
                onClick={handleClear}
                className="mt-2 w-full text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 py-1"
              >
                Сбросить цвет
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
