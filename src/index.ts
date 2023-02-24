import "reflect-metadata";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { buildSchemaSync } from "type-graphql";
import { UserResolver } from "./resolvers/user.resolver";
import models from './models';
import { checkForMigrations } from "./sequelize/helpers/migrations";
import { log } from "./utils";
const { sequelize } = models;


async function bootstrap() {
  try {
    await sequelize.authenticate();

    const migrations = await checkForMigrations();
    if (migrations.length) {
      log.info(
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
    resolvers: [UserResolver],
  });

  const server = new ApolloServer({
    schema,
  });

  await server.start();

  const app = express();
  server.applyMiddleware({ app });

  const port = process.env.PORT;

  app.listen(port, () => {
    log.info(`Server running at http://localhost:${port}${server.graphqlPath}`);
  });
}

bootstrap();