import { ChildProcess, fork } from 'child_process'

import BaseChildProcessEngine from './BaseChildProcessEngine'
import { ForkEngineOptions } from './ForkEngine.types'

export default class ForkEngine extends BaseChildProcessEngine {
  public readonly options: ForkEngineOptions

  public constructor(options?: ForkEngineOptions) {
    super()

    this.options = { silent: true, ...options }
  }

  protected createChildProcess(command: string, args: string[] = [], env: Record<string, string> = {}, workingDirectory?: string): ChildProcess {
    const finalEnv = { ...this.options.env, ...env }

    return fork(command, args, { ...this.options, env: finalEnv, cwd: workingDirectory })
  }
}
