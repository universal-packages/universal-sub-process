import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

import SubProcess from '../src/SubProcess'

export async function runAdvancedUsageExample() {
  console.log('\n🚀 Example 8: Advanced Usage')
  console.log('-'.repeat(40))

  try {
    // Working directory
    console.log('🔹 Working directory')
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'subprocess-'))
    fs.writeFileSync(path.join(tempDir, 'test.txt'), 'Hello from temp directory!')

    const workingDirProcess = new SubProcess({
      command: 'ls',
      args: ['-la'],
      workingDirectory: tempDir,
      captureStreams: true
    })

    await workingDirProcess.run()
    console.log(`   Working directory: ${tempDir}`)
    console.log(`   Files in directory:`)
    workingDirProcess.stdout
      .trim()
      .split('\n')
      .slice(1)
      .forEach((line) => {
        console.log(`   ${line}`)
      })

    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true })

    // Process killing with different signals
    console.log('\n🔹 Process killing with signals')
    const longRunningProcess = new SubProcess({
      command: 'node',
      args: [
        '-e',
        'let count = 0; const interval = setInterval(() => { console.log("Running...", ++count); }, 200); process.on("SIGTERM", () => { console.log("Received SIGTERM, shutting down gracefully..."); clearInterval(interval); setTimeout(() => process.exit(0), 100); });'
      ],
      captureStreams: true
    })

    // Start the process and kill it after a delay
    const killPromise = new Promise<void>((resolve) => {
      longRunningProcess.on('running', () => {
        setTimeout(async () => {
          if (longRunningProcess.status === 'running') {
            console.log('   Sending SIGTERM...')
            await longRunningProcess.kill('SIGTERM')
          }
          resolve()
        }, 800)
      })
    })

    try {
      await Promise.all([longRunningProcess.run(), killPromise])
    } catch (error) {
      console.log(`   Process terminated: ${error instanceof Error ? error.message : String(error)}`)
      console.log(`   Final status: ${longRunningProcess.status}`)
      console.log(`   Output before termination:`)
      longRunningProcess.stdout
        .trim()
        .split('\n')
        .forEach((line) => {
          console.log(`   ${line}`)
        })
    }

    // Status monitoring and waiting
    console.log('\n🔹 Status monitoring')
    const statusProcess = new SubProcess({
      command: 'node',
      args: [
        '-e',
        `
        console.log('Starting...');
        setTimeout(() => {
          console.log('Working...');
          setTimeout(() => {
            console.log('Finishing...');
          }, 300);
        }, 300);
      `
      ],
      captureStreams: true
    })

    console.log(`   Initial status: ${statusProcess.status}`)

    // Monitor status changes
    statusProcess.on('running', () => {
      console.log(`   Status changed to: ${statusProcess.status}`)
    })

    statusProcess.on('succeeded', () => {
      console.log(`   Status changed to: ${statusProcess.status}`)
    })

    await statusProcess.run()
    console.log(`   Final status: ${statusProcess.status}`)

    // Multiple processes coordination
    console.log('\n🔹 Multiple processes coordination')
    const processes: SubProcess[] = []

    for (let i = 0; i < 3; i++) {
      const process = new SubProcess({
        command: 'node',
        args: [
          '-e',
          `
          console.log('Process ${i + 1} starting...');
          setTimeout(() => {
            console.log('Process ${i + 1} completed');
          }, ${(i + 1) * 200});
        `
        ],
        captureStreams: true
      })
      processes.push(process)
    }

    console.log('   Starting multiple processes...')
    const results = await Promise.all(processes.map((p) => p.run()))

    processes.forEach((process, i) => {
      console.log(`   Process ${i + 1} output: ${process.stdout.trim()}`)
    })

    // Process properties inspection
    console.log('\n🔹 Process properties inspection')
    const inspectionProcess = new SubProcess({
      command: 'node',
      args: [
        '-e',
        `
        console.log('Hello World');
        console.error('Error message');
      `
      ],
      captureStreams: true
    })

    await inspectionProcess.run()

    console.log(`   Process ID: ${inspectionProcess.processId}`)
    console.log(`   Exit Code: ${inspectionProcess.exitCode}`)
    console.log(`   Signal: ${inspectionProcess.signal}`)
    console.log(`   Status: ${inspectionProcess.status}`)
    console.log(`   Stdout Length: ${inspectionProcess.stdout.length}`)
    console.log(`   Stderr Length: ${inspectionProcess.stderr.length}`)

    // Complex environment and input combination
    console.log('\n🔹 Complex environment and input combination')
    const complexProcess = new SubProcess({
      command: 'node',
      args: [
        '-e',
        `
        console.log('Environment:', process.env.CUSTOM_ENV);
        console.log('Working in:', process.cwd());
        
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', (data) => {
          console.log('Received input:', data.trim());
        });
      `
      ],
      env: {
        CUSTOM_ENV: 'production',
        NODE_ENV: 'test'
      },
      input: 'Hello from input!',
      workingDirectory: process.cwd(),
      captureStreams: true
    })

    await complexProcess.run()
    console.log(`   Complex process output:`)
    complexProcess.stdout
      .trim()
      .split('\n')
      .forEach((line) => {
        console.log(`   ${line}`)
      })

    // Performance measurement
    console.log('\n🔹 Performance measurement')
    const perfProcess = new SubProcess({
      command: 'node',
      args: [
        '-e',
        `
        const start = Date.now();
        setTimeout(() => {
          console.log('Execution time:', Date.now() - start, 'ms');
        }, 500);
      `
      ],
      captureStreams: true
    })

    const startTime = Date.now()
    await perfProcess.run()
    const totalTime = Date.now() - startTime

    console.log(`   Process reported: ${perfProcess.stdout.trim()}`)
    console.log(`   Total measured time: ${totalTime}ms`)

    // Skip functionality
    console.log('\n🔹 Skip functionality')
    const skipProcess = new SubProcess({
      command: 'echo',
      args: ['This will be skipped'],
      captureStreams: true
    })

    skipProcess.skip('Example skip reason')

    try {
      await skipProcess.run()
      console.log('   This should not be reached')
    } catch (error) {
      console.log(`   Process was skipped: ${skipProcess.status}`)
    }

    console.log('\n✅ Advanced usage example completed!')
  } catch (error) {
    console.error('❌ Error in advanced usage example:', error instanceof Error ? error.message : String(error))
    throw error
  }
}
