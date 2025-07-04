import { BaseRunnerEventMap, BaseRunnerOptions } from '@universal-packages/base-runner'
import { Readable } from 'stream'

import EngineProcess from './EngineProcess'

export interface SubProcessOptions extends BaseRunnerOptions {
  args?: string[]
  command: string
  captureStreams?: boolean
  engine?: EngineInterface | string
  engineOptions?: Record<string, any>
  env?: Record<string, string>
  input?: string | Buffer | string[] | Buffer[] | Readable
  workingDirectory?: string
}

export interface EngineInterface {
  prepare?: () => void | Promise<void>
  release?: () => void | Promise<void>
  run: (command: string, args: string[], env: Record<string, string>, input?: Readable, workingDirectory?: string) => EngineProcess | Promise<EngineProcess>
}

export interface EngineInterfaceClass {
  new (options?: any): EngineInterface
}

export interface SubProcessEventMap extends BaseRunnerEventMap {
  stdout: { data: string }
  stderr: { data: string }
}
