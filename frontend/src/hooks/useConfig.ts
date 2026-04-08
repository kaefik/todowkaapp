import { useState, useEffect } from 'react'
import { httpClient } from '../api/httpClient'
import { ApiError } from '../api/httpClient'

interface Config {
  registration_enabled: boolean
}

export function useConfig() {
  const [config, setConfig] = useState<Config | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchConfig = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await httpClient.get<Config>('/config')
        setConfig(response.data)
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message)
        } else {
          setError('Failed to load config')
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchConfig()
  }, [])

  return { config, isLoading, error }
}
