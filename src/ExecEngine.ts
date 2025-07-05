import { ChildProcess, exec } from 'child_process'

import { BaseChildProcessEngine } from './BaseChildProcessEngine'
import { ExecEngineOptions } from './ExecEngine.types'

export class ExecEngine extends BaseChildProcessEngine {
  public readonly options: ExecEngineOptions

  public constructor(options?: ExecEngineOptions) {
    super()

    this.options = { encoding: null, shell: this.getShellName(), maxBuffer: 1024 * 1024 * 10, ...options }
  }

  protected override createChildProcess(command: string, args: string[] = [], env: Record<string, string> = {}, workingDirectory?: string): ChildProcess {
    const commandToRun = `${command} ${args.join(' ')}`.trim()
    const sourcedCommand = this.prependShellSourceScript(commandToRun, this.options.shell)
    const finalEnv = { ...process.env, ...this.options.env, ...env }

    return exec(sourcedCommand, { ...this.options, env: finalEnv, cwd: workingDirectory }, (error) => {
      if (error) this.error = error
    })
  }
}
