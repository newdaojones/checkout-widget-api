import { ApolloServer } from "apollo-server-express";
import { NonEmptyArray, buildSchema } from "type-graphql";
import { Container } from 'typedi';
import * as _ from 'lodash'
import { PubSub } from 'graphql-subscriptions';

Container.set('pubsub', new PubSub());

import { WebSocketServer } from 'ws';
import { Config } from "./config";
import { Express } from 'express'
import { useServer } from 'graphql-ws/lib/use/ws';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import type http from 'http';
import { authMiddlewareForGraphql } from "./middleware/auth";
import { customAuthChecker } from "./auth/authChecker";

const context = ({ req, connection }: { req: any, connection: any }) => {
  if (connection) {
    return connection.context;
  }

  return {
    user: _.get(req, 'user')
  };
};

export const initGraphql = async (app: Express, httpServer: http.Server) => {
  let resolversPattern: NonEmptyArray<string> = [
    `${__dirname}/resolvers/*.resolver.js`,
  ];

  if (!Config.isProduction && !Config.isStaging) {
    resolversPattern = [
      `${__dirname}/resolvers/*.resolver.ts`,
    ];
  }

  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });
  

  const schema = await buildSchema({
    resolvers: resolversPattern,
    authChecker: customAuthChecker,
    pubSub: Container.get('pubsub'),
    container: Container
  });

  // Save the returned server's info so we can shutdown this server later
  const serverCleanup = useServer({ schema }, wsServer);
  

  const server = new ApolloServer({
    schema,
    context,
    plugins: [
      // Proper shutdown for the HTTP server.
      // @ts-ignore
      ApolloServerPluginDrainHttpServer({ httpServer }),
      // Proper shutdown for the WebSocket server.
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
  });  
  
  await server.start();

  app.use('/graphql', authMiddlewareForGraphql);

  server.applyMiddleware({ app });
}