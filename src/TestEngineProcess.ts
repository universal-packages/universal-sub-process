import EngineProcess from './EngineProcess'

export default class TestEngineProcess extends EngineProcess<{ kill: () => void }> {
  public killObject(signal?: NodeJS.Signals | number): void {
    setTimeout(() => {
      this.object.kill()
      this.emit('killed', signal || 'TEST_SIGNAL')
    }, 200)
  }
}
