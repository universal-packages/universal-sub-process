import { Measurement } from '@universal-packages/time-measurer'

import { SpawnEngine, Status, SubProcess } from '../src'

describe(SpawnEngine, (): void => {
  it('runs a given command', async (): Promise<void> => {
    const subProcess = new SubProcess({ engine: 'spawn', command: 'ls', args: ['-h'] })
    const listener = jest.fn()

    subProcess.on('*', listener)

    await subProcess.run()

    expect(subProcess.status).toEqual(Status.Success)
    expect(subProcess.signal).toBeUndefined()
    expect(subProcess.exitCode).toEqual(0)
    expect(subProcess.stdout.toString()).toMatch(
      new RegExp(`CODE-OF-CONDUCT.md
CONTRIBUTING.md
LICENSE.md
README.md(\ncoverage)?
node_modules
package-lock.json
package.json
src
tests
tsconfig.dis.json
tsconfig.json\n`)
    )
    expect(subProcess.stderr).toEqual('')
    expect(subProcess.processId).toBeGreaterThan(0)

    expect(listener.mock.calls).toEqual([
      [{ event: 'running', payload: { startedAt: expect.any(Date) } }],
      [
        {
          event: 'stdout',
          payload: {
            data: expect.stringMatching(
              new RegExp(`CODE-OF-CONDUCT.md
CONTRIBUTING.md
LICENSE.md
README.md(\ncoverage)?
node_modules
package-lock.json
package.json
src
tests
tsconfig.dis.json
tsconfig.json\n`)
            )
          }
        }
      ],
      [{ event: 'success', measurement: expect.any(Measurement) }],
      [{ event: 'end', measurement: expect.any(Measurement), payload: { endedAt: expect.any(Date) } }]
    ])
  })

  it('is prepared for when a process fails', async (): Promise<void> => {
    const subProcess = new SubProcess({ engine: 'spawn', command: 'git', args: ['clone', 'nonexistent'] })
    const listener = jest.fn()

    subProcess.on('*', listener)

    await subProcess.run()

    expect(subProcess.status).toEqual(Status.Failure)
    expect(subProcess.signal).toBeUndefined()
    expect(subProcess.exitCode).toEqual(128)
    expect(subProcess.stdout).toEqual('')
    expect(subProcess.stderr.toString()).toMatch("fatal: repository 'nonexistent' does not exist\n")

    expect(listener.mock.calls).toEqual([
      [{ event: 'running', payload: { startedAt: expect.any(Date) } }],
      [{ event: 'stderr', payload: { data: expect.any(String) } }],
      [{ event: 'failure', error: new Error("Process exited with code 128\n\nfatal: repository 'nonexistent' does not exist\n"), measurement: expect.any(Measurement) }],
      [
        {
          event: 'end',
          error: new Error("Process exited with code 128\n\nfatal: repository 'nonexistent' does not exist\n"),
          measurement: expect.any(Measurement),
          payload: { endedAt: expect.any(Date) }
        }
      ]
    ])
  })

  it('is prepared for when a process is killed', async (): Promise<void> => {
    const subProcess = new SubProcess({ engine: 'spawn', command: 'sleep', args: ['100'] })
    const listener = jest.fn()

    subProcess.on('*', listener)

    subProcess.run()

    await subProcess.waitFor('running')

    await subProcess.kill()

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

  it('is receives the input correctly', async (): Promise<void> => {
    const subProcess = new SubProcess({ engine: 'spawn', command: 'read variable && echo $variable', input: 'value' })
    const listener = jest.fn()

    subProcess.on('*', listener)

    await subProcess.run()

    expect(subProcess.status).toEqual(Status.Success)
    expect(subProcess.signal).toBeUndefined()
    expect(subProcess.exitCode).toEqual(0)
    expect(subProcess.stdout).toEqual('value\n')
  })

  it('runs on a given working directory', async (): Promise<void> => {
    const subProcess = new SubProcess({ engine: 'spawn', command: 'ls', workingDirectory: './src' })
    const listener = jest.fn()

    subProcess.on('*', listener)

    await subProcess.run()

    expect(subProcess.status).toEqual(Status.Success)
    expect(subProcess.signal).toBeUndefined()
    expect(subProcess.exitCode).toEqual(0)
    expect(subProcess.stdout).toEqual(
      `BaseChildProcessEngine.ts
BaseRunner.ts
BaseRunner.types.ts
ChildProcessEngineProcess.ts
EngineProcess.ts
ExecEngine.ts
ExecEngine.types.ts
ForkEngine.ts
ForkEngine.types.ts
SpawnEngine.ts
SpawnEngine.types.ts
SubProcess.ts
SubProcess.types.ts
TestEngine.ts
TestEngineProcess.ts
index.ts\n`
    )
    expect(subProcess.stderr).toEqual('')
    expect(subProcess.processId).toBeGreaterThan(0)

    expect(listener.mock.calls).toEqual([
      [{ event: 'running', payload: { startedAt: expect.any(Date) } }],
      [
        {
          event: 'stdout',
          payload: {
            data: `BaseChildProcessEngine.ts
BaseRunner.ts
BaseRunner.types.ts
ChildProcessEngineProcess.ts
EngineProcess.ts
ExecEngine.ts
ExecEngine.types.ts
ForkEngine.ts
ForkEngine.types.ts
SpawnEngine.ts
SpawnEngine.types.ts
SubProcess.ts
SubProcess.types.ts
TestEngine.ts
TestEngineProcess.ts
index.ts\n`
          }
        }
      ],
      [{ event: 'success', measurement: expect.any(Measurement) }],
      [{ event: 'end', measurement: expect.any(Measurement), payload: { endedAt: expect.any(Date) } }]
    ])
  })
})
