import { DueDateTaskList } from './DueDateTaskList'

export function Tomorrow() {
  return <DueDateTaskList dayOffset={1} title="Завтра" emptyMessage="Нет задач на завтра." />
}
