import { Measurement } from '@universal-packages/time-measurer'
import { Readable } from 'stream'

import { ExecEngine, SubProcess, TestEngine } from '../src'

beforeEach((): void => {
  TestEngine.reset()
})

describe(SubProcess, (): void => {
  it('runs a given command', async (): Promise<void> => {
    const sub_process = new SubProcess({ command: 'echo', args: ['hello'] })
    const listener = jest.fn()

    sub_process.on('*', listener)

    TestEngine.mockProcessEvents([
      { type: 'stdout', data: 'Command stdout' },
      { type: 'stdout', data: 'Command stdout' }
    ])

    await sub_process.run()

    expect(sub_process.status).toEqual('success')
    expect(sub_process.signal).toBeUndefined()
    expect(sub_process.exitCode).toEqual(0)
    expect(sub_process.stdout).toEqual(Buffer.from('Command stdoutCommand stdout'))
    expect(sub_process.stderr).toEqual(Buffer.from(''))
    expect(sub_process.processId).toBeGreaterThan(0)

    expect(listener.mock.calls).toEqual([
      [{ event: 'running', payload: { process: sub_process } }],
      [{ event: 'stdout', payload: { data: Buffer.from('Command stdout'), process: sub_process } }],
      [{ event: 'stdout', payload: { data: Buffer.from('Command stdout'), process: sub_process } }],
      [{ event: 'success', measurement: expect.any(Measurement), payload: { process: sub_process } }],
      [{ event: 'end', measurement: expect.any(Measurement), payload: { process: sub_process } }]
    ])

    expect(TestEngine.commandHistory).toEqual([
      {
        command: 'echo',
        args: ['hello'],
        input: expect.any(Readable),
        env: {},
        workingDirectory: undefined,
        events: [
          { type: 'stdout', data: 'Command stdout' },
          { type: 'stdout', data: 'Command stdout' }
        ]
      }
    ])
  })

  it('is prepared for when a process fails', async (): Promise<void> => {
    const sub_process = new SubProcess({ command: 'failure', args: ['any'] })
    const listener = jest.fn()

    sub_process.on('*', listener)

    TestEngine.mockProcessEvents([
      { type: 'stderr', data: 'Command failure' },
      { type: 'exit', code: 1 }
    ])

    await sub_process.run()

    expect(sub_process.status).toEqual('failure')
    expect(sub_process.signal).toBeUndefined()
    expect(sub_process.exitCode).toEqual(1)
    expect(sub_process.stdout).toEqual(Buffer.from(''))
    expect(sub_process.stderr).toEqual(Buffer.from('Command failure'))

    expect(listener.mock.calls).toEqual([
      [{ event: 'running', payload: { process: sub_process } }],
      [{ event: 'stderr', payload: { data: Buffer.from('Command failure'), process: sub_process } }],
      [{ event: 'failure', measurement: expect.any(Measurement), payload: { process: sub_process } }],
      [{ event: 'end', measurement: expect.any(Measurement), payload: { process: sub_process } }]
    ])

    expect(TestEngine.commandHistory).toEqual([
      {
        command: 'failure',
        args: ['any'],
        input: expect.any(Readable),
        env: {},
        workingDirectory: undefined,
        events: [
          { type: 'stderr', data: 'Command failure' },
          { type: 'exit', code: 1 }
        ]
      }
    ])
  })

  it('is prepared for when a an error occurs', async (): Promise<void> => {
    const sub_process = new SubProcess({ command: 'error', args: ['any'], throwIfNotSuccessful: true })
    const listener = jest.fn()
    let error: Error

    sub_process.on('*', listener)

    TestEngine.mockProcessEvents([{ type: 'error', error: new Error('Command error') }])

    try {
      await sub_process.run()
    } catch (err) {
      error = err
    }

    expect(sub_process.status).toEqual('error')
    expect(sub_process.signal).toBeUndefined()
    expect(sub_process.exitCode).toBeUndefined()
    expect(sub_process.stdout).toEqual(Buffer.from(''))
    expect(sub_process.stderr).toEqual(Buffer.from(''))

    expect(error).toEqual(new Error('Command error'))

    expect(listener.mock.calls).toEqual([[{ event: 'error', error: new Error('Command error'), payload: { process: sub_process } }]])

    expect(TestEngine.commandHistory).toEqual([
      {
        command: 'error',
        args: ['any'],
        input: expect.any(Readable),
        env: {},
        workingDirectory: undefined,
        events: [{ type: 'error', error: new Error('Command error') }]
      }
    ])
  })

  it('is prepared for when a process is killed', async (): Promise<void> => {
    const sub_process = new SubProcess({ command: 'sleep', args: ['any'] })
    const listener = jest.fn()

    sub_process.on('*', listener)

    TestEngine.mockProcessEvents([
      { type: 'stdout', data: 'Command stdout' },
      { type: 'stdout', data: 'Command stdout' }
    ])

    sub_process.run()

    await sub_process.waitFor('running')

    await sub_process.kill()

    expect(sub_process.status).toEqual('killed')
    expect(sub_process.signal).toEqual('SIGTERM')
    expect(sub_process.exitCode).toBeUndefined()
    expect(sub_process.stdout).toEqual(Buffer.from('Command stdout'))
    expect(sub_process.stderr).toEqual(Buffer.from(''))

    expect(listener.mock.calls).toEqual([
      [{ event: 'running', payload: { process: sub_process } }],
      [{ event: 'killing', payload: { process: sub_process } }],
      [{ event: 'stdout', payload: { data: Buffer.from('Command stdout'), process: sub_process } }],
      [{ event: 'killed', measurement: expect.any(Measurement), payload: { process: sub_process } }],
      [{ event: 'end', measurement: expect.any(Measurement), payload: { process: sub_process } }]
    ])

    expect(TestEngine.commandHistory).toEqual([
      {
        command: 'sleep',
        args: ['any'],
        input: expect.any(Readable),
        env: {},
        workingDirectory: undefined,
        events: [{ type: 'stdout', data: 'Command stdout' }]
      }
    ])
  })

  it('is prepared for when a process is killed with a signal', async (): Promise<void> => {
    const sub_process = new SubProcess({ command: 'sleep', args: ['any'] })
    const listener = jest.fn()

    sub_process.on('*', listener)

    TestEngine.mockProcessEvents([
      { type: 'stdout', data: 'Command stdout' },
      { type: 'stdout', data: 'Command stdout' }
    ])

    sub_process.run()

    await sub_process.waitFor('running')

    await sub_process.kill('SIGKILL')

    expect(sub_process.status).toEqual('killed')
    expect(sub_process.signal).toEqual('SIGKILL')
    expect(sub_process.exitCode).toBeUndefined()
    expect(sub_process.stdout).toEqual(Buffer.from('Command stdout'))
    expect(sub_process.stderr).toEqual(Buffer.from(''))

    expect(listener.mock.calls).toEqual([
      [{ event: 'running', payload: { process: sub_process } }],
      [{ event: 'killing', payload: { process: sub_process } }],
      [{ event: 'stdout', payload: { data: Buffer.from('Command stdout'), process: sub_process } }],
      [{ event: 'killed', measurement: expect.any(Measurement), payload: { process: sub_process } }],
      [{ event: 'end', measurement: expect.any(Measurement), payload: { process: sub_process } }]
    ])

    expect(TestEngine.commandHistory).toEqual([
      {
        command: 'sleep',
        args: ['any'],
        input: expect.any(Readable),
        env: {},
        workingDirectory: undefined,
        events: [{ type: 'stdout', data: 'Command stdout' }]
      }
    ])
  })

  it('timeouts a process', async (): Promise<void> => {
    const sub_process = new SubProcess({ command: 'sleep', args: ['any'], timeout: 2, throwIfNotSuccessful: true })
    const listener = jest.fn()
    let error: Error

    sub_process.on('*', listener)

    TestEngine.mockProcessEvents([
      { type: 'stdout', data: 'Command stdout' },
      { type: 'stdout', data: 'Command stdout' }
    ])

    try {
      await sub_process.run()
    } catch (err) {
      error = err
    }

    expect(sub_process.status).toEqual('killed')
    expect(sub_process.signal).toEqual('SIGTERM')
    expect(sub_process.exitCode).toBeUndefined()
    expect(sub_process.stdout).toEqual(Buffer.from('Command stdout'))
    expect(sub_process.stderr).toEqual(Buffer.from(''))

    expect(error).toEqual(new Error('Process was killed with signal SIGTERM'))

    expect(listener.mock.calls).toEqual([
      [{ event: 'running', payload: { process: sub_process } }],
      [{ event: 'timeout', payload: { process: sub_process } }],
      [{ event: 'killing', payload: { process: sub_process } }],
      [{ event: 'stdout', payload: { data: Buffer.from('Command stdout'), process: sub_process } }],
      [{ event: 'killed', measurement: expect.any(Measurement), payload: { process: sub_process } }],
      [{ event: 'end', measurement: expect.any(Measurement), payload: { process: sub_process } }]
    ])

    expect(TestEngine.commandHistory).toEqual([
      {
        command: 'sleep',
        args: ['any'],
        input: expect.any(Readable),
        env: {},
        workingDirectory: undefined,
        events: [{ type: 'stdout', data: 'Command stdout' }]
      }
    ])
  })

  it('pipes an input in different formats to the engine sub_process', async (): Promise<void> => {
    let sub_process = new SubProcess({ command: 'apt update', input: 'yes' })
    let input = (sub_process['input'] as Readable).read()

    expect(input).toEqual(Buffer.from('yes\n'))

    sub_process = new SubProcess({ command: 'apt update', input: Buffer.from('yes') })
    input = (sub_process['input'] as Readable).read()

    expect(input).toEqual(Buffer.from('yes\n'))

    sub_process = new SubProcess({ command: 'apt update', input: new Readable() })
    input = (sub_process['input'] as Readable).read()

    expect(input).toEqual(Buffer.from('\n'))

    sub_process = new SubProcess({ command: 'apt update', input: ['yes', 'sr'] })
    input = (sub_process['input'] as Readable).read()

    expect(input).toEqual(Buffer.from('yessr\n'))

    sub_process = new SubProcess({ command: 'apt update', input: [Buffer.from('yes'), Buffer.from('sr')] })
    input = (sub_process['input'] as Readable).read()

    expect(input).toEqual(Buffer.from('yessr\n'))
  })

  it('emits a warning when the process has already ended', async (): Promise<void> => {
    const sub_process = new SubProcess({ command: 'echo', args: ['hello'] })
    const listener = jest.fn()

    sub_process.on('*', listener)

    await sub_process.run()

    await sub_process.run()

    expect(listener).toHaveBeenCalledWith({ event: 'warning', message: 'Process has already ended', payload: { process: sub_process } })

    expect(TestEngine.commandHistory).toEqual([{ command: 'echo', args: ['hello'], input: expect.any(Readable), env: {}, workingDirectory: undefined, events: [] }])
  })

  it('emits an error when the process is already running', async (): Promise<void> => {
    const sub_process = new SubProcess({ command: 'echo', args: ['hello'] })
    const listener = jest.fn()

    sub_process.on('*', listener)

    const promise = sub_process.run()

    await sub_process.waitFor('running')

    sub_process.run()

    await promise

    expect(listener).toHaveBeenCalledWith({ event: 'warning', message: 'Process is already running', payload: { process: sub_process } })

    expect(TestEngine.commandHistory).toEqual([{ command: 'echo', args: ['hello'], input: expect.any(Readable), env: {}, workingDirectory: undefined, events: [] }])
  })

  it('Sets adapters from string', async (): Promise<void> => {
    const sub_process = new SubProcess({ engine: 'exec', command: 'sleep' })

    expect(sub_process).toMatchObject({ engine: expect.any(ExecEngine) })
  })

  it('Sets adapters from objects', async (): Promise<void> => {
    const engine = new ExecEngine()
    const sub_process = new SubProcess({ engine, command: 'sleep' })

    expect(sub_process).toMatchObject({ engine })
  })
})
