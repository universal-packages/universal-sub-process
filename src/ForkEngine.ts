import { ChildProcess, fork } from 'child_process'

import BaseChildProcessEngine from './BaseChildProcessEngine'
import { SpawnEngineOptions } from './SpawnEngine.types'

export default class ForkEngine extends BaseChildProcessEngine {
  public readonly options: SpawnEngineOptions

  public constructor(options?: SpawnEngineOptions) {
    super()

    this.options = { shell: this.getShellName(), ...options }
  }

  protected createChildProcess(command: string, args: string[] = [], env: Record<string, string> = {}, workingDirectory?: string): ChildProcess {
    const finalEnv = { ...this.options.env, ...env }

    return fork(command, args, { ...this.options, env: finalEnv, cwd: workingDirectory })
  }
}
