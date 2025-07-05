import { SubProcess } from '../src/SubProcess'

export async function runEnvironmentExample() {
  console.log('\n🌍 Example 3: Environment Variables')
  console.log('-'.repeat(40))

  try {
    // Basic environment variable
    console.log('🔹 Setting a simple environment variable')
    const simpleEnvProcess = new SubProcess({
      command: 'sh',
      args: ['-c', 'echo "MY_VAR: $MY_VAR"'],
      env: { MY_VAR: 'Hello from environment!' },
      captureStreams: true
    })

    await simpleEnvProcess.run()
    console.log(`   Output: ${simpleEnvProcess.stdout.trim()}`)

    // Multiple environment variables
    console.log('\n🔹 Multiple environment variables')
    const multiEnvProcess = new SubProcess({
      command: 'sh',
      args: ['-c', 'echo "APP_NAME: $APP_NAME"; echo "APP_VERSION: $APP_VERSION"; echo "NODE_ENV: $NODE_ENV"'],
      env: {
        APP_NAME: 'MyApp',
        APP_VERSION: '1.0.0',
        NODE_ENV: 'production'
      },
      captureStreams: true
    })

    await multiEnvProcess.run()
    console.log(`   Output:`)
    multiEnvProcess.stdout
      .trim()
      .split('\n')
      .forEach((line) => {
        console.log(`   ${line.trim()}`)
      })

    // Inheriting and overriding environment variables
    console.log('\n🔹 Current process PATH still available')
    const pathProcess = new SubProcess({
      command: 'node',
      args: ['-e', 'console.log("PATH exists:", !!process.env.PATH)'],
      env: { CUSTOM_VAR: 'custom value' }, // This merges with existing env
      captureStreams: true
    })

    await pathProcess.run()
    console.log(`   Output: ${pathProcess.stdout.trim()}`)

    // Environment variables for different commands
    console.log('\n🔹 Using env vars with shell command')
    const shellEnvProcess = new SubProcess({
      command: 'echo',
      args: ['$GREETING', '$NAME'],
      env: {
        GREETING: 'Hello',
        NAME: 'World'
      },
      captureStreams: true
    })

    await shellEnvProcess.run()
    console.log(`   Output: ${shellEnvProcess.stdout.trim()}`)

    // Configuration through environment
    console.log('\n🔹 Application configuration via environment')
    const configProcess = new SubProcess({
      command: 'node',
      args: [
        '-e',
        'const config = { database: process.env.DB_HOST + ":" + process.env.DB_PORT, debug: process.env.DEBUG === "true", timeout: parseInt(process.env.TIMEOUT || "5000") }; console.log("Config:", JSON.stringify(config, null, 2));'
      ],
      env: {
        DB_HOST: 'localhost',
        DB_PORT: '5432',
        DEBUG: 'true',
        TIMEOUT: '10000'
      },
      captureStreams: true
    })

    await configProcess.run()
    console.log(`   Configuration output:`)
    configProcess.stdout
      .trim()
      .split('\n')
      .forEach((line) => {
        console.log(`   ${line}`)
      })

    console.log('\n✅ Environment variables example completed!')
  } catch (error) {
    console.error('❌ Error in environment example:', error instanceof Error ? error.message : String(error))
    throw error
  }
}
