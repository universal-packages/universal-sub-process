import { EventEmitter } from '@universal-packages/event-emitter'
import os from 'os'

import { MESSAGE_WRAPPER_END, MESSAGE_WRAPPER_START, MessagePackage, OrchestrationEventMap, OrchestrationOptions, OrchestrationStatus } from './Orchestration.types'
import { SortedSet } from './SortedSet'
import { SubProcess } from './SubProcess'
import { SubProcessOptions } from './SubProcess.types'

export class Orchestration extends EventEmitter<OrchestrationEventMap> {
  declare readonly options: OrchestrationOptions

  private _status: OrchestrationStatus = OrchestrationStatus.Idle

  private _pendingSubProcessesOptions: SubProcessOptions[] = []
  private _runningSubProcesses: SubProcess[] = []
  private _completedSubProcesses: SubProcess[] = []
  private _runPromiseResolve: (() => void) | null = null
  private _availableProcessIndexes: SortedSet<number> = new SortedSet()
  private _subProcessBuffers: Map<SubProcess, string> = new Map()

  public static sendMessageToParent(data: Record<string, any>): void {
    const messagePackage: MessagePackage = { type: 'message', data }
    const messagePackageString = `${MESSAGE_WRAPPER_START}${JSON.stringify(messagePackage, (_key, value) => {
      if (typeof value === 'bigint') {
        return value.toString()
      }
      return value
    })}${MESSAGE_WRAPPER_END}`

    console.log(messagePackageString)
  }

  public static closeCommunicationWithParent(): void {
    const messagePackage: MessagePackage = { type: 'close-communication', data: {} }
    const messagePackageString = `${MESSAGE_WRAPPER_START}${JSON.stringify(messagePackage, (_key, value) => {
      if (typeof value === 'bigint') {
        return value.toString()
      }
      return value
    })}${MESSAGE_WRAPPER_END}`
    console.log(messagePackageString)
  }

  public static onParentMessage(callback: (data: Record<string, any>) => void) {
    let buffer = ''

    const listener = (chunk: string) => {
      buffer += chunk

      // Process all complete messages in the buffer
      let startIndex: number
      while ((startIndex = buffer.indexOf(MESSAGE_WRAPPER_START)) !== -1) {
        const endIndex = buffer.indexOf(MESSAGE_WRAPPER_END, startIndex)
        if (endIndex === -1) {
          // Incomplete message, wait for more data
          break
        }

        try {
          const messageJson = buffer.substring(startIndex + MESSAGE_WRAPPER_START.length, endIndex)
          const orchestrationMessage: MessagePackage = JSON.parse(messageJson)

          if (orchestrationMessage.type === 'message') {
            callback(orchestrationMessage.data)
          }
        } catch (error) {
          // Ignore malformed messages
        }

        // Remove processed message from buffer
        buffer = buffer.substring(endIndex + MESSAGE_WRAPPER_END.length)
      }
    }

    process.stdin.setEncoding('utf8')
    process.stdin.on('data', listener)

    return () => {
      process.stdin.off('data', listener)
    }
  }

  public constructor(options?: OrchestrationOptions) {
    super({
      maxConcurrency: os.cpus().length - 1,
      stopOnFailure: false,
      ...options
    })

    this.options.maxConcurrency = Math.max(1, this.options.maxConcurrency!)

    for (let i = 1; i <= this.options.maxConcurrency!; i++) {
      this._availableProcessIndexes.add(i)
    }

    // Add initial processes if provided
    if (this.options.processes) {
      for (const processOptions of this.options.processes) {
        this.addProcess(processOptions)
      }
    }
  }

  public addProcess(processOptions: SubProcessOptions): void {
    this._pendingSubProcessesOptions.push(processOptions)
    this._runNextProcess()
  }

  public async run(): Promise<void> {
    if (this._status !== OrchestrationStatus.Idle) return

    this._status = OrchestrationStatus.Running

    if (this._pendingSubProcessesOptions.length === 0) {
      this._status = OrchestrationStatus.Idle
      return
    }

    return new Promise<void>((resolve) => {
      this._runPromiseResolve = resolve

      for (let i = 0; i < this.options.maxConcurrency!; i++) {
        this._runNextProcess()
      }
    })
  }

