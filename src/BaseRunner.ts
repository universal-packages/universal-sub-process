import { EventEmitter } from '@universal-packages/event-emitter'
import { Measurement, TimeMeasurer, startMeasurement } from '@universal-packages/time-measurer'
import ms from 'ms'

import { Status } from './BaseRunner.types'

const STATUS_LEVEL_MAP = {
  [Status.Idle]: 0,
  [Status.Running]: 1,
  [Status.Stopping]: 1,
  [Status.Success]: 2,
  [Status.Failure]: 2,
  [Status.Error]: 2,
  [Status.Stopped]: 2,
  [Status.Skipped]: 2
}

const LEVEL_STATUSES_MAP = {
  0: [Status.Idle],
  1: [Status.Running, Status.Stopping],
  2: [Status.Stopped, Status.Failure, Status.Error, Status.Success, Status.Skipped]
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

  protected internalStatus: Status = Status.Idle
  protected internalError?: Error
  protected internalStartedAt: number
  protected internalEndedAt: number
  protected internalMeasurement: Measurement
  protected timeMeasurer: TimeMeasurer

  protected stopPromise?: Promise<void>
  protected stopPromiseSolver?: () => void

  private timeout?: NodeJS.Timeout

  public constructor(options: O) {
    super()
    this.options = options
  }

  public async run(): Promise<void> {
    switch (this.internalStatus) {
      case Status.Running:
        if (this.listenerCount('warning') > 0) {
          this.emit('warning', { message: 'Already running' })
        } else {
          throw new Error('Already running')
        }
        return
      case Status.Skipped:
        if (this.listenerCount('warning') > 0) {
          this.emit('warning', { message: 'Already skipped' })
        } else {
          throw new Error('Already skipped')
        }
        return
      case Status.Idle:
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

          this.waitForStatus(Status.Running).then(() => this.stop())
        },
        typeof this.options.timeout === 'string' ? ms(this.options.timeout) : this.options.timeout
      )
    }

    try {
      let onRunCalled = false

      try {
        await this.internalPrepare()

        await this.internalRun(() => {
          this.internalStatus = Status.Running
          this.timeMeasurer = startMeasurement()
          this.internalStartedAt = Date.now()
          onRunCalled = true

          this.emit(this.internalStatus, { payload: { startedAt: this.startedAt } })
        })
      } catch (error) {
        this.internalStatus = Status.Error

        throw error
      }

      if (!onRunCalled) {
        this.emit('warning', {
          message: 'InternalRun never called onRun argument, this runner is not able to communicate when it starts running nor able to measure started time and running time.'
        })
      }

      clearTimeout(this.timeout)

      if (this.timeMeasurer) this.internalMeasurement = this.timeMeasurer.finish()
      this.internalEndedAt = Date.now()

      if ([Status.Success, Status.Running].includes(this.internalStatus)) {
        if ([Status.Running].includes(this.internalStatus)) this.internalStatus = Status.Success

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
        await this.internalRelease()
      } catch (error) {
        this.internalStatus = Status.Error

        if (this.listenerCount('error') > 0) {
          this.emit('error', { error })
        } else {
          throw error
        }
      }
    }
  }

  public async stop(): Promise<void> {
    if ([Status.Idle].includes(this.internalStatus)) return
    if ([Status.Running].includes(this.internalStatus)) {
      this.internalStatus = Status.Stopping
      this.emit(this.internalStatus)

      this.stopPromise = new Promise((resolve) => (this.stopPromiseSolver = resolve))

      this.internalStop()
    }

    await this.stopPromise
  }

  public skip(reason?: string): void {
    if ([Status.Idle].includes(this.internalStatus)) {
      this.internalStatus = Status.Skipped
      reason ? this.emit(this.internalStatus, { payload: { reason } }) : this.emit(this.internalStatus)
    }
  }

  public async waitForStatus(Status: Status): Promise<void> {
    if (STATUS_LEVEL_MAP[Status] <= STATUS_LEVEL_MAP[this.internalStatus]) return

    await Promise.any(LEVEL_STATUSES_MAP[STATUS_LEVEL_MAP[Status]].map((Status) => this.waitFor(Status)))
  }

  protected async internalRun(_onRunning: () => void): Promise<void> {
    throw new Error('Not implemented')
  }

  protected async internalStop(): Promise<void> {
    throw new Error('Not implemented')
  }

  protected async internalPrepare(): Promise<void> {
    // Not required
  }

  protected async internalRelease(): Promise<void> {
    // Not required
  }

  protected handleFailure(): void {
    if ([Status.Stopping].includes(this.internalStatus)) {
      this.internalStatus = Status.Stopped
      this.internalError = this.internalError || new Error('Stopped')
    }

    if (this.listenerCount(this.internalStatus) > 0 || this.listenerCount('end') > 0) {
      this.emit(this.internalStatus, { error: this.internalError, measurement: this.internalMeasurement })
      this.emit('end', { error: this.internalError, measurement: this.internalMeasurement, payload: { endedAt: this.endedAt } })
      if (this.stopPromiseSolver) this.stopPromiseSolver()
    } else {
      if (this.stopPromiseSolver) this.stopPromiseSolver()
      throw this.internalError
    }
  }
}
