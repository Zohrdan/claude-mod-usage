export type Limit = { kind: string; percent: number; resetsAt?: string }

export type Snapshot = {
  model?: string
  contextPercent?: number
  contextTokens?: number
  contextWindow?: number
  limits: Limit[]
  usd?: number
}

declare module 'claude-code' {
  interface PluginState {
    'usage-bar': { snapshot: Snapshot; now: number; isHidden: boolean }
  }
}
