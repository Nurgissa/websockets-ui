import { WebSocketServer } from 'ws';
import { httpServer } from './src/http_server';
import { User } from './src/models/user';
import { Game } from './src/models/game';
import { Room } from './src/models/room';
import { Command } from './src/types';
import { getRandomPosition, toSerializedMessage } from './src/utils';
import { Player } from './src/models/player';
import assert from 'node:assert';
import { Bot } from './src/models/bot';

const HTTP_PORT = 8181;
const WEBSOCKET_PORT = parseInt(process.env.WEBSOCKET_PORT) || 3000;

console.log(`Start static http server on the ${HTTP_PORT} port!`);
httpServer.listen(HTTP_PORT);

const socketToUserMap = new Map();
const userToSocketMap = new Map();

const userMap = new Map<string, User>();
const gameMap = new Map<string, Game>();
const roomMap = new Map<string, Room>();
const winnersMap = new Map<string, number>();

// main();

const webSocketServer = new WebSocketServer({
  port: WEBSOCKET_PORT,
})
  .on('listening', () => {
    console.log(`[WebSocket]: Listening to ${HTTP_PORT}`);
  })
  .on('connection', (ws, request, client) => {
    ws.on('message', (message) => {
      const messagePayload = JSON.parse(message.toString());
      const dataPayload = JSON.parse(messagePayload.data || '{}');

      console.log(
        `[WebSocket]: Received command: ${messagePayload.type} with payload: ${JSON.stringify(messagePayload)}`,
      );
      switch (messagePayload.type as Command) {
        case 'reg': {
          if (userMap.get(messagePayload.id)) {
            return ws.send(
              toSerializedMessage('reg', {
                name: dataPayload.name,
                index: 1,
                error: true,
                errorText: `A user with account name: "${dataPayload.name}" already exists`,
              }),
            );
          }

          const user = new User(dataPayload.name);
          userMap.set(user.getIndex(), user);

          socketToUserMap.set(ws, user);
          userToSocketMap.set(user.getIndex(), ws);

          ws.send(
            toSerializedMessage('reg', {
              name: dataPayload.name,
              index: user.getIndex(),
              error: false,
            }),
          );

          webSocketServer.clients.forEach((client) => {
            client.send(
              toSerializedMessage(
                'update_winners',
                Array.from(winnersMap.entries()).map(([key, value]) => ({
                  name: key,
                  wins: value,
                })),
              ),
            );
            client.send(
              toSerializedMessage(
                'update_room',
                Array.from(roomMap.values()).filter((room) => !room.isFull()),
              ),
            );
          });
          break;
        }
        case 'create_room': {
          const user = socketToUserMap.get(ws);

          if (!user) {
            console.error(
              `[WebSocket]: Received command: ${messagePayload.type} from UNKNOWN user}`,
            );
            return;
          }

          const room = new Room();
          room.addUser(user);
          roomMap.set(room.getRoomId(), room);

          console.log(
            `[Game]: added ${user.getIndex()} to room: ${room.getRoomId()}`,
          );

          webSocketServer.clients.forEach((client) => {
            client.send(
              toSerializedMessage(
                'update_room',
                Array.from(roomMap.values()).filter((room) => !room.isFull()),
              ),
            );
          });
          break;
        }
        case 'add_user_to_room': {
          const user = socketToUserMap.get(ws);

          if (!user) {
            console.error(
              `[WebSocket]: Received command: ${messagePayload.type} from UNKNOWN user}`,
            );
            return;
          }

          const roomIndex = dataPayload.indexRoom;
          const room = roomMap.get(roomIndex);
          console.log(dataPayload, roomMap, room);

          if (!room) {
            console.error(
              `[WebSocket]: Received command: ${messagePayload.type} from ${user.getIndex()} join non-existing room: ${roomIndex}`,
            );
            return;
          }

          room.addUser(user);

          const game = new Game({ withBot: false });

          console.log(roomMap);
          if (room.isFull()) {
            room.getUsers().forEach((user) => {
              const player = new Player(user);
              game.addPlayer(player);

              const playerSocket = userToSocketMap.get(user.getIndex());

              if (!playerSocket) {
                console.error(
                  `[WebSocket]: Cannot find a socket for user: ${user.getIndex()}`,
                );
                return;
              }

              playerSocket.send(
                toSerializedMessage('create_game', {
                  idGame: game.getGameId(),
                  idPlayer: player.getId(),
                }),
              );

              gameMap.set(game.getGameId(), game);

              Array.from(roomMap.entries()).forEach(([roomId, room]) => {
                const userId = user.getIndex();
                if (!room.isFull() && room._hasUser(userId)) {
                  roomMap.delete(roomId);
                }
              });
            });
          }
          console.log(roomMap);
          webSocketServer.clients.forEach((client) => {
            client.send(toSerializedMessage('update_winners', []));
            client.send(
              toSerializedMessage(
                'update_room',
                Array.from(roomMap.values()).filter((room) => !room.isFull()),
              ),
            );
          });

          break;
        }
        case 'add_ships': {
          const gameId = dataPayload.gameId;
          const playerId = dataPayload.indexPlayer;
          const ships = dataPayload.ships;
          console.log(JSON.stringify(ships));

          const game = gameMap.get(gameId);
          console.assert(game);
          const player = game.getPlayer(playerId);
          player.setDto(ships);
          console.log({ player, playerId });
          if (playerId === player.getId()) {
            for (const ship of ships) {
              player.createShip(ship.position, ship.direction, ship.length);
            }
          }

          if (game.isStartable()) {
            game.start();

            game.getAllPlayers().forEach((player) => {
              if (!player.isBot()) {
                const userId = player.getUserId();
                const socket = userToSocketMap.get(userId);

                socket.send(
                  toSerializedMessage('start_game', {
                    ships: player.getDto(),
                    currentPlayerIndex: player.getId(),
                  }),
                );

                socket.send(
                  toSerializedMessage('turn', {
                    currentPlayer: game.getTurn(),
                  }),
                );
              }
            });
          }
          break;
        }
        case 'randomAttack':
        case 'attack': {
          const { gameId, indexPlayer: attackerId } = dataPayload;
          const randomPosition = getRandomPosition();

          let x = dataPayload.x ?? randomPosition.x;
          let y = dataPayload.y ?? randomPosition.y;

          const game = gameMap.get(gameId);
          if (!game) {
            console.error(
              `[Game]: Received ${messagePayload.type} command for non-exiting game with id: ${gameId}`,
            );
            return;
          }

          const playerId = game.getTurn();
          if (playerId !== attackerId) {
            console.error(
              `[Game]: Game id: ${gameId}. Attack does not match by indexPlayer`,
            );
            return;
          }

          const result = game.attack(playerId, {
            x,
            y,
          });
          game.getAllPlayers().forEach((player) => {
            if (!player.isBot()) {
              const userId = player.getUserId();
              const socket = userToSocketMap.get(userId);

              socket.send(
                toSerializedMessage('attack', {
                  position: {
                    x,
                    y,
                  },
                  currentPlayer: attackerId,
                  status: result.status,
                }),
              );

              if (result.status === 'killed') {
                result.borders.forEach((cell) => {
                  socket.send(
                    toSerializedMessage('attack', {
                      position: {
                        x: cell[0],
                        y: cell[1],
                      },
                      currentPlayer: attackerId,
                      status: 'miss',
                    }),
                  );
                });

                if (result.hasLost) {
                  socket.send(
                    toSerializedMessage('finish', {
                      winPlayer: attackerId,
                    }),
                  );
                }
              }

              if (!result.hasLost) {
                socket.send(
                  toSerializedMessage('turn', {
                    currentPlayer: game.getTurn(),
                  }),
                );
              }
            }
          });

          if (result.hasLost) {
            const user = userMap.get(attackerId);
            const winCount = winnersMap.get(user.getName()) || 0;
            winnersMap.set(user.getName(), winCount + 1);

            game.getAllPlayers().forEach((player) => {
              if (!player.isBot()) {
                const userId = player.getUserId();
                const socket = userToSocketMap.get(userId);
                socket.send(
                  toSerializedMessage(
                    'update_winners',
                    Array.from(winnersMap.entries()).map(([key, value]) => {
                      return {
                        name: key,
                        wins: value,
                      };
                    }),
                  ),
                );
              }
            });
            gameMap.delete(game.getGameId());
          }

          const opponent = game._getOpponentByPlayerId(attackerId);
          if (opponent.isBot()) {
            const positionToAttack = (opponent as Bot).getNextAttack();
            const result = game.attack(opponent.getId(), {
              ...positionToAttack,
            });

            ws.send(
              toSerializedMessage('attack', {
                position: {
                  ...positionToAttack,
                },
                currentPlayer: opponent.getId(),
                status: result.status,
              }),
            );

            if (!result.hasLost) {
              setTimeout(
                () =>
                  ws.send(
                    toSerializedMessage('turn', {
                      currentPlayer: game.getTurn(),
                    }),
                  ),
                1000,
              );
            }

            //
          }
          break;
        }
        case 'finish': {
        }
        case 'update_room': {
        }
        case 'update_winners': {
        }
        case 'turn': {
        }
        case 'single_play': {
          const user = socketToUserMap.get(ws);
          assert.ok(user);

          const game = new Game({
            withBot: true,
          });
          game.addPlayer(new Player(user));
          game.addPlayer(new Bot());

          gameMap.set(game.getGameId(), game);

          ws.send(
            toSerializedMessage('create_game', {
              idGame: game.getGameId(),
              idPlayer: user.getIndex(),
            }),
          );

          break;
        }

        default:
          console.log(
            `[WebSocket]: Received message type ${messagePayload.type}`,
          );
      }
    });

    ws.on('close', (...args2) => {
      console.log('WebSocket connection closed', args2);
    });
  })
  .on('close', (...args2) => {
    console.log('WebSocketServer closed', args2);
  });
