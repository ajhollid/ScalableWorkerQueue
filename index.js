const express = require("express");
const JobQueue = require("./JobQueue");
const app = express();
const port = 3000;
app.use(express.json());

startServer = async () => {
  const jobQueue = await JobQueue.createQueue();

  app.post("/job", (req, res) => {
    jobQueue.addJob(Math.random().toString(36).substring(7));
    return res.send("Added job");
  });

  app.get("/job", async (req, res) => {
    const jobs = await jobQueue.getJobs();
    return res.status(200).json({ jobs: jobs.length });
  });

  app.post("/job/obliterate", async (req, res) => {
    const obliterated = await jobQueue.obliterate();
    if (obliterated === true) {
      return res.status(200).send("Obliterated jobs");
    }
    return res.status(500).send("Failed to obliterate jobs");
  });

  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });
};

startServer();
