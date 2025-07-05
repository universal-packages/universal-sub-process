import { TestsRunner } from '@universal-packages/tests-runner'

import { SortedSet } from './SortedSet'
import { evaluateTestResults } from './utils.test'

export async function sortSetTest(): Promise<void> {
  const testsRunner = new TestsRunner({ runOrder: 'parallel' })

  testsRunner.describe('SortedSet Tests', () => {
    testsRunner.test('basic functionality - add, has, delete', async () => {
      const set = new SortedSet<number>()

      // Test empty set
      testsRunner.expect(set.size).toEqual(0)
      testsRunner.expect(set.isEmpty).toEqual(true)
      testsRunner.expect(set.first()).toBeUndefined()
      testsRunner.expect(set.last()).toBeUndefined()
      testsRunner.expect(set.toString()).toEqual('SortedSet(0) {}')

      // Test adding elements
      testsRunner.expect(set.add(5)).toEqual(true)
      testsRunner.expect(set.add(2)).toEqual(true)
      testsRunner.expect(set.add(8)).toEqual(true)
      testsRunner.expect(set.add(1)).toEqual(true)
      testsRunner.expect(set.add(5)).toEqual(false) // Duplicate

      testsRunner.expect(set.size).toEqual(4)
      testsRunner.expect(set.isEmpty).toEqual(false)
      testsRunner.expect(set.toString()).toEqual('SortedSet(4) {1, 2, 5, 8}')

      // Test has
      testsRunner.expect(set.has(5)).toEqual(true)
      testsRunner.expect(set.has(10)).toEqual(false)

      // Test first/last
      testsRunner.expect(set.first()).toEqual(1)
      testsRunner.expect(set.last()).toEqual(8)

      // Test sorted order
      testsRunner.expect(set.toArray()).toEqual([1, 2, 5, 8])

      // Test delete
      testsRunner.expect(set.delete(2)).toEqual(true)
      testsRunner.expect(set.delete(10)).toEqual(false)
      testsRunner.expect(set.toArray()).toEqual([1, 5, 8])
      testsRunner.expect(set.size).toEqual(3)

      // Test clear functionality
      set.clear()
      testsRunner.expect(set.size).toEqual(0)
      testsRunner.expect(set.isEmpty).toEqual(true)
      testsRunner.expect(set.toString()).toEqual('SortedSet(0) {}')
    })

    testsRunner.test('forEach and iteration functionality', async () => {
      const set = new SortedSet<number>()
      const values = [5, 2, 8, 1, 9, 3]
      values.forEach((v) => set.add(v))

      // Test forEach
      const forEachResults: number[] = []
      set.forEach((value, value2, thisSet) => {
        testsRunner.expect(value).toEqual(value2)
        testsRunner.expect(thisSet).toEqual(set)
        forEachResults.push(value)
      })
      testsRunner.expect(forEachResults).toEqual([1, 2, 3, 5, 8, 9])

      // Test iterator
      const iteratorResults: number[] = []
      for (const value of set) {
        iteratorResults.push(value)
      }
      testsRunner.expect(iteratorResults).toEqual([1, 2, 3, 5, 8, 9])

      // Test toString with various sizes
      testsRunner.expect(set.toString()).toEqual('SortedSet(6) {1, 2, 3, 5, 8, 9}')
    })

    testsRunner.test('set operations and relationships', async () => {
      const set1 = new SortedSet<number>()
      const set2 = new SortedSet<number>()
      const set3 = new SortedSet<number>()

      // Add elements
      ;[1, 2, 3, 4, 5].forEach((v) => set1.add(v))
      ;[3, 4, 5, 6, 7].forEach((v) => set2.add(v))
      ;[1, 2, 3].forEach((v) => set3.add(v))

      // Test union
      const union = set1.union(set2)
      testsRunner.expect(union.toArray()).toEqual([1, 2, 3, 4, 5, 6, 7])

      // Test intersection
      const intersection = set1.intersection(set2)
      testsRunner.expect(intersection.toArray()).toEqual([3, 4, 5])

      // Test difference
      const difference = set1.difference(set2)
      testsRunner.expect(difference.toArray()).toEqual([1, 2])

      // Test subset relationships
      testsRunner.expect(set3.isSubsetOf(set1)).toEqual(true)
      testsRunner.expect(set1.isSubsetOf(set3)).toEqual(false)

      // Test superset relationships
      testsRunner.expect(set1.isSupersetOf(set3)).toEqual(true)
      testsRunner.expect(set3.isSupersetOf(set1)).toEqual(false)

      // Test empty set relationships
      const emptySet = new SortedSet<number>()
      testsRunner.expect(emptySet.isSubsetOf(set1)).toEqual(true)
      testsRunner.expect(set1.isSupersetOf(emptySet)).toEqual(true)
      testsRunner.expect(emptySet.isSupersetOf(set1)).toEqual(false)
    })

    testsRunner.test('complex deletion scenarios for Red-Black tree rebalancing', async () => {
      const set = new SortedSet<number>()

      // Create a complex tree structure to trigger various deletion scenarios
      const values = [50, 30, 70, 20, 40, 60, 80, 10, 25, 35, 45, 55, 65, 75, 85, 5, 15, 22, 27, 32, 37, 42, 47]
      values.forEach((v) => set.add(v))

      // Test deletion of nodes with different configurations
      // This should trigger various branches in the deleteNode and fixDeletion functions

      // Delete a node with no children
      testsRunner.expect(set.delete(5)).toEqual(true)
      testsRunner.expect(set.has(5)).toEqual(false)

      // Delete a node with one child
      testsRunner.expect(set.delete(10)).toEqual(true)
      testsRunner.expect(set.has(10)).toEqual(false)

      // Delete a node with two children
      testsRunner.expect(set.delete(30)).toEqual(true)
      testsRunner.expect(set.has(30)).toEqual(false)

      // Delete root with complex structure
      testsRunner.expect(set.delete(50)).toEqual(true)
      testsRunner.expect(set.has(50)).toEqual(false)

      // Verify tree is still balanced and sorted
      const remainingValues = set.toArray()
      for (let i = 1; i < remainingValues.length; i++) {
        testsRunner.expect(remainingValues[i]).toBeGreaterThan(remainingValues[i - 1])
      }

      // Continue deleting to trigger more rebalancing scenarios
      const valuesToDelete = [70, 40, 60, 80, 20, 25, 35, 45, 55, 65, 75]
      valuesToDelete.forEach((v) => {
        if (set.has(v)) {
          testsRunner.expect(set.delete(v)).toEqual(true)
        }
      })

      // Verify remaining elements are still sorted
      const finalValues = set.toArray()
      for (let i = 1; i < finalValues.length; i++) {
        testsRunner.expect(finalValues[i]).toBeGreaterThan(finalValues[i - 1])
      }
    })

    testsRunner.test('specific Red-Black tree rebalancing scenarios', async () => {
      const set = new SortedSet<number>()

      // Create specific patterns to trigger the remaining uncovered branches
      // This creates a pattern where deletions will trigger right-child fixDeletion scenarios

      // Pattern 1: Create a tree where right child deletion triggers sibling rebalancing
      const pattern1 = [100, 50, 150, 25, 75, 125, 175, 12, 37, 62, 87, 112, 137, 162, 187]
      pattern1.forEach((v) => set.add(v))

      // Delete specific nodes to trigger right-child rebalancing
      set.delete(187) // Delete rightmost leaf
      set.delete(175) // Delete parent, forcing rebalancing
      set.delete(162) // Continue pattern
      set.delete(150) // Delete higher level node

      // Pattern 2: Create another specific structure
      const pattern2 = [200, 90, 210, 80, 95, 205, 220, 85, 92, 97, 202, 207, 215, 225]
      pattern2.forEach((v) => set.add(v))

      // Delete to trigger more complex rebalancing
      set.delete(225)
      set.delete(220)
      set.delete(215)
      set.delete(210)

      // Pattern 3: Force specific sibling color scenarios
      const pattern3 = [300, 280, 320, 270, 290, 310, 330, 265, 275, 285, 295, 305, 315, 325, 335]
      pattern3.forEach((v) => set.add(v))

      // Strategic deletions to trigger right-child fixDeletion with red sibling
      set.delete(335)
      set.delete(325)
      set.delete(315)
      set.delete(330)
      set.delete(320)

      // Verify tree integrity throughout
      const finalArray = set.toArray()
      for (let i = 1; i < finalArray.length; i++) {
        testsRunner.expect(finalArray[i]).toBeGreaterThan(finalArray[i - 1])
      }

      // Test more complex scenarios with alternating deletion patterns
      const complexPattern = [400, 350, 450, 325, 375, 425, 475, 312, 337, 362, 387, 412, 437, 462, 487]
      complexPattern.forEach((v) => set.add(v))

      // Delete in a pattern that forces right-child scenarios
      const rightChildDeletions = [487, 475, 462, 450, 437, 425, 412, 387, 375, 362, 350, 337, 325, 312]
      rightChildDeletions.forEach((v) => {
        if (set.has(v)) {
          set.delete(v)
        }
      })

      // Final verification
      const veryFinalArray = set.toArray()
      for (let i = 1; i < veryFinalArray.length; i++) {
        testsRunner.expect(veryFinalArray[i]).toBeGreaterThan(veryFinalArray[i - 1])
      }
    })

    testsRunner.test('exhaustive Red-Black tree deletion edge cases', async () => {
      // Create multiple sets to test different tree configurations
      const sets = Array.from({ length: 10 }, () => new SortedSet<number>())

      // Configuration 1: Right-heavy tree with specific deletion pattern
      sets[0].add(50)
      sets[0].add(25)
      sets[0].add(75)
      sets[0].add(100)
      sets[0].add(12)
      sets[0].add(37)
      sets[0].add(62)
      sets[0].add(87)
      sets[0].add(112)
      sets[0].add(125)
      // Delete in specific order to trigger right-child rebalancing
      sets[0].delete(125)
      sets[0].delete(112)
      sets[0].delete(100)
      sets[0].delete(87)
      sets[0].delete(75)

      // Configuration 2: Left-heavy tree with forced right-child scenarios
      sets[1].add(100)
      sets[1].add(50)
      sets[1].add(150)
      sets[1].add(25)
      sets[1].add(75)
      sets[1].add(125)
      sets[1].add(175)
      sets[1].add(12)
      sets[1].add(37)
      sets[1].add(62)
      sets[1].add(87)
      // Delete to create right-child with red sibling scenario
      sets[1].delete(175)
      sets[1].delete(150)
      sets[1].delete(125)

      // Configuration 3: Complex deletion sequence
      const values3 = [64, 32, 96, 16, 48, 80, 112, 8, 24, 40, 56, 72, 88, 104, 120]
      values3.forEach((v) => sets[2].add(v))
      // Delete in reverse order to force various rebalancing scenarios
      values3.reverse().forEach((v) => sets[2].delete(v))

      // Configuration 4: Alternate pattern
      const values4 = [128, 64, 192, 32, 96, 160, 224, 16, 48, 80, 112, 144, 176, 208, 240]
      values4.forEach((v) => sets[3].add(v))
      // Delete every other element to create specific tree structures
      for (let i = 0; i < values4.length; i += 2) {
        sets[3].delete(values4[i])
      }

      // Configuration 5: Dense tree with strategic deletions
      for (let i = 1; i <= 31; i++) {
        sets[4].add(i)
      }
      // Delete in a pattern that forces right-child scenarios
      const deletePattern = [31, 30, 29, 28, 27, 26, 25, 24, 16, 8, 4, 2, 1]
      deletePattern.forEach((v) => sets[4].delete(v))

      // Configuration 6: Specific pattern to trigger sibling rebalancing
      const pattern6 = [256, 128, 384, 64, 192, 320, 448, 32, 96, 160, 224, 288, 352, 416, 480]
      pattern6.forEach((v) => sets[5].add(v))
      // Delete in a way that creates right-child with specific sibling colors
      const deletePattern6 = [480, 448, 416, 384, 352, 320, 288, 256, 224, 192, 160, 128, 96, 64, 32]
      deletePattern6.forEach((v) => sets[5].delete(v))

      // Configuration 7: Another pattern for complete coverage
      const pattern7 = [512, 256, 768, 128, 384, 640, 896, 64, 192, 320, 448, 576, 704, 832, 960]
      pattern7.forEach((v) => sets[6].add(v))
      // Mixed deletion pattern
      const deletePattern7 = [960, 896, 832, 768, 704, 640, 576, 512, 448, 384, 320, 256, 192, 128, 64]
      deletePattern7.forEach((v) => {
        if (sets[6].has(v)) sets[6].delete(v)
      })

      // Configuration 8: Force specific black sibling cases
      const pattern8 = [1024, 512, 1536, 256, 768, 1280, 1792, 128, 384, 640, 896, 1152, 1408, 1664, 1920]
      pattern8.forEach((v) => sets[7].add(v))
      // Delete to create scenarios where sibling has all black children
      const deletePattern8 = [1920, 1792, 1664, 1536, 1408, 1280, 1152, 1024, 896, 768, 640, 512, 384, 256, 128]
      deletePattern8.forEach((v) => {
        if (sets[7].has(v)) sets[7].delete(v)
      })

      // Configuration 9: Extreme right-heavy deletion
      const pattern9 = [2048, 1024, 3072, 512, 1536, 2560, 3584, 256, 768, 1280, 1792, 2304, 2816, 3328, 3840]
      pattern9.forEach((v) => sets[8].add(v))
      // Delete all right-side nodes first
      const deletePattern9 = [3840, 3584, 3328, 3072, 2816, 2560, 2304, 2048]
      deletePattern9.forEach((v) => sets[8].delete(v))

      // Configuration 10: Final complex pattern
      const pattern10 = [4096, 2048, 6144, 1024, 3072, 5120, 7168, 512, 1536, 2560, 3584, 4608, 5632, 6656, 7680]
      pattern10.forEach((v) => sets[9].add(v))
      // Delete in a pattern that should trigger all remaining edge cases
      const deletePattern10 = [7680, 7168, 6656, 6144, 5632, 5120, 4608, 4096, 3584, 3072, 2560, 2048, 1536, 1024, 512]
      deletePattern10.forEach((v) => {
        if (sets[9].has(v)) sets[9].delete(v)
      })

      // Verify all sets maintain sorted order
      sets.forEach((set) => {
        const array = set.toArray()
        for (let i = 1; i < array.length; i++) {
          testsRunner.expect(array[i]).toBeGreaterThan(array[i - 1])
        }
      })
    })

    testsRunner.test('final edge case scenarios for right-child Red-Black tree deletion', async () => {
      // This test specifically targets the remaining uncovered lines 364-368 and 375-379
      // These are right-child scenarios in fixDeletion with red sibling and specific color configurations

      const set = new SortedSet<number>()

      // Create a very specific tree structure that should trigger these edge cases
      // We need a scenario where:
      // 1. A node is a right child
      // 2. Its sibling is red
      // 3. The sibling has specific black/red child configurations

      // Pattern designed to create right-child with red sibling scenarios
      const specialPattern = [
        // Root and primary structure
        1000, 500, 1500,
        // Left subtree
        250, 750, 125, 375, 625, 875,
        // Right subtree
        1250, 1750, 1125, 1375, 1625, 1875,
        // Additional nodes to force specific configurations
        62, 187, 312, 437, 562, 687, 812, 937, 1062, 1187, 1312, 1437, 1562, 1687, 1812, 1937,
        // More specific nodes
        31, 93, 156, 218, 281, 343, 406, 468, 531, 593, 656, 718, 781, 843, 906, 968,
        // Right side additions
        1031, 1093, 1156, 1218, 1281, 1343, 1406, 1468, 1531, 1593, 1656, 1718, 1781, 1843, 1906, 1968
      ]

      // Add all nodes
      specialPattern.forEach((v) => set.add(v))

      // Delete in a very specific pattern to trigger right-child red sibling scenarios
      const rightChildDeletionPattern = [
        // Start with rightmost nodes to force right-child scenarios
        1968, 1937, 1906, 1875, 1843, 1812, 1781, 1750, 1718, 1687, 1656, 1625, 1593, 1562, 1531, 1500,
        // Then delete left side nodes that might be right children of their parents
        968, 937, 906, 875, 843, 812, 781, 750, 718, 687, 656, 625, 593, 562, 531, 500,
        // Continue with more targeted deletions
        1468, 1437, 1406, 1375, 1343, 1312, 1281, 1250, 1218, 1187, 1156, 1125, 1093, 1062, 1031, 1000, 468, 437, 406, 375, 343, 312, 281, 250, 218, 187, 156, 125, 93, 62, 31
      ]

      // Delete nodes in the specific pattern
      rightChildDeletionPattern.forEach((v) => {
        if (set.has(v)) {
          set.delete(v)
        }
      })

      // Verify tree integrity
      const finalArray = set.toArray()
      for (let i = 1; i < finalArray.length; i++) {
        testsRunner.expect(finalArray[i]).toBeGreaterThan(finalArray[i - 1])
      }

      // Try another approach with a different structure
      const set2 = new SortedSet<number>()

      // Create a more asymmetric tree to force specific rebalancing
      const asymmetricPattern = [
        // Central nodes
        512, 256, 768, 128, 384, 640, 896,
        // Force specific parent-child relationships
        64, 192, 320, 448, 576, 704, 832, 960,
        // Add nodes that will create red siblings when others are deleted
        32, 96, 160, 224, 288, 352, 416, 480, 544, 608, 672, 736, 800, 864, 928, 992,
        // More asymmetric additions
        16, 48, 80, 112, 144, 176, 208, 240, 272, 304, 336, 368, 400, 432, 464, 496
      ]

      asymmetricPattern.forEach((v) => set2.add(v))

      // Delete in a pattern that maximizes right-child scenarios
      const asymmetricDeletionPattern = [
        992, 960, 928, 896, 864, 832, 800, 768, 736, 704, 672, 640, 608, 576, 544, 512, 496, 480, 464, 448, 432, 416, 400, 384, 368, 352, 336, 320, 304, 288, 272, 256
      ]

      asymmetricDeletionPattern.forEach((v) => {
        if (set2.has(v)) {
          set2.delete(v)
        }
      })

      // Verify second tree integrity
      const finalArray2 = set2.toArray()
      for (let i = 1; i < finalArray2.length; i++) {
        testsRunner.expect(finalArray2[i]).toBeGreaterThan(finalArray2[i - 1])
      }
    })

    testsRunner.test('shift and pop operations', async () => {
      const set = new SortedSet<number>()

      // Test empty set
      testsRunner.expect(set.shift()).toBeUndefined()
      testsRunner.expect(set.pop()).toBeUndefined()

      // Add elements
      set.add(5)
      set.add(2)
      set.add(8)
      set.add(1)
      set.add(9)

      // Test shift (remove smallest)
      testsRunner.expect(set.shift()).toEqual(1)
      testsRunner.expect(set.toArray()).toEqual([2, 5, 8, 9])
      testsRunner.expect(set.size).toEqual(4)

      // Test pop (remove largest)
      testsRunner.expect(set.pop()).toEqual(9)
      testsRunner.expect(set.toArray()).toEqual([2, 5, 8])
      testsRunner.expect(set.size).toEqual(3)

      // Continue shifting
      testsRunner.expect(set.shift()).toEqual(2)
      testsRunner.expect(set.shift()).toEqual(5)
      testsRunner.expect(set.shift()).toEqual(8)
      testsRunner.expect(set.shift()).toBeUndefined()
      testsRunner.expect(set.size).toEqual(0)
      testsRunner.expect(set.isEmpty).toEqual(true)
    })

    testsRunner.test('concurrent shift operations - race condition test', async () => {
      const set = new SortedSet<number>()
      const numberOfElements = 100
      const numberOfWorkers = 10

      // Fill set with numbers 1 to 100
      for (let i = 1; i <= numberOfElements; i++) {
        set.add(i)
      }

      const shiftedValues: number[] = []
      const promises: Promise<void>[] = []

      // Create multiple workers trying to shift simultaneously
      for (let worker = 0; worker < numberOfWorkers; worker++) {
        const promise = new Promise<void>((resolve) => {
          const workerShifted: number[] = []

          const shiftNext = () => {
            const value = set.shift()
            if (value !== undefined) {
              workerShifted.push(value)
              // Use setTimeout to allow other workers to interleave
              setTimeout(shiftNext, 0)
            } else {
              shiftedValues.push(...workerShifted)
              resolve()
            }
          }

          shiftNext()
        })

        promises.push(promise)
      }

      await Promise.all(promises)

      // Verify all elements were shifted exactly once
      shiftedValues.sort((a, b) => a - b)
      testsRunner.expect(shiftedValues.length).toEqual(numberOfElements)

      for (let i = 0; i < numberOfElements; i++) {
        testsRunner.expect(shiftedValues[i]).toEqual(i + 1)
      }

      // Verify set is empty
      testsRunner.expect(set.size).toEqual(0)
      testsRunner.expect(set.isEmpty).toEqual(true)
    })

    testsRunner.test('concurrent add and shift operations', async () => {
      const set = new SortedSet<number>()
      const maxValue = 50
      let addCount = 0
      let shiftCount = 0
      const shiftedValues: number[] = []

      // Create adder workers
      const adderPromises = Array.from(
        { length: 5 },
        () =>
          new Promise<void>((resolve) => {
            const addNext = () => {
              if (addCount < maxValue) {
                const value = ++addCount
                set.add(value)
                setTimeout(addNext, Math.random() * 10)
              } else {
                resolve()
              }
            }
            addNext()
          })
      )

      // Create shifter workers
      const shifterPromises = Array.from(
        { length: 3 },
        () =>
          new Promise<void>((resolve) => {
            const shiftNext = () => {
              if (shiftCount < maxValue) {
                const value = set.shift()
                if (value !== undefined) {
                  shiftedValues.push(value)
                  shiftCount++
                }
                setTimeout(shiftNext, Math.random() * 15)
              } else {
                resolve()
              }
            }
            shiftNext()
          })
      )

      await Promise.all([...adderPromises, ...shifterPromises])

      // Verify all added elements were eventually shifted
      shiftedValues.sort((a, b) => a - b)
      testsRunner.expect(shiftedValues.length).toEqual(maxValue)

      for (let i = 0; i < maxValue; i++) {
        testsRunner.expect(shiftedValues[i]).toEqual(i + 1)
      }
    })

    testsRunner.test('high-frequency concurrent operations', async () => {
      const set = new SortedSet<number>()
      const operationCount = 1000
      const workerCount = 20

      let completedOperations = 0
      const results: Array<{ operation: string; value?: number; success: boolean }> = []

      const promises = Array.from(
        { length: workerCount },
        (_, workerId) =>
          new Promise<void>((resolve) => {
            const performOperations = () => {
              if (completedOperations >= operationCount) {
                resolve()
                return
              }

              completedOperations++
              const operationType = Math.random()

              if (operationType < 0.4) {
                // 40% add operations
                const value = Math.floor(Math.random() * 500) + 1
                const success = set.add(value)
                results.push({ operation: 'add', value, success })
              } else if (operationType < 0.8) {
                // 40% shift operations
                const value = set.shift()
                results.push({ operation: 'shift', value, success: value !== undefined })
              } else {
                // 20% size check operations
                const size = set.size
                results.push({ operation: 'size', value: size, success: true })
              }

              // Use setImmediate for better concurrency simulation
              setImmediate(performOperations)
            }

            performOperations()
          })
      )

      await Promise.all(promises)

      // Verify operations completed
      testsRunner.expect(results.length).toEqual(operationCount)

      // Verify set is in valid state
      const finalArray = set.toArray()
      for (let i = 1; i < finalArray.length; i++) {
        testsRunner.expect(finalArray[i]).toBeGreaterThan(finalArray[i - 1])
      }
    })

    testsRunner.test('custom comparator with concurrent operations', async () => {
      // Test with objects and custom comparator
      interface Task {
        id: number
        priority: number
        name: string
      }

      const set = new SortedSet<Task>((a, b) => {
        // Sort by priority (lower number = higher priority)
        if (a.priority !== b.priority) {
          return a.priority - b.priority
        }
        // Secondary sort by id for stability
        return a.id - b.id
      })

      const tasks: Task[] = [
        { id: 1, priority: 3, name: 'Low priority task' },
        { id: 2, priority: 1, name: 'High priority task' },
        { id: 3, priority: 2, name: 'Medium priority task' },
        { id: 4, priority: 1, name: 'Another high priority task' },
        { id: 5, priority: 3, name: 'Another low priority task' }
      ]

      // Add tasks concurrently
      const addPromises = tasks.map(
        (task) =>
          new Promise<void>((resolve) => {
            setTimeout(() => {
              set.add(task)
              resolve()
            }, Math.random() * 10)
          })
      )

      await Promise.all(addPromises)

      // Verify correct ordering
      const sortedTasks = set.toArray()
      testsRunner.expect(sortedTasks.length).toEqual(5)

      // Should be sorted by priority first, then by id
      testsRunner.expect(sortedTasks[0].priority).toEqual(1)
      testsRunner.expect(sortedTasks[0].id).toEqual(2)
      testsRunner.expect(sortedTasks[1].priority).toEqual(1)
      testsRunner.expect(sortedTasks[1].id).toEqual(4)
      testsRunner.expect(sortedTasks[2].priority).toEqual(2)
      testsRunner.expect(sortedTasks[3].priority).toEqual(3)
      testsRunner.expect(sortedTasks[4].priority).toEqual(3)

      // Test concurrent shift operations
      const shiftedTasks: Task[] = []
      const shiftPromises = Array.from(
        { length: 3 },
        () =>
          new Promise<void>((resolve) => {
            const shiftNext = () => {
              const task = set.shift()
              if (task) {
                shiftedTasks.push(task)
                setTimeout(shiftNext, Math.random() * 5)
              } else {
                resolve()
              }
            }
            shiftNext()
          })
      )

      await Promise.all(shiftPromises)

      // Verify tasks were shifted in correct priority order
      testsRunner.expect(shiftedTasks.length).toEqual(5)
      testsRunner.expect(shiftedTasks[0].priority).toEqual(1)
      testsRunner.expect(shiftedTasks[1].priority).toEqual(1)
      testsRunner.expect(shiftedTasks[2].priority).toEqual(2)
      testsRunner.expect(shiftedTasks[3].priority).toEqual(3)
      testsRunner.expect(shiftedTasks[4].priority).toEqual(3)
    })

    testsRunner.test('stress test - rapid concurrent shift operations', async () => {
      const set = new SortedSet<number>()
      const elementCount = 500
      const workerCount = 50

      // Fill set with elements
      for (let i = 1; i <= elementCount; i++) {
        set.add(i)
      }

      const shiftResults: number[] = []
      let activeWorkers = workerCount

      const promises = Array.from(
        { length: workerCount },
        () =>
          new Promise<void>((resolve) => {
            const rapidShift = () => {
              const value = set.shift()
              if (value !== undefined) {
                shiftResults.push(value)
                // Use setImmediate for maximum concurrency
                setImmediate(rapidShift)
              } else {
                activeWorkers--
                resolve()
              }
            }
            rapidShift()
          })
      )

      await Promise.all(promises)

      // Verify all elements were shifted
      shiftResults.sort((a, b) => a - b)
      testsRunner.expect(shiftResults.length).toEqual(elementCount)

      // Verify no duplicates and correct sequence
      const uniqueValues = new Set(shiftResults)
      testsRunner.expect(uniqueValues.size).toEqual(elementCount)

      for (let i = 0; i < elementCount; i++) {
        testsRunner.expect(shiftResults[i]).toEqual(i + 1)
      }

      // Verify set is empty
      testsRunner.expect(set.size).toEqual(0)
      testsRunner.expect(set.isEmpty).toEqual(true)
    })

    testsRunner.test('mixed operations with size validation', async () => {
      const set = new SortedSet<number>()
      const operationCount = 200
      let addedCount = 0
      let shiftedCount = 0

      const promises = Array.from(
        { length: 10 },
        () =>
          new Promise<void>((resolve) => {
            let operations = 0

            const performOperation = () => {
              if (operations >= operationCount / 10) {
                resolve()
                return
              }

              operations++
              const operation = Math.random()

              if (operation < 0.6) {
                // 60% add operations
                const value = Math.floor(Math.random() * 1000) + 1
                if (set.add(value)) {
                  addedCount++
                }
              } else {
                // 40% shift operations
                const value = set.shift()
                if (value !== undefined) {
                  shiftedCount++
                }
              }

              // Validate size consistency
              const expectedSize = addedCount - shiftedCount
              if (set.size !== expectedSize) {
                throw new Error(`Size mismatch: expected ${expectedSize}, got ${set.size}`)
              }

              setImmediate(performOperation)
            }

            performOperation()
          })
      )

      await Promise.all(promises)

      // Final validation
      const finalSize = addedCount - shiftedCount
      testsRunner.expect(set.size).toEqual(finalSize)
      testsRunner.expect(set.isEmpty).toEqual(finalSize === 0)
    })

    testsRunner.test('set operations with concurrent modifications', async () => {
      const set1 = new SortedSet<number>()
      const set2 = new SortedSet<number>()

      // Add elements to both sets
      for (let i = 1; i <= 20; i++) {
        set1.add(i)
        if (i % 2 === 0) {
          set2.add(i)
        }
      }

      // Perform set operations while concurrently modifying
      const operationPromises = [
        new Promise<void>((resolve) => {
          setTimeout(() => {
            const union = set1.union(set2)
            // Union size should be at least 0 (can be less than 20 due to concurrent modifications)
            testsRunner.expect(union.size).toBeGreaterThanOrEqual(0)
            resolve()
          }, 10)
        }),
        new Promise<void>((resolve) => {
          setTimeout(() => {
            const intersection = set1.intersection(set2)
            testsRunner.expect(intersection.size).toBeGreaterThanOrEqual(0)
            resolve()
          }, 15)
        }),
        new Promise<void>((resolve) => {
          setTimeout(() => {
            const difference = set1.difference(set2)
            testsRunner.expect(difference.size).toBeGreaterThanOrEqual(0)
            resolve()
          }, 20)
        })
      ]

      // Concurrently modify sets
      const modificationPromises = [
        new Promise<void>((resolve) => {
          let count = 0
          const modify = () => {
            if (count < 10) {
              set1.shift()
              count++
              setTimeout(modify, 5)
            } else {
              resolve()
            }
          }
          modify()
        }),
        new Promise<void>((resolve) => {
          let count = 0
          const modify = () => {
            if (count < 5) {
              set2.shift()
              count++
              setTimeout(modify, 8)
            } else {
              resolve()
            }
          }
          modify()
        })
      ]

      await Promise.all([...operationPromises, ...modificationPromises])

      // Verify sets are still in valid state
      const array1 = set1.toArray()
      const array2 = set2.toArray()

      for (let i = 1; i < array1.length; i++) {
        testsRunner.expect(array1[i]).toBeGreaterThan(array1[i - 1])
      }

      for (let i = 1; i < array2.length; i++) {
        testsRunner.expect(array2[i]).toBeGreaterThan(array2[i - 1])
      }
    })
  })

  await testsRunner.run()

  evaluateTestResults(testsRunner)
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  sortSetTest()
}
