// Settings

// Dependencies
import * as express from "express";
const bullArena = require("bull-arena");
const bull = require("bull");
import basicAuth from "express-basic-auth";
import { Config } from "../config";

const router = express.Router();

const jobs = [
  {
    name: "KYC Single Worker",
  },
  {
    name: "KYC 10 Minutes Worker",
  },
  {
    name: "KYC 1 Hour Worker",
  },
  {
    name: "KYC 2 Days Worker",
  },
  {
    name: "KYC 10 Days Worker",
  },
];

const jobsList = jobs.map((job) => ({
  ...job,
  hostId: "jobs",
  redis: {
    host: Config.redis.host,
    port: Config.redis.port,
    password: Config.redis.password,
  },
}));

const arena = bullArena(
  {
    Bull: bull,
    queues: [...jobsList],
  },
  {
    basePath: "/jobs",
    disableListen: true,
  }
);

router.use(
  "/jobs",
  basicAuth({
    users: {
      [Config.bull.admin.name]: Config.bull.admin.password,
    },
    challenge: true,
  })
);

router.use("/", arena);

export = router;
