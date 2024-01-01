import { Measurement } from '@universal-packages/time-measurer'

import { ExecEngine, SubProcess } from '../src'

describe(ExecEngine, (): void => {
  it('runs a given command', async (): Promise<void> => {
    const sub_process = new SubProcess({ engine: 'exec', command: 'ls', args: ['-h'] })
    const listener = jest.fn()

    sub_process.on('*', listener)

    await sub_process.run()

    expect(sub_process.status).toEqual('success')
    expect(sub_process.signal).toBeUndefined()
    expect(sub_process.exitCode).toEqual(0)
    expect(sub_process.stdout.toString()).toMatch(
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
    expect(sub_process.stderr).toEqual(Buffer.from(''))
    expect(sub_process.processId).toBeGreaterThan(0)

    expect(listener.mock.calls).toEqual([
      [{ event: 'running', payload: { process: sub_process } }],
      [{ event: 'stdout', payload: { data: expect.any(Buffer), process: sub_process } }],
      [{ event: 'success', measurement: expect.any(Measurement), payload: { process: sub_process } }],
      [{ event: 'end', measurement: expect.any(Measurement), payload: { process: sub_process } }]
    ])
  })

  it('is prepared for when a process fails', async (): Promise<void> => {
    const sub_process = new SubProcess({ engine: 'exec', command: 'git', args: ['clone', 'nonexistent'] })
    const listener = jest.fn()

    sub_process.on('*', listener)

    await sub_process.run()

    expect(sub_process.status).toEqual('failure')
    expect(sub_process.signal).toBeUndefined()
    expect(sub_process.exitCode).toEqual(128)
    expect(sub_process.stdout).toEqual(Buffer.from(''))
    expect(sub_process.stderr.toString()).toMatch("fatal: repository 'nonexistent' does not exist\n")

    expect(listener.mock.calls).toEqual([
      [{ event: 'running', payload: { process: sub_process } }],
      [{ event: 'stderr', payload: { data: expect.any(Buffer), process: sub_process } }],
      [{ event: 'failure', measurement: expect.any(Measurement), payload: { process: sub_process } }],
      [{ event: 'end', measurement: expect.any(Measurement), payload: { process: sub_process } }]
    ])
  })

  it('is prepared for when a process is killed', async (): Promise<void> => {
    const sub_process = new SubProcess({ engine: 'exec', command: 'sleep', args: ['100'] })
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

  it('is receives the input correctly', async (): Promise<void> => {
    const sub_process = new SubProcess({ engine: 'exec', command: 'read variable && echo $variable', input: 'value' })
    const listener = jest.fn()

    sub_process.on('*', listener)

    await sub_process.run()

    expect(sub_process.status).toEqual('success')
    expect(sub_process.signal).toBeUndefined()
    expect(sub_process.exitCode).toEqual(0)
    expect(sub_process.stdout).toEqual(Buffer.from('value\n'))
  })

  it('runs on a given working directory', async (): Promise<void> => {
    const sub_process = new SubProcess({ engine: 'exec', command: 'ls', workingDirectory: './src' })
    const listener = jest.fn()

    sub_process.on('*', listener)

    await sub_process.run()

    expect(sub_process.status).toEqual('success')
    expect(sub_process.signal).toBeUndefined()
    expect(sub_process.exitCode).toEqual(0)
    expect(sub_process.stdout).toEqual(
      Buffer.from(`BaseChildProcessEngine.ts
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
index.ts\n`)
    )
    expect(sub_process.stderr).toEqual(Buffer.from(''))
    expect(sub_process.processId).toBeGreaterThan(0)

    expect(listener.mock.calls).toEqual([
      [{ event: 'running', payload: { process: sub_process } }],
      [{ event: 'stdout', payload: { data: expect.any(Buffer), process: sub_process } }],
      [{ event: 'success', measurement: expect.any(Measurement), payload: { process: sub_process } }],
      [{ event: 'end', measurement: expect.any(Measurement), payload: { process: sub_process } }]
    ])
  })
})
