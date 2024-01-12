export enum Status {
  IDLE = 'idle',
  RUNNING = 'running',
  SUCCESS = 'success',
  ERROR = 'error',
  FAILURE = 'failure',
  STOPPING = 'stopping',
  STOPPED = 'stopped'
}

export interface BaseRunnerOptions {
  timeout?: number | string
}
