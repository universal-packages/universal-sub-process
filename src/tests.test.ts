import { baseChildProcessEngineTest } from './BaseChildProcessEngine.test'
import { engineProcessTest } from './EngineProcess.test'
import { execEngineTest } from './ExecEngine.test'
import { forkEngineTest } from './ForkEngine.test'
import { orchestrationTest } from './Orchestration.test/index.test'
import { sortSetTest } from './SortedSet.test'
import { spawnEngineTest } from './SpawnEngine.test'
import { subProcessTest } from './SubProcess.test/index.test'
import { testEngineTest } from './TestEngine.test'

async function runAllTests() {
  await subProcessTest()
  await spawnEngineTest()
  await forkEngineTest()
  await execEngineTest()
  await testEngineTest()
  await engineProcessTest()
  await baseChildProcessEngineTest()
  await sortSetTest()
  await orchestrationTest()
}

runAllTests()
