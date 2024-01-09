import { Measurement } from '@universal-packages/time-measurer'
import { Readable } from 'stream'

import { ExecEngine, Status, SubProcess, TestEngine } from '../src'

beforeEach((): void => {
  TestEngine.reset()
})

describe(SubProcess, (): void => {
  it('runs a given command', async (): Promise<void> => {
    const subProcess = new SubProcess({ command: 'echo', args: ['hello'] })
    const listener = jest.fn()

    subProcess.on('*', listener)

    TestEngine.mockProcessEvents([
      { type: 'stdout', data: 'Command stdout' },
      { type: 'stdout', data: 'Command stdout' }
    ])

    await subProcess.run()

    expect(subProcess.status).toEqual(Status.SUCCESS)
    expect(subProcess.signal).toBeUndefined()
    expect(subProcess.exitCode).toEqual(0)
    expect(subProcess.stdout).toEqual(Buffer.from('Command stdoutCommand stdout'))
    expect(subProcess.stderr).toEqual(Buffer.from(''))
    expect(subProcess.processId).toBeGreaterThan(0)
    expect(subProcess.measurement).toBeInstanceOf(Measurement)
    expect(subProcess.startedAt).toBeInstanceOf(Date)
    expect(subProcess.endedAt).toBeInstanceOf(Date)

    expect(listener.mock.calls).toEqual([
      [{ event: 'running', payload: { startedAt: expect.any(Date) } }],
      [{ event: 'stdout', payload: { data: Buffer.from('Command stdout') } }],
      [{ event: 'stdout', payload: { data: Buffer.from('Command stdout') } }],
      [{ event: 'success', measurement: expect.any(Measurement) }],
      [{ event: 'end', measurement: expect.any(Measurement), payload: { endedAt: expect.any(Date) } }]
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
    const subProcess = new SubProcess({ command: 'failure', args: ['any'] })
    const listener = jest.fn()

    subProcess.on('*', listener)

    TestEngine.mockProcessEvents([
      { type: 'stderr', data: 'Command failure' },
      { type: 'exit', code: 1 }
    ])

    await subProcess.run()

    expect(subProcess.status).toEqual(Status.FAILURE)
    expect(subProcess.signal).toBeUndefined()
    expect(subProcess.exitCode).toEqual(1)
    expect(subProcess.stdout).toEqual(Buffer.from(''))
    expect(subProcess.stderr).toEqual(Buffer.from('Command failure'))

    expect(listener.mock.calls).toEqual([
      [{ event: 'running', payload: { startedAt: expect.any(Date) } }],
      [{ event: 'stderr', payload: { data: Buffer.from('Command failure') } }],
      [{ event: 'failure', measurement: expect.any(Measurement) }],
      [{ event: 'end', measurement: expect.any(Measurement), payload: { endedAt: expect.any(Date) } }]
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
    const subProcess = new SubProcess({ command: 'error', args: ['any'] })
    let error: Error

    TestEngine.mockProcessEvents([{ type: 'error', error: new Error('Command error') }])

    try {
      await subProcess.run()
    } catch (err) {
      error = err
    }

    expect(subProcess.status).toEqual(Status.ERROR)
    expect(subProcess.signal).toBeUndefined()
    expect(subProcess.exitCode).toBeUndefined()
    expect(subProcess.stdout).toEqual(Buffer.from(''))
    expect(subProcess.stderr).toEqual(Buffer.from(''))

    expect(error).toEqual(new Error('Command error'))

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
    const subProcess = new SubProcess({ command: 'sleep', args: ['any'] })
    const listener = jest.fn()

    subProcess.on('*', listener)

    TestEngine.mockProcessEvents([
      { type: 'stdout', data: 'Command stdout' },
      { type: 'stdout', data: 'Command stdout' }
    ])

    subProcess.run()

    await subProcess.waitForStatus(Status.RUNNING)

    await subProcess.stop()

    expect(subProcess.status).toEqual(Status.KILLED)
    expect(subProcess.signal).toEqual('SIGTERM')
    expect(subProcess.exitCode).toBeUndefined()
    expect(subProcess.stdout).toEqual(Buffer.from('Command stdout'))
    expect(subProcess.stderr).toEqual(Buffer.from(''))

    expect(listener.mock.calls).toEqual([
      [{ event: 'running', payload: { startedAt: expect.any(Date) } }],
      [{ event: 'killing' }],
      [{ event: 'stdout', payload: { data: Buffer.from('Command stdout') } }],
      [{ event: 'killed', measurement: expect.any(Measurement) }],
      [{ event: 'end', measurement: expect.any(Measurement), payload: { endedAt: expect.any(Date) } }]
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
    const subProcess = new SubProcess({ command: 'sleep', args: ['any'] })
    const listener = jest.fn()

    subProcess.on('*', listener)

    TestEngine.mockProcessEvents([
      { type: 'stdout', data: 'Command stdout' },
      { type: 'stdout', data: 'Command stdout' }
    ])

    subProcess.run()

    await subProcess.waitFor('running')

    await subProcess.kill('SIGKILL')

    expect(subProcess.status).toEqual(Status.KILLED)
    expect(subProcess.signal).toEqual('SIGKILL')
    expect(subProcess.exitCode).toBeUndefined()
    expect(subProcess.stdout).toEqual(Buffer.from('Command stdout'))
    expect(subProcess.stderr).toEqual(Buffer.from(''))

    expect(listener.mock.calls).toEqual([
      [{ event: 'running', payload: { startedAt: expect.any(Date) } }],
      [{ event: 'killing' }],
      [{ event: 'stdout', payload: { data: Buffer.from('Command stdout') } }],
      [{ event: 'killed', measurement: expect.any(Measurement) }],
      [{ event: 'end', measurement: expect.any(Measurement), payload: { endedAt: expect.any(Date) } }]
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
    const subProcess = new SubProcess({ command: 'sleep', args: ['any'], timeout: 2 })
    const listener = jest.fn()

    subProcess.on('*', listener)

    TestEngine.mockProcessEvents([
      { type: 'stdout', data: 'Command stdout' },
      { type: 'stdout', data: 'Command stdout' }
    ])

    await subProcess.run()

    expect(subProcess.status).toEqual(Status.KILLED)
    expect(subProcess.signal).toEqual('SIGTERM')
    expect(subProcess.exitCode).toBeUndefined()
    expect(subProcess.stdout).toEqual(Buffer.from('Command stdout'))
    expect(subProcess.stderr).toEqual(Buffer.from(''))

    expect(listener.mock.calls).toEqual([
      [{ event: 'running', payload: { startedAt: expect.any(Date) } }],
      [{ event: 'timeout' }],
      [{ event: 'killing' }],
      [{ event: 'stdout', payload: { data: Buffer.from('Command stdout') } }],
      [{ event: 'killed', measurement: expect.any(Measurement) }],
      [{ event: 'end', measurement: expect.any(Measurement), payload: { endedAt: expect.any(Date) } }]
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

  it('pipes an input in different formats to the engine subProcess', async (): Promise<void> => {
    let subProcess = new SubProcess({ command: 'apt update', input: 'yes' })
    let input = (subProcess['input'] as Readable).read()

    expect(input).toEqual(Buffer.from('yes\n'))

    subProcess = new SubProcess({ command: 'apt update', input: Buffer.from('yes') })
    input = (subProcess['input'] as Readable).read()

    expect(input).toEqual(Buffer.from('yes\n'))

    subProcess = new SubProcess({ command: 'apt update', input: new Readable() })
    input = (subProcess['input'] as Readable).read()

    expect(input).toEqual(Buffer.from('\n'))

    subProcess = new SubProcess({ command: 'apt update', input: ['yes', 'sr'] })
    input = (subProcess['input'] as Readable).read()

    expect(input).toEqual(Buffer.from('yessr\n'))

    subProcess = new SubProcess({ command: 'apt update', input: [Buffer.from('yes'), Buffer.from('sr')] })
    input = (subProcess['input'] as Readable).read()

    expect(input).toEqual(Buffer.from('yessr\n'))
  })

  it('emits a warning when the process has already ended', async (): Promise<void> => {
    const subProcess = new SubProcess({ command: 'echo', args: ['hello'] })
    const listener = jest.fn()

    subProcess.on('*', listener)

    await subProcess.run()

    await subProcess.run()

    expect(listener).toHaveBeenCalledWith({ event: 'warning', message: 'Already ran' })

    expect(TestEngine.commandHistory).toEqual([{ command: 'echo', args: ['hello'], input: expect.any(Readable), env: {}, workingDirectory: undefined, events: [] }])
  })

  it('throws when the process has already ended and no error listeners are in place', async (): Promise<void> => {
    const subProcess = new SubProcess({ command: 'echo', args: ['hello'] })

    await subProcess.run()

    let error: Error

    try {
      await subProcess.run()
    } catch (err) {
      error = err
    }

    expect(error).toEqual(new Error('Already ran'))

    expect(TestEngine.commandHistory).toEqual([{ command: 'echo', args: ['hello'], input: expect.any(Readable), env: {}, workingDirectory: undefined, events: [] }])
  })

  it('emits a warning when the process is already running', async (): Promise<void> => {
    const subProcess = new SubProcess({ command: 'echo', args: ['hello'] })
    const listener = jest.fn()

    subProcess.on('*', listener)

    const promise = subProcess.run()

    await subProcess.waitFor('running')

    subProcess.run()

    await promise

    expect(listener).toHaveBeenCalledWith({ event: 'warning', message: 'Already running' })

    expect(TestEngine.commandHistory).toEqual([{ command: 'echo', args: ['hello'], input: expect.any(Readable), env: {}, workingDirectory: undefined, events: [] }])
  })

  it('throws when the process is already running and no error listeners are in place', async (): Promise<void> => {
    const subProcess = new SubProcess({ command: 'echo', args: ['hello'] })

    const promise = subProcess.run()

    await subProcess.waitForStatus(Status.RUNNING)

    let error: Error

    try {
      await subProcess.run()
    } catch (err) {
      error = err
    }

    await promise

    expect(error).toEqual(new Error('Already running'))

    expect(TestEngine.commandHistory).toEqual([{ command: 'echo', args: ['hello'], input: expect.any(Readable), env: {}, workingDirectory: undefined, events: [] }])
  })

  it('Sets adapters from string', async (): Promise<void> => {
    const subProcess = new SubProcess({ engine: 'exec', command: 'sleep' })

    expect(subProcess).toMatchObject({ engine: expect.any(ExecEngine) })
  })

  it('Sets adapters from objects', async (): Promise<void> => {
    const engine = new ExecEngine()
    const subProcess = new SubProcess({ engine, command: 'sleep' })

    expect(subProcess).toMatchObject({ engine })
  })
})
