import type { PerchApi } from '../shared/types'

declare global {
  interface Window {
    perch: PerchApi
  }
}

export {}
