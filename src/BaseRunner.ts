import { EventEmitter } from '@universal-packages/event-emitter'
import { Measurement, TimeMeasurer, startMeasurement } from '@universal-packages/time-measurer'
import ms from 'ms'

import { Status } from './SubProcess.types'

const STATUS_LEVEL_MAP = {
  [Status.IDLE]: 0,
  [Status.RUNNING]: 1,
  [Status.STOPPING]: 1,
  [Status.SUCCESS]: 2,
  [Status.FAILURE]: 2,
  [Status.ERROR]: 2,
  [Status.STOPPED]: 2
}

const LEVEL_STATUSES_MAP = {
  0: [Status.IDLE],
  1: [Status.RUNNING, Status.STOPPING],
  2: [Status.STOPPED, Status.FAILURE, Status.ERROR, Status.SUCCESS]
}

export default class BaseRunner<O extends Record<string, any>> extends EventEmitter {
  public readonly options: O

  public get status(): Status {
    return this.internalStatus
  }

  public get startedAt(): Date {
    return new Date(this.internalStartedAt)
  }

  public get endedAt(): Date {
    return new Date(this.internalEndedAt)
  }

  public get measurement(): Measurement {
    return this.internalMeasurement
  }

  protected internalStatus: Status = Status.IDLE
  protected internalStartedAt: number
  protected internalEndedAt: number
  protected internalMeasurement: Measurement
  protected timeMeasurer: TimeMeasurer
  protected failureMessage?: string

  protected stopPromise?: Promise<void>
  protected stopPromiseSolver?: () => void

  private timeout?: NodeJS.Timeout

  public constructor(options: O) {
    super()
    this.options = options
  }

  public async run(): Promise<void> {
    switch (this.internalStatus) {
      case Status.RUNNING:
        if (this.listenerCount('warning') > 0) {
          this.emit('warning', { message: 'Already running' })
        } else {
          throw new Error('Already running')
        }
        return
      case Status.IDLE:
        break
      default:
        if (this.listenerCount('warning') > 0) {
          this.emit('warning', { message: 'Already ran' })
        } else {
          throw new Error('Already ran')
        }
        return
    }

    if (this.options.timeout) {
      this.timeout = setTimeout(
        () => {
          this.emit('timeout')

          this.waitForStatus(Status.RUNNING).then(() => this.stop())
        },
        typeof this.options.timeout === 'string' ? ms(this.options.timeout) : this.options.timeout
      )
    }

    try {
      try {
        await this.prepare()

        await this.internalRun(() => {
          this.internalStatus = Status.RUNNING
          this.timeMeasurer = startMeasurement()
          this.internalStartedAt = Date.now()

          this.emit(this.internalStatus, { payload: { startedAt: this.startedAt } })
        })
      } catch (error) {
        this.internalStatus = Status.ERROR

        throw error
      }

      clearTimeout(this.timeout)

      this.internalMeasurement = this.timeMeasurer.finish()
      this.internalEndedAt = Date.now()

      if ([Status.SUCCESS, Status.RUNNING].includes(this.internalStatus)) {
        if ([Status.RUNNING].includes(this.internalStatus)) this.internalStatus = Status.SUCCESS

        this.emit(this.internalStatus, { measurement: this.internalMeasurement })
        this.emit('end', { measurement: this.internalMeasurement, payload: { endedAt: this.endedAt } })
        if (this.stopPromiseSolver) this.stopPromiseSolver()
      } else {
        this.handleFailure()
      }
    } catch (error) {
      if (this.listenerCount('error') > 0) {
        this.emit('error', { error })
      } else {
        throw error
      }
    } finally {
      clearTimeout(this.timeout)

      try {
        await this.release()
      } catch (error) {
        this.internalStatus = Status.ERROR

        if (this.listenerCount('error') > 0) {
          this.emit('error', { error })
        } else {
          throw error
        }
      }
    }
  }

  public async stop(): Promise<void> {
    if ([Status.IDLE].includes(this.internalStatus)) return
    if ([Status.RUNNING].includes(this.internalStatus)) {
      this.internalStatus = Status.STOPPING
      this.emit(this.internalStatus)

      this.stopPromise = new Promise((resolve) => (this.stopPromiseSolver = resolve))

      this.internalStop()
    }

    await this.stopPromise
  }

  public async waitForStatus(status: Status): Promise<void> {
    if (STATUS_LEVEL_MAP[status] <= STATUS_LEVEL_MAP[this.internalStatus]) return

    await Promise.any(LEVEL_STATUSES_MAP[STATUS_LEVEL_MAP[status]].map((status) => this.waitFor(status)))
  }

  protected async internalRun(_onRunning: () => void): Promise<void> {
    throw new Error('Not implemented')
  }

  protected async internalStop(): Promise<void> {
    throw new Error('Not implemented')
  }

  protected internalKill(): void {
    throw new Error('Not implemented')
  }

  protected async prepare(): Promise<void> {
    throw new Error('Not implemented')
  }

  protected async release(): Promise<void> {
    throw new Error('Not implemented')
  }

  protected handleFailure(): void {
    if ([Status.STOPPING].includes(this.internalStatus)) {
      this.internalStatus = Status.STOPPED
      this.failureMessage = this.failureMessage || 'Stopped'
    }

    if (this.listenerCount(this.internalStatus) > 0 || this.listenerCount('end') > 0) {
      this.emit(this.internalStatus, { measurement: this.internalMeasurement })
      this.emit('end', { measurement: this.internalMeasurement, payload: { endedAt: this.endedAt } })
      if (this.stopPromiseSolver) this.stopPromiseSolver()
    } else {
      if (this.stopPromiseSolver) this.stopPromiseSolver()
      throw new Error(this.failureMessage)
    }
  }
}
