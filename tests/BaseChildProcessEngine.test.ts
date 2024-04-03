import BaseChildProcessEngine from '../src/BaseChildProcessEngine'

describe(BaseChildProcessEngine, (): void => {
  it('throws when not implemented', async (): Promise<void> => {
    const childProcess = new BaseChildProcessEngine()
    let error: Error

    try {
      childProcess.run('command', [], null, {})
    } catch (e) {
      error = e
    }

    expect(error.message).toEqual('Method createChildProcess not implemented.')
  })
})
