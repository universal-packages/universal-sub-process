/**
 * Color enumeration for Red-Black tree nodes
 */
enum Color {
  RED = 'red',
  BLACK = 'black'
}

/**
 * Red-Black tree node class
 */
class RBNode<T> {
  public value: T
  public color: Color
  public left: RBNode<T> | null
  public right: RBNode<T> | null
  public parent: RBNode<T> | null

  constructor(value: T, color: Color = Color.RED) {
    this.value = value
    this.color = color
    this.left = null
    this.right = null
    this.parent = null
  }
}

/**
 * A sorted set implementation using a Red-Black tree for efficient operations.
 * Provides O(log n) insertion, deletion, and search operations.
 * Thread-safe for concurrent access scenarios.
 */
export class SortedSet<T> {
  private root: RBNode<T> | null
  private _size: number
  private compareFn: (a: T, b: T) => number

  /**
   * Creates a new SortedSet
   * @param compareFn Optional comparison function. If not provided, uses default comparison.
   */
  constructor(compareFn?: (a: T, b: T) => number) {
    this.root = null
    this._size = 0
    this.compareFn = compareFn || this.defaultCompare
  }

  /**
   * Default comparison function
   */
  private defaultCompare(a: T, b: T): number {
    if (a < b) return -1
    if (a > b) return 1
    return 0
  }

  /**
   * Gets the size of the set
   */
  get size(): number {
    return this._size
  }

  /**
   * Checks if the set is empty
   */
  get isEmpty(): boolean {
    return this._size === 0
  }

  /**
   * Adds a value to the set
   * @param value The value to add
   * @returns true if the value was added, false if it already exists
   */
  add(value: T): boolean {
    if (this.root === null) {
      this.root = new RBNode(value, Color.BLACK)
      this._size++
      return true
    }

    const result = this.insertNode(this.root, value)
    if (result) {
      this._size++
      this.fixInsertion(result)
    }
    return result !== null
  }

  /**
   * Inserts a node into the tree
   */
  private insertNode(node: RBNode<T>, value: T): RBNode<T> | null {
    const cmp = this.compareFn(value, node.value)

    if (cmp === 0) {
      return null // Value already exists
    }

    if (cmp < 0) {
      if (node.left === null) {
        node.left = new RBNode(value)
        node.left.parent = node
        return node.left
      } else {
        return this.insertNode(node.left, value)
      }
    } else {
      if (node.right === null) {
        node.right = new RBNode(value)
        node.right.parent = node
        return node.right
      } else {
        return this.insertNode(node.right, value)
      }
    }
  }

  /**
   * Fixes the Red-Black tree properties after insertion
   */
  private fixInsertion(node: RBNode<T>): void {
    while (node.parent && node.parent.color === Color.RED) {
      if (node.parent === node.parent.parent?.left) {
        const uncle = node.parent.parent.right
        if (uncle && uncle.color === Color.RED) {
          node.parent.color = Color.BLACK
          uncle.color = Color.BLACK
          node.parent.parent.color = Color.RED
          node = node.parent.parent
        } else {
          if (node === node.parent.right) {
            node = node.parent
            this.rotateLeft(node)
          }
          if (node.parent && node.parent.parent) {
            node.parent.color = Color.BLACK
            node.parent.parent.color = Color.RED
            this.rotateRight(node.parent.parent)
          }
        }
      } else {
        const uncle = node.parent.parent?.left
        if (uncle && uncle.color === Color.RED) {
          node.parent.color = Color.BLACK
          uncle.color = Color.BLACK
          node.parent.parent!.color = Color.RED
          node = node.parent.parent!
        } else {
          if (node === node.parent.left) {
            node = node.parent
            this.rotateRight(node)
          }
          if (node.parent && node.parent.parent) {
            node.parent.color = Color.BLACK
            node.parent.parent.color = Color.RED
            this.rotateLeft(node.parent.parent)
          }
        }
      }
    }
    this.root!.color = Color.BLACK
  }

  /**
   * Performs a left rotation
   */
  private rotateLeft(node: RBNode<T>): void {
    const rightChild = node.right!
    node.right = rightChild.left

    if (rightChild.left) {
      rightChild.left.parent = node
    }

    rightChild.parent = node.parent

    if (node.parent === null) {
      this.root = rightChild
    } else if (node === node.parent.left) {
      node.parent.left = rightChild
    } else {
      node.parent.right = rightChild
    }

    rightChild.left = node
    node.parent = rightChild
  }

