import "reflect-metadata";
import './models'
require('dotenv').config();

import express from "express";
import * as bodyParser from 'body-parser';
import { ApolloServer } from "apollo-server-express";
import { buildSchemaSync } from "type-graphql";
import { CheckoutResolver } from "./resolvers/checkout.resolver";
import models from './models';
import { checkForMigrations } from "./sequelize/helpers/migrations";
import { log } from "./utils";
import { initRoutes } from "./routes";
const { sequelize } = models;


async function bootstrap() {
  try {
    await sequelize.authenticate();

    const migrations = await checkForMigrations();
    if (migrations.length) {
      console.log(
        'Pending migrations need to be run:\n',
        migrations.map((migration) => migration.name).join('\n '),
        '\nUse this command to run migrations:\n yarn sequelize db:migrate',
      );

      process.exit(1);
    }

    log.info('Database connection has been established successfully.');
  } catch (err) {
    log.warn({
      err,
    }, 'Unable to connect to the database');
  }
  log.info('Sequelize Database Connected');

  const schema = buildSchemaSync({
    resolvers: [CheckoutResolver],
  });

  const server = new ApolloServer({
    schema,
  });

  await server.start();

  const app = express();
  app.use(bodyParser.json());
  // routes
  initRoutes(app);

  server.applyMiddleware({ app });

  const port = process.env.PORT;

  app.listen(port, () => {
    log.info(`Server running at http://localhost:${port}${server.graphqlPath}`);
  });
}

bootstrap();