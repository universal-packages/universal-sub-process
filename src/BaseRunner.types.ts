export enum Status {
  IDLE = 'idle',
  RUNNING = 'running',
  SUCCESS = 'success',
  ERROR = 'error',
  FAILURE = 'failure',
  STOPPING = 'stopping',
  STOPPED = 'stopped',
  KILLING = 'killing',
  KILLED = 'killed'
}

export enum StatusLevel {
  idle = 0,
  running = 1,
  stopping = 1,
  killing = 1,
  success = 2,
  failure = 2,
  error = 2,
  stopped = 2,
  killed = 2
}

export interface BaseRunnerOptions {
  timeout?: number | string
}
