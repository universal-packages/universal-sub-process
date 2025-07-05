import { ChildProcess, spawn } from 'child_process'

import { BaseChildProcessEngine } from './BaseChildProcessEngine'
import { SpawnEngineOptions } from './SpawnEngine.types'

export class SpawnEngine extends BaseChildProcessEngine {
  public readonly options: SpawnEngineOptions

  public constructor(options?: SpawnEngineOptions) {
    super()

    this.options = { shell: this.getShellName(), ...options }
  }

  protected override createChildProcess(command: string, args: string[] = [], env: Record<string, string> = {}, workingDirectory?: string): ChildProcess {
    const sourcedCommand = this.prependShellSourceScript(command, this.options.shell)
    const finalEnv = { ...process.env, ...this.options.env, ...env }

    return spawn(sourcedCommand, args, { ...this.options, env: finalEnv, cwd: workingDirectory })
  }
}
