import { HighlightText } from './TaskFilterPanel'

interface TruncatedDescriptionProps {
  text: string
  query?: string
  maxLength?: number
  onExpand: () => void
  className?: string
  crossedOut?: boolean
}

export function TruncatedDescription({
  text,
  query,
  maxLength = 100,
  onExpand,
  className = 'mt-1 text-sm text-gray-500 dark:text-gray-400',
  crossedOut = false,
}: TruncatedDescriptionProps) {
  if (!text) return null

  const shouldTruncate = !query?.trim() && text.length > maxLength

  if (crossedOut) {
    className += ' line-through decoration-2 decoration-gray-400 dark:decoration-gray-500'
  }

  if (shouldTruncate) {
    return (
      <p className={className}>
        {text.slice(0, maxLength)}{' '}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onExpand()
          }}
          className="text-indigo-600 dark:text-indigo-400 hover:underline inline"
        >
          Ещё...
        </button>
      </p>
    )
  }

  return (
    <p className={className}>
      <HighlightText text={text} query={query} />
    </p>
  )
}
