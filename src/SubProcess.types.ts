import { Readable } from 'stream'

import EngineProcess from './EngineProcess'

export enum ProcessStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  SUCCESS = 'success',
  ERROR = 'error',
  FAILURE = 'failure',
  KILLED = 'killed'
}

export interface SubProcessOptions {
  args?: string[]
  command: string
  engine?: EngineInterface | string
  engineOptions?: Record<string, any>
  env?: Record<string, string>
  input?: string | Buffer | string[] | Buffer[] | Readable
  throwIfNotSuccessful?: boolean
  timeout?: number
  workingDirectory?: string
}

export interface EngineInterface {
  prepare?: () => void | Promise<void>
  release?: () => void | Promise<void>
  run: (command: string, args: string[], input: Readable, env: Record<string, string>, workingDirectory: string) => EngineProcess | Promise<EngineProcess>
}

export interface EngineInterfaceClass {
  new (options?: Record<string, any>): EngineInterface
}
