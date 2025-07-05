import { SubProcess } from '../src/SubProcess'

export async function runDifferentEnginesExample() {
  console.log('\n⚙️  Example 7: Different Engines')
  console.log('-'.repeat(40))

  try {
    // Default engine (spawn)
    console.log('🔹 Default engine (spawn)')
    const spawnProcess = new SubProcess({
      command: 'echo',
      args: ['Hello from spawn engine'],
      captureStreams: true
    })

    await spawnProcess.run()
    console.log(`   Output: ${spawnProcess.stdout.trim()}`)
    console.log(`   Engine: spawn (default)`)

    // Explicit spawn engine
    console.log('\n🔹 Explicit spawn engine')
    const explicitSpawnProcess = new SubProcess({
      command: 'node',
      args: ['-e', 'console.log("Spawn engine:", process.argv0)'],
      engine: 'spawn',
      captureStreams: true
    })

    await explicitSpawnProcess.run()
    console.log(`   Output: ${explicitSpawnProcess.stdout.trim()}`)

    // Exec engine
    console.log('\n🔹 Exec engine')
    const execProcess = new SubProcess({
      command: 'echo "Hello from exec engine"',
      engine: 'exec',
      captureStreams: true
    })

    await execProcess.run()
    console.log(`   Output: ${execProcess.stdout.trim()}`)

    // Fork engine (for Node.js scripts)
    console.log('\n🔹 Fork engine')
    const forkProcess = new SubProcess({
      command: 'node',
      args: ['-e', 'console.log("Hello from fork engine"); process.send && process.send("forked")'],
      engine: 'fork',
      captureStreams: true
    })

    await forkProcess.run()
    console.log(`   Output: ${forkProcess.stdout.trim()}`)

    // Test engine (for testing purposes)
    console.log('\n🔹 Test engine')
    const testProcess = new SubProcess({
      command: 'echo',
      args: ['Test engine output'],
      engine: 'test',
      captureStreams: true
    })

    await testProcess.run()
    console.log(`   Output: ${testProcess.stdout.trim()}`)
    console.log(`   Status: ${testProcess.status}`)

    // Comparing engines with the same command
    console.log('\n🔹 Comparing engines with same command')
    const command = 'node'
    const args = ['-e', 'console.log("Process ID:", process.pid)']
    const engines = ['spawn', 'exec', 'fork'] as const

    for (const engine of engines) {
      const process = new SubProcess({
        command,
        args,
        engine,
        captureStreams: true
      })

      await process.run()
      console.log(`   ${engine.padEnd(6)}: ${process.stdout.trim()}`)
    }

    // Engine-specific behavior demonstration
    console.log('\n🔹 Engine-specific behavior')

    // Spawn can handle streaming
    const spawnStream = new SubProcess({
      command: 'node',
      args: [
        '-e',
        `
        for(let i = 0; i < 3; i++) {
          console.log(\`Spawn stream \${i + 1}\`);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      `
      ],
      engine: 'spawn',
      captureStreams: true
    })

    await spawnStream.run()
    console.log(`   Spawn streaming: ${spawnStream.stdout.trim()}`)

    // Exec is good for shell commands
    const execShell = new SubProcess({
      command: 'echo "Current directory: $(pwd)" && echo "Files: $(ls | wc -l)"',
      engine: 'exec',
      captureStreams: true
    })

    await execShell.run()
    console.log(`   Exec shell commands:`)
    execShell.stdout
      .trim()
      .split('\n')
      .forEach((line) => {
        console.log(`   ${line}`)
      })

    // Engine options
    console.log('\n🔹 Engine options')
    const processWithOptions = new SubProcess({
      command: 'node',
      args: ['-e', 'console.log("Engine with options")'],
      engine: 'spawn',
      engineOptions: {
        // These would be passed to the spawn engine
        stdio: 'pipe'
      },
      captureStreams: true
    })

    await processWithOptions.run()
    console.log(`   Output with options: ${processWithOptions.stdout.trim()}`)

    console.log('\n✅ Different engines example completed!')
  } catch (error) {
    console.error('❌ Error in different engines example:', error instanceof Error ? error.message : String(error))
    throw error
  }
}
