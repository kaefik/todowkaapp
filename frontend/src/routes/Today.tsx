import { DueDateTaskList } from './DueDateTaskList'

export function Today() {
  return <DueDateTaskList dayOffset={0} title="Сегодня" emptyMessage="Нет задач на сегодня." />
}