  public async stop() {
    if (this._status !== OrchestrationStatus.Running) return

    this._status = OrchestrationStatus.Stopping

    await Promise.all(this._runningSubProcesses.map((subProcess) => subProcess.kill()))

    this._status = OrchestrationStatus.Idle

    // Clean up all subprocess buffers
    this._subProcessBuffers.clear()

    this._runPromiseResolve?.()
    this._runPromiseResolve = null
  }

  public sendMessage(data: Record<string, any>, processIndex?: number): void {
    const subProcessToSendMessage: SubProcess[] = this._runningSubProcesses.filter((subProcess) => (processIndex ? subProcess.processIndex === processIndex : true))

    for (const subProcess of subProcessToSendMessage) {
      const messagePackage: MessagePackage = { type: 'message', data }
      const messagePackageString = `${MESSAGE_WRAPPER_START}${JSON.stringify(messagePackage, (_key, value) => {
        if (typeof value === 'bigint') {
          return value.toString()
        }
        return value
      })}${MESSAGE_WRAPPER_END}`

      subProcess.pushInput(messagePackageString)
    }
  }

  private async _runNextProcess() {
    if (this._status !== OrchestrationStatus.Running) return
    if (this._runningSubProcesses.length >= this.options.maxConcurrency!) return
    if (this._pendingSubProcessesOptions.length === 0) return

    const subProcessOptions = this._pendingSubProcessesOptions.shift()!
    const processIndex = this._availableProcessIndexes.shift()!
    const subProcess = new SubProcess({
      ...subProcessOptions,
      processIndex
    })

    this._runningSubProcesses.push(subProcess)

    subProcess.on('**' as any, (event) => {
      if (event.event === 'stdout') {
        const data: string = event.payload.data

        this._processBufferedMessages(subProcess, data)
      }

      this.emit(`process:${event.event}` as keyof OrchestrationEventMap, { ...event, payload: { ...event.payload, subProcess } })
    })

    subProcess.on(['succeeded', 'failed', 'stopped', 'timed-out'], (event) => {
      this._runningSubProcesses.splice(this._runningSubProcesses.indexOf(subProcess), 1)
      this._completedSubProcesses.push(subProcess)
      this._availableProcessIndexes.add(processIndex)

      // Clean up buffer for completed subprocess
      this._subProcessBuffers.delete(subProcess)

      if (this._pendingSubProcessesOptions.length === 0 && this._runningSubProcesses.length === 0) {
        this._status = OrchestrationStatus.Idle

        this._runPromiseResolve!()
        this._runPromiseResolve = null
      } else {
        if (event.event === 'succeeded') {
          this._runNextProcess()
        } else {
          if (this.options.stopOnFailure) {
            this.stop()
          } else {
            this._runNextProcess()
          }
        }
      }
    })

    subProcess.run()
  }

  private _processBufferedMessages(subProcess: SubProcess, newData: string): void {
    // Get existing buffer for this subprocess or initialize empty string
    let buffer = this._subProcessBuffers.get(subProcess) || ''

    // Add new data to buffer
    buffer += newData

    // Process all complete messages in the buffer
    let startIndex: number
    while ((startIndex = buffer.indexOf(MESSAGE_WRAPPER_START)) !== -1) {
      const endIndex = buffer.indexOf(MESSAGE_WRAPPER_END, startIndex)
      if (endIndex === -1) {
        // Incomplete message, wait for more data
        break
      }

      try {
        const messageJson = buffer.substring(startIndex + MESSAGE_WRAPPER_START.length, endIndex)
        const messagePackage: MessagePackage = JSON.parse(messageJson)

        if (messagePackage.type === 'close-communication') {
          subProcess.closeInput()
        } else {
          this.emit('process:message', { payload: { subProcess, data: messagePackage.data } })
        }
      } catch (error) {
        // Ignore malformed messages
      }

      // Remove processed message from buffer
      buffer = buffer.substring(endIndex + MESSAGE_WRAPPER_END.length)
    }

    // Update buffer for this subprocess
    this._subProcessBuffers.set(subProcess, buffer)
  }
}
