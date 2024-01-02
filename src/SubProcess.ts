import { resolveAdapter } from '@universal-packages/adapter-resolver'
import { EventEmitter } from '@universal-packages/event-emitter'
import { checkDirectory } from '@universal-packages/fs-utils'
import { startMeasurement } from '@universal-packages/time-measurer'
import { Readable } from 'stream'

import EngineProcess from './EngineProcess'
import ExecEngine from './ExecEngine'
import ForkEngine from './ForkEngine'
import SpawnEngine from './SpawnEngine'
import { EngineInterface, EngineInterfaceClass, ProcessStatus, SubProcessOptions } from './SubProcess.types'
import TestEngine from './TestEngine'

export default class Process extends EventEmitter {
  public readonly options: SubProcessOptions
  public readonly command: string
  public readonly args: string[]
  public readonly env: Record<string, string>

  public get status(): ProcessStatus {
    return this.processStatus
  }

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
    return this.engineProcess?.processId
  }

  private processStatus: ProcessStatus = ProcessStatus.IDLE

  private readonly engine: EngineInterface
  private readonly input: Readable

  private readonly stdoutChunks: Buffer[] = []
  private readonly stderrChunks: Buffer[] = []
  private engineProcess?: EngineProcess
  private internalExitCode: number
  private internalSignal: string | number

  private timeout?: NodeJS.Timeout

  constructor(options: SubProcessOptions) {
    super()
    this.options = { engine: process.env.NODE_ENV === 'test' ? 'test' : 'spawn', throwIfNotSuccessful: false, ...options }
    this.command = this.extractCommand(options.command)
    this.args = this.extractArgs(options.command, options.args)
    this.env = options.env || {}
    this.input = this.generateInputStream(options.input)
    this.engine = this.generateEngine()
  }

  public async prepare(): Promise<void> {
    if (this.engine.prepare) await this.engine.prepare()
  }

  public async release(): Promise<void> {
    if (this.engine.release) await this.engine.release()
  }

  public async run(): Promise<void> {
    switch (this.processStatus) {
      case ProcessStatus.RUNNING:
        this.emit('warning', { message: 'Process is already running', payload: { process: this } })
        return
      case ProcessStatus.IDLE:
        break
      default:
        this.emit('warning', { message: 'Process has already ended', payload: { process: this } })
        return
    }

    return new Promise(async (resolve, reject) => {
      const measurer = startMeasurement()

      this.processStatus = ProcessStatus.RUNNING

      try {
        const finalWorkingDirectory = this.options.workingDirectory ? checkDirectory(this.options.workingDirectory) : undefined

        this.engineProcess = await this.engine.run(this.command, this.args, this.input, this.env, finalWorkingDirectory)
      } catch (error) {
        this.processStatus = ProcessStatus.ERROR

        this.emit('error', { error, payload: { process: this } })
        this.options.throwIfNotSuccessful ? reject(error) : resolve()
        return
      }

      if (this.options.timeout) {
        this.timeout = setTimeout(() => {
          this.emit('timeout', { payload: { process: this } })
          this.kill()
        }, this.options.timeout)
      }

      this.emit('running', { payload: { process: this } })

      this.engineProcess.on('stdout', (data) => {
        this.stdoutChunks.push(data)

        this.emit('stdout', { payload: { data, process: this } })
      })

      this.engineProcess.on('stderr', (data) => {
        this.stderrChunks.push(data)

        this.emit('stderr', { payload: { data, process: this } })
      })

      this.engineProcess.on('success', () => {
        clearTimeout(this.timeout)

        this.internalExitCode = 0
        this.processStatus = ProcessStatus.SUCCESS

        const measurement = measurer.finish()

        this.emit('success', { measurement, payload: { process: this } })
        this.emit('end', { measurement, payload: { process: this } })
        resolve()
      })

      this.engineProcess.on('failure', (exitCode) => {
        clearTimeout(this.timeout)

        this.internalExitCode = exitCode
        this.processStatus = ProcessStatus.FAILURE

        const measurement = measurer.finish()

        this.emit('failure', { measurement, payload: { process: this } })
        this.emit('end', { measurement, payload: { process: this } })
        this.options.throwIfNotSuccessful ? reject(new Error(`Process exited with code ${exitCode}\n\n${this.stderr.toString()}`)) : resolve()
      })

      this.engineProcess.on('killed', (signal) => {
        clearTimeout(this.timeout)

        this.internalSignal = signal
        this.processStatus = ProcessStatus.KILLED

        const measurement = measurer.finish()

        this.emit('killed', { measurement, payload: { process: this } })
        this.emit('end', { measurement, payload: { process: this } })
        this.options.throwIfNotSuccessful ? reject(new Error(`Process was killed with signal ${signal}`)) : resolve()
      })
    })
  }

  public async kill(signal?: NodeJS.Signals | number): Promise<void> {
    if (this.processStatus === ProcessStatus.RUNNING) {
      this.emit('killing', { payload: { process: this } })

      return new Promise(async (resolve) => {
        this.once('end', () => resolve())

        this.engineProcess.kill(signal)
      })
    }
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
