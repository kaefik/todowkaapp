/// <reference types="vite/client" />
declare module 'virtual:pwa-register/react' {
  export interface RegisterSWOptions {
    immediate?: boolean
    onRegisteredSW?: (swScriptUrl: string, registration: ServiceWorkerRegistration | undefined) => void
    onRegisterError?: (error: Error) => void
  }

  export function useRegisterSW(options?: RegisterSWOptions): {
    needRefresh: [boolean, (needRefresh: boolean) => void]
    updateServiceWorker: (reloadPage?: boolean) => Promise<void>
  }
}
