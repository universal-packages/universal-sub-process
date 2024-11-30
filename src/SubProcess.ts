import { resolveAdapter } from '@universal-packages/adapter-resolver'
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
  public get stdout(): string {
    return Buffer.concat(this.stdoutChunks.map((chunk) => new Uint8Array(chunk))).toString()
  }

  public get stderr(): string {
    return Buffer.concat(this.stderrChunks.map((chunk) => new Uint8Array(chunk))).toString()
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
  private readonly isMyEngine: boolean
  private readonly input: Readable
  private readonly command: string
  private readonly args: string[]
  private readonly env: Record<string, string | number>

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

    const engineResult = this.generateEngine()
    this.engine = engineResult.engine
    this.isMyEngine = engineResult.isMine
  }

  public async kill(signal?: NodeJS.Signals | number): Promise<void> {
    if (this.killWithSignal === undefined) this.killWithSignal = signal || null

    return this.stop()
  }

  protected async internalRun(onRunning: () => void): Promise<void> {
    const finalWorkingDirectory = this.options.workingDirectory ? this.options.workingDirectory : undefined

    this.engineProcess = await this.engine.run(this.command, this.args, this.input, this.env, finalWorkingDirectory)
    this.internalProcessId = this.engineProcess.processId

    onRunning()

    return new Promise(async (resolve) => {
      this.engineProcess.on('stdout', (data) => {
        this.stdoutChunks.push(data)

        this.emit('stdout', { payload: { data: data.toString() } })
      })

      this.engineProcess.on('stderr', (data) => {
        this.stderrChunks.push(data)

        this.emit('stderr', { payload: { data: data.toString() } })
      })

      this.engineProcess.on('success', () => {
        this.internalStatus = Status.Success
        this.internalExitCode = 0

        this.engineProcess.removeAllListeners()
        this.engineProcess = null

        resolve()
      })

      this.engineProcess.on('failure', (exitCode) => {
        this.internalStatus = Status.Failure
        this.internalExitCode = exitCode
        this.internalError = new Error(`Process exited with code ${exitCode}${this.stderrChunks.length > 0 ? `\n\n${this.stderr}` : ''}`)

        this.engineProcess.removeAllListeners()
        this.engineProcess = null

        resolve()
      })

      this.engineProcess.on('killed', (signal) => {
        this.internalStatus = Status.Stopped
        this.internalSignal = signal
        this.internalError = new Error(`Process killed with signal ${signal}`)

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

  protected async internalPrepare(): Promise<void> {
    if (this.isMyEngine && this.engine.prepare) await this.engine.prepare()
  }

  protected async internalRelease(): Promise<void> {
    if (this.isMyEngine && this.engine.release) await this.engine.release()
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

  private generateEngine(): { engine: EngineInterface; isMine: boolean } {
    if (typeof this.options.engine === 'string') {
      const AdapterModule = resolveAdapter<EngineInterfaceClass>({
        name: this.options.engine,
        domain: 'sub-process',
        type: 'engine',
        internal: { exec: ExecEngine, fork: ForkEngine, spawn: SpawnEngine, test: TestEngine }
      })
      return { engine: new AdapterModule(this.options.engineOptions), isMine: true }
    } else {
      return { engine: this.options.engine, isMine: false }
    }
  }
}
