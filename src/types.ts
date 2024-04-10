export interface Config {
  /**
   * Duration in seconds to aggregate messages.
   * @default 1
   * */
  buffer_seconds?: number
  /**
   * Discord webhook url for logs
   * @default null
   * */
  log_url: string | null
}

export interface Data {
  process: {
    name: string
    version?: string
    restart_time?: number
    unstable_restarts?: number
  }
  event?:
    | 'kill'
    | 'exception'
    | 'restart'
    | 'exit'
    | 'delete'
    | 'start'
    | 'stop'
    | 'online'
    | 'restart overlimit'
  data: string | object
  at: number
}

export interface Message extends Data {
  buffer?: string[]
  data: string
}

export type Role = 'log' | 'error' | 'event'
