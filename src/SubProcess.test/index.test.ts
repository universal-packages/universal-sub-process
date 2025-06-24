import { basicFunctionalityTest } from './basic-functionality.test'
import { enginesTest } from './engines.test'
import { environmentTest } from './environment.test'
import { errorHandlingTest } from './error-handling.test'
import { eventsTest } from './events.test'
import { inputOutputTest } from './input-output.test'
import { killTimeoutTest } from './kill-timeout.test'

export async function subProcessTest() {
  await basicFunctionalityTest()
  await enginesTest()
  await inputOutputTest()
  await eventsTest()
  await killTimeoutTest()
  await errorHandlingTest()
  await environmentTest()
}
