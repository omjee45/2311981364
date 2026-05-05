const TYPE_WEIGHTS = {
  Placement: 3.0,
  Result: 2.0,
  Event: 1.0,
};

function computeScore(notification) {
  const typeWeight = TYPE_WEIGHTS[notification.Type] || 1.0;

  const timestamp = new Date(notification.Timestamp).getTime();
  const now = Date.now();
  const hoursElapsed = Math.max(0, (now - timestamp) / (1000 * 60 * 60));

  const recencyFactor = 1 / (1 + hoursElapsed * 0.1);

  return typeWeight * recencyFactor;
}

class MinHeap {
  constructor(capacity) {
    this.capacity = capacity;
    this.heap = [];
  }

  size() {
    return this.heap.length;
  }

  peek() {
    return this.heap.length > 0 ? this.heap[0] : null;
  }

  push(item) {
    if (this.heap.length < this.capacity) {
      this.heap.push(item);
      this._bubbleUp(this.heap.length - 1);
    } else if (item.priorityScore > this.heap[0].priorityScore) {
      this.heap[0] = item;
      this._sinkDown(0);
    }
  }

  toSortedArray() {
    return [...this.heap].sort((a, b) => b.priorityScore - a.priorityScore);
  }

  _bubbleUp(idx) {
    while (idx > 0) {
      const parent = Math.floor((idx - 1) / 2);
      if (this.heap[parent].priorityScore > this.heap[idx].priorityScore) {
        [this.heap[parent], this.heap[idx]] = [this.heap[idx], this.heap[parent]];
        idx = parent;
      } else {
        break;
      }
    }
  }

  _sinkDown(idx) {
    const length = this.heap.length;
    while (true) {
      let smallest = idx;
      const left = 2 * idx + 1;
      const right = 2 * idx + 2;

      if (left < length && this.heap[left].priorityScore < this.heap[smallest].priorityScore) {
        smallest = left;
      }
      if (right < length && this.heap[right].priorityScore < this.heap[smallest].priorityScore) {
        smallest = right;
      }
      if (smallest !== idx) {
        [this.heap[smallest], this.heap[idx]] = [this.heap[idx], this.heap[smallest]];
        idx = smallest;
      } else {
        break;
      }
    }
  }
}

function getTopNPriority(notifications, n = 10) {
  const heap = new MinHeap(n);

  for (const notif of notifications) {
    const scored = {
      ...notif,
      priorityScore: computeScore(notif),
    };
    heap.push(scored);
  }

  return heap.toSortedArray();
}

module.exports = { computeScore, getTopNPriority, MinHeap };
