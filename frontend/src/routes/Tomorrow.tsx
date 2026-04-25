import { useTranslation } from 'react-i18next'
import { DueDateTaskList } from './DueDateTaskList'

export function Tomorrow() {
  const { t } = useTranslation('tasks')
  return <DueDateTaskList dayOffset={1} title={t('tomorrowTitle')} emptyMessage={t('noTasksTomorrow')} />
}
