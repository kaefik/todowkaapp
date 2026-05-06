import { useHaptic, isTelegramWebApp } from '../../tg'

interface TgFabProps {
  onClick: () => void
}

export function TgFab({ onClick }: TgFabProps) {
  const { impact } = useHaptic()

  const handleClick = () => {
    if (isTelegramWebApp()) {
      impact('light')
    }
    onClick()
  }

  return (
    <button
      onClick={handleClick}
      style={{
        position: 'fixed',
        bottom: '80px',
        right: '16px',
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        background: '#5c6bc0',
        border: 'none',
        color: '#ffffff',
        fontSize: '24px',
        boxShadow: '0 4px 12px rgba(92, 107, 192, 0.4)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      +
    </button>
  )
}