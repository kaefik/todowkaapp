import { useTranslation } from 'react-i18next'

const TATAR_CHARS = ['Ә', 'ә', 'Җ', 'җ', 'Ң', 'ң', 'Ө', 'ө', 'Ү', 'ү']

interface TatarKeyboardBarProps {
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>
  value: string
  onChange: (value: string) => void
}

export function TatarKeyboardBar({ inputRef, value, onChange }: TatarKeyboardBarProps) {
  const { i18n } = useTranslation()

  if (i18n.language !== 'tt') return null

  const insertChar = (char: string) => {
    const el = inputRef.current
    if (!el) {
      onChange(value + char)
      return
    }

    const current = el.value
    const start = el.selectionStart ?? current.length
    const end = el.selectionEnd ?? current.length
    const newValue = current.slice(0, start) + char + current.slice(end)
    onChange(newValue)

    requestAnimationFrame(() => {
      el.focus()
      const pos = start + char.length
      el.selectionStart = pos
      el.selectionEnd = pos
    })
  }

  return (
    <div className="flex items-center gap-0.5 pt-1">
      {TATAR_CHARS.map((char) => (
        <button
          key={char}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => insertChar(char)}
          className="w-7 h-7 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors flex items-center justify-center"
        >
          {char}
        </button>
      ))}
    </div>
  )
}
