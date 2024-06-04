const { Queue, Worker } = require("bullmq");
const QUEUE_NAME = "monitors";
const connection = {
  host: process.env.BULL_MQ_HOST || "127.0.0.1",
  port: process.env.BULL_MQ_PORT || 6379,
};
const JOBS_PER_WORKER = 5;

class JobQueue {
  constructor() {
    this.queue = new Queue(QUEUE_NAME, {
      connection,
    });
    this.workers = [];
  }

  static async createQueue() {
    const queue = new JobQueue();
    await queue.scaleWorkers();
    return queue;
  }

  createWorker() {
    const worker = new Worker(
      QUEUE_NAME,
      async (job) => {
        // TODO Ping a monitor
        console.log(
          `${job.data.jobName} completed, workers: ${this.workers.length}`
        );
      },
      {
        connection,
      }
    );
    return worker;
  }

  async getWorkerStats() {
    const jobs = await this.queue.getRepeatableJobs();
    const load = jobs.length / this.workers.length;
    return { jobs, load };
  }

  async scaleWorkers(workerStats) {
    if (this.workers.length === 0) {
      // There are no workers, need to add one
      const worker = this.createWorker();
      this.workers.push(worker);
      return;
    }

    if (workerStats.load > JOBS_PER_WORKER) {
      // Find out how many more jobs we have than current workers can handle
      const excessJobs =
        workerStats.jobs.length - this.workers.length * JOBS_PER_WORKER;

      // Divide by jobs/worker to find out how many workers to add
      const workersToAdd = Math.ceil(excessJobs / JOBS_PER_WORKER);
      for (let i = 0; i < workersToAdd; i++) {
        const worker = this.createWorker();
        this.workers.push(worker);
      }
      return;
    }

    if (workerStats.load < JOBS_PER_WORKER) {
      // Find out how much excess capacity we have
      const workerCapacity = this.workers.length * JOBS_PER_WORKER;
      const excessCapacity = workerCapacity - workerStats.jobs.length;
      const workersToRemove = Math.floor(excessCapacity / JOBS_PER_WORKER);
      for (let i = 0; i < workersToRemove; i++) {
        const worker = this.workers.pop();
        worker.close();
      }
      return;
    }
  }

  async getJobs() {
    try {
      const jobs = await this.queue.getRepeatableJobs();
      return jobs;
    } catch (error) {
      console.log(error);
      return [];
    }
  }

  async addJob(jobName) {
    try {
      await this.queue.add(
        jobName,
        { jobName },
        {
          repeat: {
            every: 1000,
            limit: 100,
          },
        }
      );
      const workerStats = await this.getWorkerStats();
      await this.scaleWorkers(workerStats);
      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  async obliterate() {
    try {
      await this.queue.obliterate();
      return true;
    } catch (error) {
      false;
    }
  }
}

module.exports = JobQueue;
