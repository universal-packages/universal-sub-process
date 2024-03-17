import { Measurement } from '@universal-packages/time-measurer'
import { Readable } from 'stream'

import { ExecEngine, Status, SubProcess, TestEngine } from '../src'

beforeEach((): void => {
  TestEngine.reset()
})

describe(SubProcess, (): void => {
  it('can be configured to wait before an event', async (): Promise<void> => {
    const subProcess = new SubProcess({ command: 'echo', args: ['hello'] })
    const listener = jest.fn()

    subProcess.on('*', listener)

    const start = new Date().getTime()

    TestEngine.mockProcessEvents('echo', [
      { type: 'stdout', data: 'Command stdout', wait: 1000 },
      { type: 'stdout', data: 'Command stdout', wait: 1000 }
    ])

    await subProcess.run()

    const end = new Date().getTime()

    expect(end - start).toBeGreaterThanOrEqual(2000)
  })
})
