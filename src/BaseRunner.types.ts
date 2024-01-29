export enum Status {
  Idle = 'idle',
  Running = 'running',
  Success = 'success',
  Error = 'error',
  Failure = 'failure',
  Stopping = 'stopping',
  Stopped = 'stopped',
  Skipped = 'skipped'
}

export interface BaseRunnerOptions {
  timeout?: number | string
}
