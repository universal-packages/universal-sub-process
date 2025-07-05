import { concurrencyTest } from './concurrency.test.js'
import { messagingTest } from './messaging.test.js'
import { processIndexesTest } from './process-indexes.test.js'
import { stopOnFailureTest } from './stop-on-failure.test.js'

export async function orchestrationTest(): Promise<void> {
  await concurrencyTest()
  await messagingTest()
  await processIndexesTest()
  await stopOnFailureTest()
}
