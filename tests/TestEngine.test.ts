import { Measurement } from '@universal-packages/time-measurer'
import { Readable } from 'stream'

import { ExecEngine, Status, SubProcess, TestEngine } from '../src'

beforeEach((): void => {
  TestEngine.reset()
})

describe(SubProcess, (): void => {
  it('can be configured to wait before an event', async (): Promise<void> => {
    const subProcess = new SubProcess({ command: 'some command', args: ['hello'] })
    const listener = jest.fn()

    subProcess.on('*', listener)

    const start = new Date().getTime()

    TestEngine.mockProcessEvents({
      command: 'some',
      args: ['command', 'hello'],
      events: [
        { type: 'stdout', data: 'Command stdout', wait: 500 },
        { type: 'stdout', data: 'Command stdout', wait: 500 }
      ]
    })

    await subProcess.run()

    const end = new Date().getTime()

    expect(end - start).toBeGreaterThanOrEqual(1000)
  })

  it('imitates echo command without being configured', async (): Promise<void> => {
    const subProcess = new SubProcess({ command: 'echo', args: ['hello'] })
    const listener = jest.fn()

    subProcess.on('*', listener)

    await subProcess.run()

    expect(listener.mock.calls).toEqual([
      [{ event: 'running', payload: { startedAt: expect.any(Date) } }],
      [{ event: 'stdout', payload: { data: 'hello\n' } }],
      [{ event: 'success', measurement: expect.any(Measurement) }],
      [{ event: 'end', measurement: expect.any(Measurement), payload: { endedAt: expect.any(Date) } }]
    ])
  })

  it('imitates sleep command without being configured (100x faster)', async (): Promise<void> => {
    const subProcess = new SubProcess({ command: 'sleep', args: ['100000'] })
    const listener = jest.fn()

    subProcess.on('*', listener)

    const start = new Date().getTime()

    await subProcess.run()

    const end = new Date().getTime()

    expect(end - start).toBeGreaterThanOrEqual(1000)
  })

  it('has a failure command perk', async (): Promise<void> => {
    const subProcess = new SubProcess({ command: 'failure', args: ['My message'] })
    const listener = jest.fn()

    subProcess.on('*', listener)

    await subProcess.run()

    expect(listener.mock.calls).toEqual([
      [{ event: 'running', payload: { startedAt: expect.any(Date) } }],
      [{ event: 'stderr', payload: { data: 'My message' } }],
      [{ event: 'failure', error: new Error('Process exited with code 1\n\nMy message'), measurement: expect.any(Measurement) }],
      [{ event: 'end', error: new Error('Process exited with code 1\n\nMy message'), measurement: expect.any(Measurement), payload: { endedAt: expect.any(Date) } }]
    ])
  })
})
