import EngineProcess from './EngineProcess'

export default class TestEngineProcess extends EngineProcess<{ kill: (signal?: NodeJS.Signals | number) => void }> {
  public killObject(signal?: NodeJS.Signals | number): void {
    this.object.kill(signal || 'SIGTERM')
  }
}
