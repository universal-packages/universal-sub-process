import { ChildProcess } from 'child_process'

import { EngineProcess } from './EngineProcess'

export class ChildProcessEngineProcess extends EngineProcess<ChildProcess> {
  public override async killObject(signal?: NodeJS.Signals | number): Promise<void> {
    this.object.kill(signal)
  }

  public override pushInputObject(input: string | Buffer | string[] | Buffer[]): void {
    if (Array.isArray(input)) {
      for (let i = 0; i < input.length; i++) {
        this.object.stdin?.write(input[i])
      }
    } else {
      this.object.stdin?.write(input)
    }
  }

  public override closeInputObject(): void {
    this.object.stdin?.end()
  }
}
