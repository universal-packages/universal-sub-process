import { Measurement, sleep } from '@universal-packages/time-measurer'

import { BaseRunner, Status } from '../src'

describe(BaseRunner, (): void => {
  it('emits warning in onRun is not called', async (): Promise<void> => {
    const TestRunner = class extends BaseRunner<any> {
      protected async internalRun(): Promise<void> {}
    }
    const listener = jest.fn()

    const runner = new TestRunner({})

    runner.on('*', listener)

    await runner.run()

    expect(listener.mock.calls).toEqual([
      [
        {
          event: 'warning',
          message: 'InternalRun never called onRun argument, this runner is not able to communicate when it starts running nor able to measure started time and running time.'
        }
      ],
      [{ event: 'idle' }],
      [{ event: 'end', payload: { endedAt: expect.any(Date) } }]
    ])
  })

  it('sets status as success when not set after the base internalRun finishes without error', async (): Promise<void> => {
    const TestRunner = class extends BaseRunner<any> {
      protected async internalRun(onRun: () => void): Promise<void> {
        onRun()
      }
    }
    const listener = jest.fn()

    const runner = new TestRunner({})

    runner.on('*', listener)

    await runner.run()

    expect(runner.status).toEqual(Status.Success)

    expect(listener.mock.calls).toEqual([
      [{ event: 'running', payload: { startedAt: expect.any(Date) } }],
      [{ event: 'success', measurement: expect.any(Measurement) }],
      [{ event: 'end', measurement: expect.any(Measurement), payload: { endedAt: expect.any(Date) } }]
    ])
  })

  it('emits the error instead of throwing if is being listened to', async (): Promise<void> => {
    const TestRunner = class extends BaseRunner<any> {
      protected async internalRun(onRun: () => void): Promise<void> {
        onRun()
        throw new Error('Test error')
      }
    }
    const listener = jest.fn()

    const runner = new TestRunner({})

    runner.on('*', listener)

    await runner.run()

    expect(runner.status).toEqual(Status.Error)

    expect(listener.mock.calls).toEqual([[{ event: 'running', payload: { startedAt: expect.any(Date) } }], [{ event: 'error', error: new Error('Test error') }]])
  })

  it('handles an error on the release phase', async (): Promise<void> => {
    const TestRunner = class extends BaseRunner<any> {
      protected async internalRun(onRun: () => void): Promise<void> {
        onRun()
      }

      protected async internalRelease(): Promise<void> {
        throw new Error('Test error')
      }
    }
    const listener = jest.fn()

    const runner = new TestRunner({})

    runner.on('*', listener)

    await runner.run()

    expect(runner.status).toEqual(Status.Error)

    expect(listener.mock.calls).toEqual([[{ event: 'running', payload: { startedAt: expect.any(Date) } }], [{ event: 'error', error: new Error('Test error') }]])
  })

  it('does not do anything if trying to stop an idle runner', async (): Promise<void> => {
    const TestRunner = class extends BaseRunner<any> {
      protected async internalRun(onRun: () => void): Promise<void> {
        onRun()
      }
    }
    const listener = jest.fn()

    const runner = new TestRunner({})

    runner.on('*', listener)

    await runner.stop()

    expect(runner.status).toEqual(Status.Idle)

    expect(listener.mock.calls).toEqual([])
  })

  it('throws if internal run is not implemented', async (): Promise<void> => {
    const listener = jest.fn()

    const runner = new BaseRunner({})

    runner.on('*', listener)

    await runner.run()

    expect(runner.status).toEqual(Status.Error)

    expect(listener.mock.calls).toEqual([[{ event: 'error', error: new Error('Method internalRun not implemented') }]])
  })

  it('throws if internal stop is not implemented', async (): Promise<void> => {
    const TestRunner = class extends BaseRunner<any> {
      protected async internalRun(onRun: () => void): Promise<void> {
        onRun()

        await sleep(200)
      }
    }
    const listener = jest.fn()

    const runner = new TestRunner({})

    runner.on('*', listener)

    runner.run()

    await runner.waitForStatus(Status.Running)

    await runner.stop()

    expect(runner.status).toEqual(Status.Error)

    expect(listener.mock.calls).toEqual([
      [{ event: 'running', payload: { startedAt: expect.any(Date) } }],
      [{ event: 'stopping' }],
      [{ event: 'error', error: new Error('Method internalStop not implemented'), measurement: expect.any(Measurement) }],
      [{ event: 'end', error: new Error('Method internalStop not implemented'), measurement: expect.any(Measurement), payload: { endedAt: expect.any(Date) } }]
    ])
  })

  it('sets status as stopped when not set after stopping happened', async (): Promise<void> => {
    const TestRunner = class extends BaseRunner<any> {
      protected async internalRun(onRun: () => void): Promise<void> {
        onRun()

        await sleep(200)
      }

      protected async internalStop(): Promise<void> {}
    }
    const listener = jest.fn()

    const runner = new TestRunner({})

    runner.on('*', listener)

    runner.run()

    await runner.waitForStatus(Status.Running)

    await runner.stop()

    expect(runner.status).toEqual(Status.Stopped)

    expect(listener.mock.calls).toEqual([
      [{ event: 'running', payload: { startedAt: expect.any(Date) } }],
      [{ event: 'stopping' }],
      [{ event: 'stopped', error: new Error('Stopped'), measurement: expect.any(Measurement) }],
      [{ event: 'end', error: new Error('Stopped'), measurement: expect.any(Measurement), payload: { endedAt: expect.any(Date) } }]
    ])
  })

  it('throws a handled failure if is not being listened to', async (): Promise<void> => {
    const TestRunner = class extends BaseRunner<any> {
      protected async internalRun(onRun: () => void): Promise<void> {
        onRun()

        this.internalStatus = Status.Failure
      }
    }
    let error: Error

    const runner = new TestRunner({})

    try {
      await runner.run()
    } catch (err) {
      error = err
    }

    expect(error.message).toEqual('Unknown error')
  })

  it('throws a stop if it is not being listened to', async (): Promise<void> => {
    const TestRunner = class extends BaseRunner<any> {
      protected async internalRun(onRun: () => void): Promise<void> {
        onRun()

        await sleep(200)
      }

      protected async internalStop(): Promise<void> {}
    }

    const runner = new TestRunner({})

    let error: Error

    runner.run().catch((err) => {
      error = err
    })

    await runner.waitForStatus(Status.Running)

    await runner.stop()

    expect(error.message).toEqual('Stopped')
  })
})
