import { useTranslation } from 'react-i18next'
import { DueDateTaskList } from './DueDateTaskList'

export function Today() {
  const { t } = useTranslation('tasks')
  return <DueDateTaskList dayOffset={0} title={t('todayTitle')} emptyMessage={t('noTasksToday')} />
}
