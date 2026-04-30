import { createPortal } from 'react-dom'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmText: string
  cancelText?: string
  variant?: 'danger' | 'normal'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmText,
  cancelText,
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation('common')
  const [isMobile, setIsMobile] = useState(false)

  const resolvedCancelText = cancelText ?? t('cancel')

  useEffect(() => {
    if (!open) return
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      className={`fixed inset-0 z-[9999] animate-fade-in ${isMobile ? 'flex items-end' : 'flex items-center justify-center'} bg-black/75 dark:bg-black/90`}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div
        className={`animate-scale-in bg-white dark:bg-gray-800 shadow-2xl mx-4 rounded-lg ${
          isMobile ? 'w-full max-w-none rounded-t-lg rounded-b-none' : 'max-w-md w-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {message}
          </p>
        </div>
        <div className="flex justify-end gap-3 px-6 py-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onCancel}
            className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {resolvedCancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-md px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
              variant === 'danger'
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
