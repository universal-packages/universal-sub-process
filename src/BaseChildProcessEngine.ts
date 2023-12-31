import { ChildProcess, ExecException } from 'child_process'
import { Readable } from 'stream'

import ChildProcessEngineProcess from './ChildProcessEngineProcess'
import { EngineInterface } from './SubProcess.types'

export default class BaseChildProcessEngine implements EngineInterface {
  protected error: ExecException

  public run(command: string, args: string[], input: Readable, env: Record<string, string>, workingDirectory?: string): ChildProcessEngineProcess {
    const childProcess = this.createChildProcess(command, args, env, workingDirectory)
    const childProcessEngineProcess = new ChildProcessEngineProcess(childProcess.pid, childProcess)

    childProcess.stdout?.on('data', (data) => childProcessEngineProcess.emit('stdout', data))
    childProcess.stderr?.on('data', (data) => childProcessEngineProcess.emit('stderr', data))
    childProcess.on('close', (code, signal) => {
      if (code === 0) {
        childProcessEngineProcess.emit('success')
      } else if (signal) {
        childProcessEngineProcess.emit('killed', signal)
      } else {
        if (this.error) {
          childProcessEngineProcess.emit('failure', this.error.code)
        } else {
          childProcessEngineProcess.emit('failure', code)
        }
      }
    })

    if (childProcess.stdin) input.pipe(childProcess.stdin)

    return childProcessEngineProcess
  }

  protected createChildProcess(_command: string, _args?: string[], _env?: Record<string, string>, _workingDirectory?: string): ChildProcess {
    throw new Error('Not implemented')
  }

  protected prependShellSourceScript(script: string, shell: string | boolean): string {
    if (typeof shell === 'string') {
      return `source ~/.${shell}rc &> /dev/null; ${script}`
    } else {
      return script
    }
  }

  protected getShellName(): string {
    return process.env.SHELL?.split('/').pop()!
  }
}
