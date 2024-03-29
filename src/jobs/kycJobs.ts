// !Important: Do not import this file in any place of the project, it runs as an independent process
import Queue from "bull";
import IoRedis from "ioredis";

require("dotenv").config();
import "../pubSub";
import { log } from "../utils";
import { checkForMigrations } from "../sequelize/helpers/migrations";
import { Config } from "../config";
import models from "../models";
import { KycService } from "../services/kycService";

const kycService = KycService.getInstance();

// health check
const redis = new IoRedis(Config.redis);

redis.ping(async (err: any) => {
  if (err) {
    log.error(
      {
        func: "fusionJobs",
        err,
      },
      "Redis Error On Fusion Jobs"
    );

    return;
  }

  models.sequelize
    .authenticate()
    .then(async () => {
      const migrations = await checkForMigrations();
      if (migrations.length) {
        // eslint-disable-next-line no-console
        console.error(
          "Pending migrations need to be run:\n",
          migrations.map((migration) => migration.name).join("\n "),
          '\nUse this command to run migrations:\n "yarn sequelize db:migrate"'
        );

        process.exit(1);
      }

      log.info("Database connection has been established successfully.");
    })
    .catch((err2) => {
      log.error(
        {
          func: "kycJobs",
          err: err2,
        },
        "Unable to connect to the database"
      );

      process.exit(1);
    });

  log.info(`KYC Jobs HealthCheck is OK on ${new Date()}`);
});

// Jobs
// ---------------------------------------------
const singleKycWorker = new Queue("KYC Single Worker", {
  redis: Config.redis,
  defaultJobOptions: {
    removeOnComplete: 1000,
    removeOnFail: 1000,
  },
});
singleKycWorker.process(async (job) => kycService.singleSyncKyc(job));

// ---------------------------------------------
const kyc10MinutesWorker = new Queue("KYC 10 Minutes Worker", {
  redis: Config.redis,
});

kyc10MinutesWorker.process(async (job) => kycService.syncKycIn10Days(job));

kyc10MinutesWorker.clean(0, "delayed");
kyc10MinutesWorker.add(
  {},
  {
    // every minute
    repeat: { cron: `* * * * *` },

    // keep the history for a week
    removeOnComplete: Config.bull.historyTTLInHours * 60,
    removeOnFail: Config.bull.historyTTLInHours * 60,
  }
);

// ---------------------------------------------
const kyc1HourWorker = new Queue("KYC 1 Hour Worker", {
  redis: Config.redis,
});

kyc1HourWorker.process(async (job) => kycService.syncKycInAnHour(job));

kyc1HourWorker.clean(0, "delayed");
kyc1HourWorker.add(
  {},
  {
    // every 5 minutes
    repeat: { cron: `*/5 * * * *` },

    // keep the history for a week
    removeOnComplete: Config.bull.historyTTLInHours * 12,
    removeOnFail: Config.bull.historyTTLInHours * 12,
  }
);

// ---------------------------------------------
const kyc2DaysWorker = new Queue("KYC 2 Days Worker", {
  redis: Config.redis,
});

kyc2DaysWorker.process(async (job) => kycService.syncKycIn2Days(job));

kyc2DaysWorker.clean(0, "delayed");
kyc2DaysWorker.add(
  {},
  {
    // every 30 minute
    repeat: { cron: `*/30 * * * *` },

    // keep the history for a week
    removeOnComplete: Config.bull.historyTTLInHours * 2,
    removeOnFail: Config.bull.historyTTLInHours,
  }
);

const kyc10DaysWorker = new Queue("KYC 10 Days Worker", {
  redis: Config.redis,
});

kyc10DaysWorker.process(async (job) => kycService.syncKycIn10Days(job));

kyc10DaysWorker.clean(0, "delayed");
kyc10DaysWorker.add(
  {},
  {
    // run the job every day at 8AM
    repeat: { cron: `0 8 * * *` },

    // keep the history for a week
    removeOnComplete: Config.bull.historyTTLInHours / 24,
    removeOnFail: Config.bull.historyTTLInHours / 24,
  }
);

log.info(`Pylon Jobs Started On ${new Date()}`);
