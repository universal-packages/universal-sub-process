import { AdapterResolver } from '@universal-packages/adapter-resolver'
import { BaseRunner } from '@universal-packages/base-runner'
import { Readable } from 'stream'

import EngineProcess from './EngineProcess'
import ExecEngine from './ExecEngine'
import ForkEngine from './ForkEngine'
import SpawnEngine from './SpawnEngine'
import { EngineInterface, EngineInterfaceClass, SubProcessEventMap, SubProcessOptions } from './SubProcess.types'
import TestEngine from './TestEngine'

export default class SubProcess extends BaseRunner<SubProcessEventMap> {
  declare public readonly options: SubProcessOptions

  private _engine: EngineInterface = new SpawnEngine()
  private _isMyEngine: boolean = true
  private _input?: Readable
  private _command: string = ''
  private _args: string[] = []
  private _env: Record<string, string> = {}

  private readonly _stdoutChunks: Buffer[] = []
  private readonly _stderrChunks: Buffer[] = []
  private _engineProcess: EngineProcess | null = null
  private _internalExitCode: number = 0
  private _internalSignal: string | number = 0
  private _killWithSignal?: NodeJS.Signals | number
  private _internalProcessId: number = 0

  public get stdout(): string {
    return Buffer.concat(this._stdoutChunks.map((chunk) => new Uint8Array(chunk))).toString()
  }

  public get stderr(): string {
    return Buffer.concat(this._stderrChunks.map((chunk) => new Uint8Array(chunk))).toString()
  }

  public get exitCode(): number {
    return this._internalExitCode
  }

  public get signal(): string | number {
    return this._internalSignal
  }

  public get processId(): number {
    return this._internalProcessId
  }

  constructor(options: SubProcessOptions) {
    super({ engine: process.env.NODE_ENV === 'test' ? 'test' : 'spawn', ...options })
  }

  public async kill(signal?: NodeJS.Signals | number): Promise<void> {
    if (!this._killWithSignal && signal) this._killWithSignal = signal

    return this.stop()
  }

  public pushInput(input: string | Buffer | string[] | Buffer[]): void {
    this._engineProcess?.pushInput(input)
  }

  public closeInput(): void {
    this._engineProcess?.closeInput()
  }

  protected override async internalPrepare(): Promise<void> {
    const engineResult = await this._generateEngine()
    this._engine = engineResult.engine
    this._isMyEngine = engineResult.isMine

    if (this._isMyEngine && this._engine.prepare) await this._engine.prepare()

    this._command = this._extractCommand(this.options.command)
    this._args = this._extractArgs(this.options.command, this.options.args)
    this._env = this.options.env || {}
    this._input = this._generateInputStream(this.options.input)
  }

  protected override async internalRun(): Promise<string | Error | void> {
    const finalWorkingDirectory = this.options.workingDirectory ? this.options.workingDirectory : undefined

    const engineProcess = await this._engine.run(this._command, this._args, this._env, this._input, finalWorkingDirectory)
    this._engineProcess = engineProcess
    this._internalProcessId = engineProcess.processId

    return new Promise(async (resolve) => {
      engineProcess.on('stdout', (data) => {
        if (this.options.captureStreams) this._stdoutChunks.push(data)

        this.emit('stdout', { payload: { data: data.toString() } })
      })

      engineProcess.on('stderr', (data) => {
        if (this.options.captureStreams) this._stderrChunks.push(data)

        this.emit('stderr', { payload: { data: data.toString() } })
      })

      engineProcess.on('success', () => {
        this._internalExitCode = 0

        engineProcess.removeAllListeners()
        this._engineProcess = null

        resolve()
      })

      engineProcess.on('failure', (exitCode) => {
        this._internalExitCode = exitCode

        engineProcess.removeAllListeners()
        this._engineProcess = null

        resolve(new Error(`Process exited with code ${exitCode}${this._stderrChunks.length > 0 ? `\n\n${this.stderr}` : ''}`))
      })

      engineProcess.on('killed', (signal) => {
        this._internalSignal = signal

        engineProcess.removeAllListeners()
        this._engineProcess = null

        resolve(new Error(`Process killed with signal ${signal}`))
      })
    })
  }

  protected override async internalStop(): Promise<void> {
    this._engineProcess?.kill(this._killWithSignal)
  }

  protected override async internalRelease(): Promise<void> {
    if (this._isMyEngine && this._engine.release) await this._engine.release()
  }

  private _extractCommand(command: string): string {
    return command.split(' ')[0]
  }

  private _extractArgs(command: string, args?: string[]): string[] {
    const commandArgs = command.split(' ').slice(1)

    return args ? [...commandArgs, ...args] : commandArgs
  }

  private _generateInputStream(input?: string | Buffer | string[] | Buffer[] | Readable): Readable | undefined {
    if (input !== undefined) {
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
    }

    return undefined
  }

  private async _generateEngine(): Promise<{ engine: EngineInterface; isMine: boolean }> {
    if (typeof this.options.engine === 'string') {
      const adapterResolver = new AdapterResolver<EngineInterfaceClass>({
        domain: 'sub-process',
        type: 'engine',
        internal: { exec: ExecEngine, fork: ForkEngine, spawn: SpawnEngine, test: TestEngine }
      })

      const AdapterModule = await adapterResolver.resolve(this.options.engine)

      return { engine: new AdapterModule(this.options.engineOptions as any), isMine: true }
    } else if (this.options.engine) {
      return { engine: this.options.engine, isMine: false }
    } else {
      throw new Error('No engine provided')
    }
  }
}
