import { GtdTaskList } from './GtdTaskList'

export function WaitingFor() {
  return <GtdTaskList gtdStatus="waiting" title="Waiting For" />
}