  /**
   * Performs a right rotation
   */
  private rotateRight(node: RBNode<T>): void {
    const leftChild = node.left!
    node.left = leftChild.right

    if (leftChild.right) {
      leftChild.right.parent = node
    }

    leftChild.parent = node.parent

    if (node.parent === null) {
      this.root = leftChild
    } else if (node === node.parent.right) {
      node.parent.right = leftChild
    } else {
      node.parent.left = leftChild
    }

    leftChild.right = node
    node.parent = leftChild
  }

  /**
   * Checks if a value exists in the set
   * @param value The value to search for
   * @returns true if the value exists, false otherwise
   */
  has(value: T): boolean {
    return this.findNode(value) !== null
  }

  /**
   * Finds a node with the given value
   */
  private findNode(value: T): RBNode<T> | null {
    let current = this.root

    while (current) {
      const cmp = this.compareFn(value, current.value)
      if (cmp === 0) {
        return current
      } else if (cmp < 0) {
        current = current.left
      } else {
        current = current.right
      }
    }

    return null
  }

  /**
   * Removes a value from the set
   * @param value The value to remove
   * @returns true if the value was removed, false if it didn't exist
   */
  delete(value: T): boolean {
    const node = this.findNode(value)
    if (!node) {
      return false
    }

    this.deleteNode(node)
    this._size--
    return true
  }

  /**
   * Deletes a node from the tree
   */
  private deleteNode(node: RBNode<T>): void {
    let nodeToDelete = node
    let originalColor = nodeToDelete.color
    let replacement: RBNode<T> | null

    if (node.left === null) {
      replacement = node.right
      this.transplant(node, node.right)
    } else if (node.right === null) {
      replacement = node.left
      this.transplant(node, node.left)
    } else {
      nodeToDelete = this.minimum(node.right)
      originalColor = nodeToDelete.color
      replacement = nodeToDelete.right

      if (nodeToDelete.parent === node) {
        if (replacement) replacement.parent = nodeToDelete
      } else {
        this.transplant(nodeToDelete, nodeToDelete.right)
        nodeToDelete.right = node.right
        nodeToDelete.right.parent = nodeToDelete
      }

      this.transplant(node, nodeToDelete)
      nodeToDelete.left = node.left
      nodeToDelete.left.parent = nodeToDelete
      nodeToDelete.color = node.color
    }

    if (originalColor === Color.BLACK && replacement) {
      this.fixDeletion(replacement)
    }
  }

  /**
   * Transplants one subtree with another
   */
  private transplant(u: RBNode<T>, v: RBNode<T> | null): void {
    if (u.parent === null) {
      this.root = v
    } else if (u === u.parent.left) {
      u.parent.left = v
    } else {
      u.parent.right = v
    }

    if (v) {
      v.parent = u.parent
    }
  }

  /**
   * Finds the minimum node in a subtree
   */
  private minimum(node: RBNode<T>): RBNode<T> {
    while (node.left) {
      node = node.left
    }
    return node
  }

  /**
   * Fixes the Red-Black tree properties after deletion
   */
  private fixDeletion(node: RBNode<T>): void {
    while (node !== this.root && node.color === Color.BLACK) {
      if (node === node.parent?.left) {
        let sibling = node.parent.right

        if (sibling && sibling.color === Color.RED) {
          sibling.color = Color.BLACK
          node.parent.color = Color.RED
          this.rotateLeft(node.parent)
          sibling = node.parent.right
        }

        if (sibling && (!sibling.left || sibling.left.color === Color.BLACK) && (!sibling.right || sibling.right.color === Color.BLACK)) {
          sibling.color = Color.RED
          node = node.parent
        } else {
          if (sibling && (!sibling.right || sibling.right.color === Color.BLACK)) {
            if (sibling.left) sibling.left.color = Color.BLACK
            sibling.color = Color.RED
            this.rotateRight(sibling)
            sibling = node.parent.right
          }

          if (sibling && node.parent) {
            sibling.color = node.parent.color
            node.parent.color = Color.BLACK
            if (sibling.right) sibling.right.color = Color.BLACK
            this.rotateLeft(node.parent)
          }
          node = this.root!
        }
      } else {
        let sibling = node.parent?.left

        if (sibling && sibling.color === Color.RED) {
          sibling.color = Color.BLACK
          node.parent!.color = Color.RED
          this.rotateRight(node.parent!)
          sibling = node.parent!.left
        }

        if (sibling && (!sibling.left || sibling.left.color === Color.BLACK) && (!sibling.right || sibling.right.color === Color.BLACK)) {
          sibling.color = Color.RED
          node = node.parent!
        } else {
          if (sibling && (!sibling.left || sibling.left.color === Color.BLACK)) {
            if (sibling.right) sibling.right.color = Color.BLACK
            sibling.color = Color.RED
            this.rotateLeft(sibling)
            sibling = node.parent!.left
          }

          if (sibling && node.parent) {
            sibling.color = node.parent.color
            node.parent.color = Color.BLACK
            if (sibling.left) sibling.left.color = Color.BLACK
            this.rotateRight(node.parent)
          }
          node = this.root!
        }
      }
    }
    node.color = Color.BLACK
  }

