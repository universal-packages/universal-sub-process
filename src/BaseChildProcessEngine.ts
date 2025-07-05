import { ChildProcess, ExecException } from 'child_process'
import { Readable } from 'stream'

import { ChildProcessEngineProcess } from './ChildProcessEngineProcess'
import { EngineInterface } from './SubProcess.types'

export class BaseChildProcessEngine implements EngineInterface {
  protected error: ExecException | null = null

  public run(command: string, args: string[], env: Record<string, string>, input?: Readable, workingDirectory?: string): ChildProcessEngineProcess {
    const childProcess = this.createChildProcess(command, args, env, workingDirectory)
    const childProcessEngineProcess = new ChildProcessEngineProcess(childProcess.pid || 0, childProcess)

    childProcess.stdout?.on('data', (data) => childProcessEngineProcess.emit('stdout', data))
    childProcess.stderr?.on('data', (data) => childProcessEngineProcess.emit('stderr', data))
    childProcess.on('error', (error) => {
      this.error = error

      childProcessEngineProcess.emit('stderr', Buffer.from(error.message))
      childProcessEngineProcess.emit('failure', error['errno'] || error['code'] || 1)
    })
    childProcess.on('close', (code, signal) => {
      childProcess.removeAllListeners()
      childProcess.stdout?.removeAllListeners()
      childProcess.stderr?.removeAllListeners()
      childProcess.stdin?.removeAllListeners()

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

    // Ignore stdin errors they occur when the process is killed
    childProcess.stdin?.on('error', () => {})

    if (childProcess.stdin && input) input.pipe(childProcess.stdin)

    return childProcessEngineProcess
  }

  protected createChildProcess(_command: string, _args?: string[], _env?: Record<string, string>, _workingDirectory?: string): ChildProcess {
    throw new Error('Method createChildProcess not implemented.')
  }

  protected prependShellSourceScript(script: string, shell?: string | boolean): string {
    if (typeof shell === 'string') {
      return `source ~/.${shell}rc &> /dev/null; ${script}`
    } else {
      return script
    }
  }

  protected getShellName(): string {
    return process.env.SHELL?.split('/').pop() || 'bash'
  }
}
