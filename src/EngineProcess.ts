import { EventEmitter } from 'stream'

export default class EngineProcess<O = any> extends EventEmitter {
  public readonly processId: number
  public readonly object: O

  constructor(processId: number, object: any) {
    super()
    this.processId = processId
    this.object = object
  }

  public kill(signal?: NodeJS.Signals | number): void {
    this.killObject(signal)
  }

  protected killObject(_signal?: NodeJS.Signals | number): void {
    throw new Error('Not implemented')
  }
}
