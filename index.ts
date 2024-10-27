import { WebSocketServer } from 'ws';
import { httpServer } from './src/http_server';

const HTTP_PORT = 8181;
const WEBSOCKET_PORT = parseInt(process.env.WEBSOCKET_PORT) || 3000;

console.log(`Start static http server on the ${HTTP_PORT} port!`);
httpServer.listen(HTTP_PORT);

type Command =
  | 'reg'
  | 'create_room'
  | 'add_user_to_room'
  | 'create_game'
  | 'start_game'
  | 'turn'
  | 'attack'
  | 'finish'
  | 'update_room'
  | 'update_winners';

class User {
  private name: string;
  private index: string;

  constructor(name: string) {
    this.name = name;
    this.index = `user-${getRandomId()}`;
  }

  getIndex() {
    return this.index;
  }
}

class Room {
  private roomId: string;
  private roomUsers: User[];
  constructor() {
    this.roomId = `room-${getRandomId()}`;
    this.roomUsers = [];
  }

  getRoomId(): string {
    return this.roomId;
  }

  addUser(user: User): void {
    this.roomUsers.push(user);
  }

  hasUser(user: User): void {
    this.roomUsers.some((roomUser) => roomUser.getIndex() === user.getIndex());
  }

  isFull(): boolean {
    return this.roomUsers.length == 2;
  }
}

const toSerializedMessage = (type: Command, payload: object) => {
  return JSON.stringify({
    type,
    data: JSON.stringify(payload),
    id: 0,
  });
};

const getRandomId = () =>
  `${Date.now()}-${Math.floor(Math.random() * 0x10000)}`;

const socketToUserMap = new Map();
const userMap = new Map<string, User>();
const roomMap = new Map<string, Room>();

const webSocketServer = new WebSocketServer({
  port: WEBSOCKET_PORT,
})
  .on('listening', () => {
    console.log(`[WebSocket]: Listening to ${HTTP_PORT}`);
  })
  .on('connection', (ws, request, client) => {
    console.log(client);
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

          ws.send(
            toSerializedMessage('reg', {
              name: dataPayload.name,
              index: user.getIndex(),
              error: false,
            }),
          );

          ws.send(
            toSerializedMessage('reg', {
              name: dataPayload.name,
              index: user.getIndex(),
              error: false,
            }),
          );

          webSocketServer.clients.forEach((client) => {
            client.send(toSerializedMessage('update_winners', []));
            client.send(
              toSerializedMessage('update_room', Array.from(roomMap.values())),
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
          // room.addUser(user);
          roomMap.set(room.getRoomId(), room);

          console.log(
            `[Game]: added ${user.getIndex()} to room: ${room.getRoomId()}`,
          );

          webSocketServer.clients.forEach((client) => {
            client.send(
              toSerializedMessage('update_room', Array.from(roomMap.values())),
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
          webSocketServer.clients.forEach((client) => {
            client.send(toSerializedMessage('update_winners', []));
            client.send(
              toSerializedMessage('update_room', Array.from(roomMap.values())),
            );
          });
          break;
        }
        case 'create_game': {
        }
        case 'start_game': {
        }
        case 'finish': {
        }
        case 'update_room': {
        }
        case 'update_winners': {
        }
        case 'turn': {
        }
        case 'attack': {
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
