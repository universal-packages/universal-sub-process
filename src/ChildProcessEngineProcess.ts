import { ChildProcess } from 'child_process'

import EngineProcess from './EngineProcess'

export default class ChildProcessEngineProcess extends EngineProcess<ChildProcess> {
  public async killObject(signal?: NodeJS.Signals | number): Promise<void> {
    this.object.kill(signal)
  }
}
