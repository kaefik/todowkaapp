import { useCallback } from 'react'
import { useHaptic, isTelegramWebApp } from '../../tg'

type TabId = 'inbox' | 'next' | 'today' | 'projects' | 'settings'

interface TgBottomNavProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  counts?: { inbox: number; next: number; today: number }
}

const tabs: { id: TabId; icon: string; label: string }[] = [
  { id: 'inbox', icon: '📥', label: 'Входящие' },
  { id: 'next', icon: '🎯', label: 'Next' },
  { id: 'today', icon: '📅', label: 'Сегодня' },
  { id: 'projects', icon: '📂', label: 'Проекты' },
  { id: 'settings', icon: '⚙️', label: 'Настройки' }
]

export function TgBottomNav({ activeTab, onTabChange, counts }: TgBottomNavProps) {
  const { impact, selection } = useHaptic()

  const handleTabClick = useCallback((tabId: TabId) => {
    if (isTelegramWebApp()) {
      selection()
      impact('light')
    }
    onTabChange(tabId)
  }, [onTabChange, impact, selection])

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-around',
      padding: '12px',
      background: '#f5f5f5',
      borderRadius: '12px 12px 0 0',
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0
    }}>
      {tabs.map(tab => (
        <div
          key={tab.id}
          onClick={() => handleTabClick(tab.id)}
          style={{
            textAlign: 'center',
            padding: '4px 8px',
            borderRadius: '8px',
            background: activeTab === tab.id ? '#e8eaf6' : 'transparent'
          }}
        >
          <div style={{ fontSize: '20px' }}>{tab.icon}</div>
          <div style={{
            fontSize: '10px',
            color: activeTab === tab.id ? '#5c6bc0' : '#666666'
          }}>
            {tab.label}
            {tab.id === 'inbox' && counts?.inbox ? ` (${counts.inbox})` : ''}
          </div>
        </div>
      ))}
    </div>
  )
}

export type { TabId }