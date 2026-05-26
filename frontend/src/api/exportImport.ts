const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export interface ImportReport {
  imported: Record<string, number>
  skipped: number
  errors: string[]
}

export const exportImportApi = {
  async exportData(): Promise<void> {
    const { useAuthStore } = await import('../stores/authStore')
    const authStore = useAuthStore.getState()
    const headers: Record<string, string> = {}
    if (authStore.isAuthenticated) {
      headers['X-Requested-With'] = 'XMLHttpRequest'
    }

    const response = await fetch(`${API_BASE_URL}/export-import/export`, {
      method: 'GET',
      headers,
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`)
    }

    const disposition = response.headers.get('Content-Disposition')
    let filename = `todowka_export_${new Date().toISOString().split('T')[0]}.json`
    if (disposition) {
      const match = disposition.match(/filename="?([^";\n]+)"?/)
      if (match) filename = match[1]!
    }

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  },

  async importData(file: File): Promise<ImportReport> {
    const formData = new FormData()
    formData.append('file', file)

    const { useAuthStore } = await import('../stores/authStore')
    const authStore = useAuthStore.getState()
    const headers: Record<string, string> = {}
    if (authStore.isAuthenticated) {
      headers['X-Requested-With'] = 'XMLHttpRequest'
    }

    const response = await fetch(`${API_BASE_URL}/export-import/import`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: formData,
    })

    if (!response.ok) {
      let message = response.statusText
      try {
        const errorData = await response.json()
        message = errorData.detail || message
      } catch {
        // ignore
      }
      throw new Error(message)
    }

    return response.json()
  },
}
