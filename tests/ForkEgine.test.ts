import { Measurement } from '@universal-packages/time-measurer'

import { ForkEngine, Status, SubProcess } from '../src'

describe(ForkEngine, (): void => {
  it('runs a given command', async (): Promise<void> => {
    const subProcess = new SubProcess({ engine: 'fork', command: './tests/__fixtures__/command.js', args: ['any'] })
    const listener = jest.fn()

    subProcess.on('*', listener)

    await subProcess.run()

    expect(subProcess.status).toEqual(Status.Success)
    expect(subProcess.signal).toBeUndefined()
    expect(subProcess.exitCode).toEqual(0)
    expect(subProcess.stderr).toEqual('')
    expect(subProcess.stderr).toEqual('')
    expect(subProcess.processId).toBeGreaterThan(0)

    expect(listener.mock.calls).toEqual([
      [{ event: 'running', payload: { startedAt: expect.any(Date) } }],
      [{ event: 'success', measurement: expect.any(Measurement) }],
      [{ event: 'end', measurement: expect.any(Measurement), payload: { endedAt: expect.any(Date) } }]
    ])
  })

  it('is prepared for when a process fails', async (): Promise<void> => {
    const subProcess = new SubProcess({ engine: 'fork', command: './tests/__fixtures__/failure.js', args: ['arg'] })
    const listener = jest.fn()

    subProcess.on('*', listener)

    await subProcess.run()

    expect(subProcess.status).toEqual(Status.Failure)
    expect(subProcess.signal).toBeUndefined()
    expect(subProcess.exitCode).toEqual(1)
    expect(subProcess.stdout).toEqual('')
    expect(subProcess.stderr).toEqual('')

    expect(listener.mock.calls).toEqual([
      [{ event: 'running', payload: { startedAt: expect.any(Date) } }],
      [{ event: 'failure', error: new Error('Process exited with code 1'), measurement: expect.any(Measurement) }],
      [{ event: 'end', error: new Error('Process exited with code 1'), measurement: expect.any(Measurement), payload: { endedAt: expect.any(Date) } }]
    ])
  })

  it('is prepared for when a process is killed', async (): Promise<void> => {
    const subProcess = new SubProcess({ engine: 'fork', command: './tests/__fixtures__/kill-me', args: ['100'] })
    const listener = jest.fn()

    subProcess.on('*', listener)

    subProcess.run()

    await subProcess.waitFor('running')

    await subProcess.stop()

    expect(subProcess.status).toEqual(Status.Stopped)
    expect(subProcess.signal).toEqual('SIGTERM')
    expect(subProcess.exitCode).toBeUndefined()
    expect(subProcess.stdout).toEqual('')
    expect(subProcess.stderr).toEqual('')

    expect(listener.mock.calls).toEqual([
      [{ event: 'running', payload: { startedAt: expect.any(Date) } }],
      [{ event: 'stopping' }],
      [{ event: 'stopped', error: new Error('Process killed with signal SIGTERM'), measurement: expect.any(Measurement) }],
      [{ event: 'end', error: new Error('Process killed with signal SIGTERM'), measurement: expect.any(Measurement), payload: { endedAt: expect.any(Date) } }]
    ])
  })

  it('runs on a given working directory', async (): Promise<void> => {
    const subProcess = new SubProcess({ engine: 'exec', command: 'command', workingDirectory: './tests/__fixtures__' })
    const listener = jest.fn()

    subProcess.on('*', listener)

    await subProcess.run()

    expect(subProcess.status).toEqual(Status.Success)
    expect(subProcess.signal).toBeUndefined()
    expect(subProcess.exitCode).toEqual(0)
    expect(subProcess.stderr).toEqual('')
    expect(subProcess.stderr).toEqual('')
    expect(subProcess.processId).toBeGreaterThan(0)

    expect(listener.mock.calls).toEqual([
      [{ event: 'running', payload: { startedAt: expect.any(Date) } }],
      [{ event: 'success', measurement: expect.any(Measurement) }],
      [{ event: 'end', measurement: expect.any(Measurement), payload: { endedAt: expect.any(Date) } }]
    ])
  })
})
