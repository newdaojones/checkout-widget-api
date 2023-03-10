import { ApolloServer } from "apollo-server-express";
import { NonEmptyArray, buildSchema } from "type-graphql";
import { Container } from 'typedi';
import { PubSub } from 'graphql-subscriptions';

Container.set('pubsub', new PubSub());

import { WebSocketServer } from 'ws';
import { Config } from "./config";
import { Express } from 'express'
import { useServer } from 'graphql-ws/lib/use/ws';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import type http from 'http';

export const initGraphql = async (app: Express, httpServer: http.Server) => {

  let resolversPattern: NonEmptyArray<string> = [
    `${__dirname}/resolvers/*.resolver.js`,
  ];

  if (!Config.isProduction) {
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
    pubSub: Container.get('pubsub'),
    container: Container
  });

  // Save the returned server's info so we can shutdown this server later
  const serverCleanup = useServer({ schema }, wsServer);
  

  const server = new ApolloServer({
    schema,
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
  
  server.applyMiddleware({ app });
}