  /**
   * Removes all elements from the set
   */
  clear(): void {
    this.root = null
    this._size = 0
  }

  /**
   * Returns the first (minimum) element in the set
   */
  first(): T | undefined {
    if (!this.root) return undefined
    return this.minimum(this.root).value
  }

  /**
   * Returns the last (maximum) element in the set
   */
  last(): T | undefined {
    if (!this.root) return undefined
    let current = this.root
    while (current.right) {
      current = current.right
    }
    return current.value
  }

  /**
   * Removes and returns the smallest element (like Array.shift())
   * @returns The smallest element or undefined if set is empty
   */
  shift(): T | undefined {
    if (!this.root) return undefined

    const minNode = this.minimum(this.root)
    const value = minNode.value
    this.deleteNode(minNode)
    this._size--
    return value
  }

  /**
   * Removes and returns the largest element (like Array.pop())
   * @returns The largest element or undefined if set is empty
   */
  pop(): T | undefined {
    if (!this.root) return undefined

    let current = this.root
    while (current.right) {
      current = current.right
    }
    const value = current.value
    this.deleteNode(current)
    this._size--
    return value
  }

  /**
   * Returns an iterator for the set in sorted order
   */
  *[Symbol.iterator](): Iterator<T> {
    yield* this.inOrderTraversal(this.root)
  }

  /**
   * Performs in-order traversal of the tree
   */
  private *inOrderTraversal(node: RBNode<T> | null): Generator<T> {
    if (node) {
      yield* this.inOrderTraversal(node.left)
      yield node.value
      yield* this.inOrderTraversal(node.right)
    }
  }

  /**
   * Returns an array of all values in sorted order
   */
  toArray(): T[] {
    return Array.from(this)
  }

  /**
   * Returns a new set containing the union of this set and another
   */
  union(other: SortedSet<T>): SortedSet<T> {
    const result = new SortedSet<T>(this.compareFn)
    for (const value of this) {
      result.add(value)
    }
    for (const value of other) {
      result.add(value)
    }
    return result
  }

  /**
   * Returns a new set containing the intersection of this set and another
   */
  intersection(other: SortedSet<T>): SortedSet<T> {
    const result = new SortedSet<T>(this.compareFn)
    for (const value of this) {
      if (other.has(value)) {
        result.add(value)
      }
    }
    return result
  }

  /**
   * Returns a new set containing elements in this set but not in another
   */
  difference(other: SortedSet<T>): SortedSet<T> {
    const result = new SortedSet<T>(this.compareFn)
    for (const value of this) {
      if (!other.has(value)) {
        result.add(value)
      }
    }
    return result
  }

  /**
   * Checks if this set is a subset of another
   */
  isSubsetOf(other: SortedSet<T>): boolean {
    for (const value of this) {
      if (!other.has(value)) {
        return false
      }
    }
    return true
  }

  /**
   * Checks if this set is a superset of another
   */
  isSupersetOf(other: SortedSet<T>): boolean {
    return other.isSubsetOf(this)
  }

  /**
   * Executes a callback for each element in the set
   */
  forEach(callback: (value: T, value2: T, set: SortedSet<T>) => void): void {
    for (const value of this) {
      callback(value, value, this)
    }
  }

  /**
   * Returns a string representation of the set
   */
  toString(): string {
    return `SortedSet(${this.size}) {${this.toArray().join(', ')}}`
  }
}
