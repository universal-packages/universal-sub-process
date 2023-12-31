import { Measurement } from '@universal-packages/time-measurer'

import { ForkEngine, SubProcess } from '../src'

describe(ForkEngine, (): void => {
  it('runs a given command', async (): Promise<void> => {
    const sub_process = new SubProcess({ engine: 'fork', command: './tests/__fixtures__/command.js', args: ['any'] })
    const listener = jest.fn()

    sub_process.on('*', listener)

    await sub_process.run()

    expect(sub_process.status).toEqual('success')
    expect(sub_process.signal).toBeUndefined()
    expect(sub_process.exitCode).toEqual(0)
    expect(sub_process.stderr).toEqual(Buffer.from(''))
    expect(sub_process.stderr).toEqual(Buffer.from(''))
    expect(sub_process.processId).toBeGreaterThan(0)

    expect(listener.mock.calls).toEqual([
      [{ event: 'running', payload: { process: sub_process } }],
      [{ event: 'success', measurement: expect.any(Measurement), payload: { process: sub_process } }],
      [{ event: 'end', measurement: expect.any(Measurement), payload: { process: sub_process } }]
    ])
  })

  it('is prepared for when a process fails', async (): Promise<void> => {
    const sub_process = new SubProcess({ engine: 'fork', command: './tests/__fixtures__/failure.js', args: ['arg'] })
    const listener = jest.fn()

    sub_process.on('*', listener)

    await sub_process.run()

    expect(sub_process.status).toEqual('failure')
    expect(sub_process.signal).toBeUndefined()
    expect(sub_process.exitCode).toEqual(1)
    expect(sub_process.stdout).toEqual(Buffer.from(''))
    expect(sub_process.stderr).toEqual(Buffer.from(''))

    expect(listener.mock.calls).toEqual([
      [{ event: 'running', payload: { process: sub_process } }],
      [{ event: 'failure', measurement: expect.any(Measurement), payload: { process: sub_process } }],
      [{ event: 'end', measurement: expect.any(Measurement), payload: { process: sub_process } }]
    ])
  })

  it('is prepared for when a process is killed', async (): Promise<void> => {
    const sub_process = new SubProcess({ engine: 'fork', command: './tests/__fixtures__/kill-me', args: ['100'] })
    const listener = jest.fn()

    sub_process.on('*', listener)

    sub_process.run()

    await sub_process.waitFor('running')

    await sub_process.kill()

    expect(sub_process.status).toEqual('killed')
    expect(sub_process.signal).toEqual('SIGTERM')
    expect(sub_process.exitCode).toBeUndefined()
    expect(sub_process.stdout).toEqual(Buffer.from(''))
    expect(sub_process.stderr).toEqual(Buffer.from(''))

    expect(listener.mock.calls).toEqual([
      [{ event: 'running', payload: { process: sub_process } }],
      [{ event: 'killing', payload: { process: sub_process } }],
      [{ event: 'killed', measurement: expect.any(Measurement), payload: { process: sub_process } }],
      [{ event: 'end', measurement: expect.any(Measurement), payload: { process: sub_process } }]
    ])
  })

  it('runs on a given working directory', async (): Promise<void> => {
    const sub_process = new SubProcess({ engine: 'exec', command: 'command', workingDirectory: './tests/__fixtures__' })
    const listener = jest.fn()

    sub_process.on('*', listener)

    await sub_process.run()

    expect(sub_process.status).toEqual('success')
    expect(sub_process.signal).toBeUndefined()
    expect(sub_process.exitCode).toEqual(0)
    expect(sub_process.stderr).toEqual(Buffer.from(''))
    expect(sub_process.stderr).toEqual(Buffer.from(''))
    expect(sub_process.processId).toBeGreaterThan(0)

    expect(listener.mock.calls).toEqual([
      [{ event: 'running', payload: { process: sub_process } }],
      [{ event: 'success', measurement: expect.any(Measurement), payload: { process: sub_process } }],
      [{ event: 'end', measurement: expect.any(Measurement), payload: { process: sub_process } }]
    ])
  })
})
