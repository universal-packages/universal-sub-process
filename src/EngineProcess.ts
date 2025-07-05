import { EventEmitter } from 'events'

export class EngineProcess<O = any> extends EventEmitter {
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

  public pushInput(input: string | Buffer | string[] | Buffer[]): void {
    this.pushInputObject(input)
  }

  public closeInput(): void {
    this.closeInputObject()
  }

  protected killObject(_signal?: NodeJS.Signals | number): void {
    throw new Error('Not implemented')
  }

  protected pushInputObject(_input: string | Buffer | string[] | Buffer[]): void {
    throw new Error('Not implemented')
  }

  protected closeInputObject(): void {
    throw new Error('Not implemented')
  }
}
