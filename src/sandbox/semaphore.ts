// C2 — Concurrency Semaphore
// Structural bound on simultaneous agent executions.

export class ConcurrencySemaphore {
  private active = 0;
  private waiting: (() => void)[] = [];

  constructor(private maxConcurrent: number) {}

  async acquire(): Promise<void> {
    if (this.active < this.maxConcurrent) {
      this.active++;
      return;
    }
    return new Promise<void>((resolve) => {
      this.waiting.push(() => {
        this.active++;
        resolve();
      });
    });
  }

  release(): void {
    this.active--;
    const next = this.waiting.shift();
    if (next) next();
  }

  get currentActive(): number {
    return this.active;
  }

  get currentWaiting(): number {
    return this.waiting.length;
  }
}
