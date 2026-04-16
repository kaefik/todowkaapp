import { useCallback, useEffect, useState } from 'react'
import {
  getLocalTaskChange,
  setLocalTaskChange,
  deleteLocalTaskChange,
  getAllLocalTaskChanges,
  clearAllLocalTaskChanges,
  mergeTaskWithLocalChanges,
} from '../lib/localTaskChanges'
import type { Task, UpdateTask } from './useTasks'

interface UseLocalTaskChangesReturn {
  hasLocalChanges: (taskId: string) => Promise<boolean>
  saveLocalChanges: (taskId: string, changes: UpdateTask) => Promise<void>
  getLocalChanges: (taskId: string) => Promise<UpdateTask | null>
  clearLocalChanges: (taskId: string) => Promise<void>
  clearAllChanges: () => Promise<void>
  mergeWithLocalChanges: (task: Task) => Promise<Task>
  getAllChangedTaskIds: () => Promise<string[]>
}

export function useLocalTaskChanges(): UseLocalTaskChangesReturn {
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    setIsInitialized(true)
  }, [])

  const hasLocalChanges = useCallback(async (taskId: string): Promise<boolean> => {
    if (!isInitialized) return false
    const change = await getLocalTaskChange(taskId)
    return change !== null
  }, [isInitialized])

  const saveLocalChanges = useCallback(async (taskId: string, changes: UpdateTask): Promise<void> => {
    if (!isInitialized) return
    const changesCopy = { ...changes }
    await setLocalTaskChange(taskId, changesCopy as Record<string, unknown>)
  }, [isInitialized])

  const getLocalChanges = useCallback(async (taskId: string): Promise<UpdateTask | null> => {
    if (!isInitialized) return null
    const change = await getLocalTaskChange(taskId)
    return change ? (change.changes as UpdateTask) : null
  }, [isInitialized])

  const clearLocalChanges = useCallback(async (taskId: string): Promise<void> => {
    if (!isInitialized) return
    await deleteLocalTaskChange(taskId)
  }, [isInitialized])

  const clearAllChanges = useCallback(async (): Promise<void> => {
    if (!isInitialized) return
    await clearAllLocalTaskChanges()
  }, [isInitialized])

  const mergeWithLocalChanges = useCallback(async (task: Task): Promise<Task> => {
    if (!isInitialized) return task
    const localChange = await getLocalTaskChange(task.id)
    return mergeTaskWithLocalChanges(task, localChange)
  }, [isInitialized])

  const getAllChangedTaskIds = useCallback(async (): Promise<string[]> => {
    if (!isInitialized) return []
    const changes = await getAllLocalTaskChanges()
    return changes.map(c => c.task_id)
  }, [isInitialized])

  return {
    hasLocalChanges,
    saveLocalChanges,
    getLocalChanges,
    clearLocalChanges,
    clearAllChanges,
    mergeWithLocalChanges,
    getAllChangedTaskIds,
  }
}
