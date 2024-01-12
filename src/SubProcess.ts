import { resolveAdapter } from '@universal-packages/adapter-resolver'
import { checkDirectory } from '@universal-packages/fs-utils'
import { Readable } from 'stream'

import BaseRunner from './BaseRunner'
import { Status } from './BaseRunner.types'
import EngineProcess from './EngineProcess'
import ExecEngine from './ExecEngine'
import ForkEngine from './ForkEngine'
import SpawnEngine from './SpawnEngine'
import { EngineInterface, EngineInterfaceClass, SubProcessOptions } from './SubProcess.types'
import TestEngine from './TestEngine'

export default class SubProcess extends BaseRunner<SubProcessOptions> {
  public get stdout(): Buffer {
    return Buffer.concat(this.stdoutChunks)
  }

  public get stderr(): Buffer {
    return Buffer.concat(this.stderrChunks)
  }

  public get exitCode(): number {
    return this.internalExitCode
  }

  public get signal(): string | number {
    return this.internalSignal
  }

  public get processId(): number {
    return this.internalProcessId
  }

  private readonly engine: EngineInterface
  private readonly input: Readable
  private readonly command: string
  private readonly args: string[]
  private readonly env: Record<string, string>

  private readonly stdoutChunks: Buffer[] = []
  private readonly stderrChunks: Buffer[] = []
  private engineProcess?: EngineProcess
  private internalExitCode: number
  private internalSignal: string | number
  private killWithSignal?: NodeJS.Signals | number
  private internalProcessId: number

  constructor(options: SubProcessOptions) {
    super({ engine: process.env.NODE_ENV === 'test' ? 'test' : 'spawn', ...options })

    this.command = this.extractCommand(options.command)
    this.args = this.extractArgs(options.command, options.args)
    this.env = options.env || {}
    this.input = this.generateInputStream(options.input)
    this.engine = this.generateEngine()
  }

  public async kill(signal?: NodeJS.Signals | number): Promise<void> {
    if (this.killWithSignal === undefined) this.killWithSignal = signal || null

    return this.stop()
  }

  protected async internalRun(onRunning: () => void): Promise<void> {
    const finalWorkingDirectory = this.options.workingDirectory ? checkDirectory(this.options.workingDirectory) : undefined

    this.engineProcess = await this.engine.run(this.command, this.args, this.input, this.env, finalWorkingDirectory)
    this.internalProcessId = this.engineProcess.processId

    onRunning()

    return new Promise(async (resolve) => {
      this.engineProcess.on('stdout', (data) => {
        this.stdoutChunks.push(data)

        this.emit('stdout', { payload: { data } })
      })

      this.engineProcess.on('stderr', (data) => {
        this.stderrChunks.push(data)

        this.emit('stderr', { payload: { data } })
      })

      this.engineProcess.on('success', () => {
        this.internalStatus = Status.SUCCESS
        this.internalExitCode = 0

        this.engineProcess.removeAllListeners()
        this.engineProcess = null

        resolve()
      })

      this.engineProcess.on('failure', (exitCode) => {
        this.internalStatus = Status.FAILURE
        this.internalExitCode = exitCode
        this.failureMessage = `Process exited with code ${exitCode}\n\n${this.stderr.toString()}`

        this.engineProcess.removeAllListeners()
        this.engineProcess = null

        resolve()
      })

      this.engineProcess.on('killed', (signal) => {
        this.internalStatus = Status.STOPPED
        this.internalSignal = signal

        this.engineProcess.removeAllListeners()
        this.engineProcess = null

        resolve()
      })
    })
  }

  protected async internalKill(): Promise<void> {
    this.engineProcess?.kill(this.killWithSignal || undefined)
  }

  protected async internalStop(): Promise<void> {
    await this.internalKill()
  }

  protected async prepare(): Promise<void> {
    if (this.engine.prepare) await this.engine.prepare()
  }

  protected async release(): Promise<void> {
    if (this.engine.release) await this.engine.release()
  }

  private extractCommand(command: string): string {
    return command.split(' ')[0]
  }

  private extractArgs(command: string, args?: string[]): string[] {
    const commandArgs = command.split(' ').slice(1)

    return args ? [...commandArgs, ...args] : commandArgs
  }

  private generateInputStream(input?: string | Buffer | string[] | Buffer[] | Readable): Readable {
    if (input) {
      if (input instanceof Readable) {
        input.push('\n')
        input.push(null)
        return input
      } else {
        const readable = new Readable()

        if (Array.isArray(input)) {
          for (let i = 0; i < input.length; i++) {
            readable.push(input[i])
          }
        } else {
          readable.push(input)
        }

        readable.push('\n')
        readable.push(null)

        return readable
      }
    } else {
      const readable = new Readable()

      readable.push('\n')
      readable.push(null)

      return readable
    }
  }

  private generateEngine(): EngineInterface {
    if (typeof this.options.engine === 'string') {
      const AdapterModule = resolveAdapter<EngineInterfaceClass>({
        name: this.options.engine,
        domain: 'sub-process',
        type: 'engine',
        internal: { exec: ExecEngine, fork: ForkEngine, spawn: SpawnEngine, test: TestEngine }
      })
      return new AdapterModule(this.options.engineOptions)
    } else {
      return this.options.engine
    }
  }
}
