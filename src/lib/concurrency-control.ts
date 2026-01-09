/**
 * 并发控制工具
 * 限制同时执行的异步任务数量
 */

export interface ConcurrencyLimitOptions {
  limit: number; // 最大并发数
  onProgress?: (current: number, total: number) => void; // 进度回调
}

/**
 * 并发限制执行器（优化版 - 使用 Set 提升性能）
 */
export async function runWithConcurrencyLimit<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  options: ConcurrencyLimitOptions
): Promise<R[]> {
  const { limit, onProgress } = options;
  const results: R[] = [];
  const executing = new Set<Promise<void>>(); // 使用 Set 替代数组，O(1) 删除复杂度
  let completed = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    // 创建任务
    const task = fn(item, i).then((result) => {
      results[i] = result;
      completed++;
      if (onProgress) {
        onProgress(completed, items.length);
      }
    });

    // 将任务包装为可追踪的 Promise
    const wrappedTask = task.then(() => {
      // 任务完成后从执行队列中移除 - O(1) 复杂度
      executing.delete(wrappedTask);
    });

    executing.add(wrappedTask);

    // 如果达到并发限制，等待任意一个任务完成
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }

  // 等待所有剩余任务完成
  await Promise.all(executing);

  return results;
}

/**
 * 批量执行任务（带并发控制）
 */
export class ConcurrencyQueue<T, R> {
  private queue: Array<{
    item: T;
    resolve: (value: R) => void;
    reject: (error: Error) => void;
  }> = [];
  private running = 0;
  private completed = 0;
  private total = 0;

  constructor(
    private limit: number,
    private fn: (item: T, index: number) => Promise<R>,
    private onProgress?: (current: number, total: number) => void
  ) {}

  async add(item: T): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      this.queue.push({ item, resolve, reject });
      this.total++;
      this.process();
    });
  }

  private async process() {
    if (this.running >= this.limit || this.queue.length === 0) {
      return;
    }

    this.running++;
    const task = this.queue.shift();

    if (!task) {
      this.running--;
      return;
    }

    try {
      const result = await this.fn(task.item, this.completed);
      this.completed++;
      if (this.onProgress) {
        this.onProgress(this.completed, this.total);
      }
      task.resolve(result);
    } catch (error) {
      task.reject(error as Error);
    } finally {
      this.running--;
      this.process();
    }
  }

  async waitAll(): Promise<void> {
    while (this.running > 0 || this.queue.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}
