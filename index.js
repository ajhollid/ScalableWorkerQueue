const express = require("express");
const app = express();
const port = 3000;

app.post("/job", (req, res) => {
  res.send("Added job");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
