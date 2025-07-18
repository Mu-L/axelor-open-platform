export type Task<T> = () => Promise<T>;

export class TaskQueue {
  #queue: Task<any>[] = [];
  #running = false;
  #paused = false;
  #waiting: Promise<void> | undefined;
  #finished: (() => void) | undefined;

  #run() {
    if (this.#running) return;
    this.#running = true;
    this.#waiting =
      this.#waiting ??
      new Promise((resolve) => {
        this.#finished = () => resolve();
      });
    const task = this.#queue.shift();
    if (task) {
      task().finally(() => {
        this.#running = false;
        this.#run();
      });
    } else {
      this.#running = false;
      this.#finished?.();
      this.#waiting = undefined;
    }
  }

  add<T>(task: Task<T>) {
    if (this.#paused) return task();
    return new Promise<T>((resolve, reject) => {
      this.#queue.push(() => task().then(resolve).catch(reject));
      this.#run();
    });
  }

  pause() {
    this.#paused = true;
  }

  resume() {
    this.#paused = false;
  }

  wait() {
    return this.#waiting ?? Promise.resolve();
  }
}
