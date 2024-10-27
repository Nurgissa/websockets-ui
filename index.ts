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
  | 'add_ships'
  | 'start_game'
  | 'turn'
  | 'attack'
  | 'finish'
  | 'update_room'
  | 'update_winners';

class User {
  private name: string;
  private readonly index: string;

  constructor(name: string) {
    this.name = name;
    this.index = `user-${getRandomId()}`;
  }

  getIndex() {
    return this.index;
  }
}

class Room {
  private readonly roomId: string;
  private roomUsers: User[];
  constructor() {
    this.roomId = `room-${getRandomId()}`;
    this.roomUsers = [];
  }

  getRoomId(): string {
    return this.roomId;
  }

  addUser(user: User): void {
    if (this._hasUser(user.getIndex())) return;
    this.roomUsers.push(user);
  }

  _hasUser(userId: string): boolean {
    return this.roomUsers.some((roomUser) => roomUser.getIndex() === userId);
  }

  isFull(): boolean {
    return this.roomUsers.length == 2;
  }

  getUsers(): User[] {
    return this.roomUsers;
  }
}

class ShipFragment {
  private x: number;
  private y: number;
  private isDamaged = false;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.isDamaged = false
  }

  attack(x: number, y: number) {
    if (x === this.x && y === this.y) {
      this.isDamaged = true;
      return;
    }
  }

  getIsDamaged() {
    return this.isDamaged;
  }
}

class Ship {
  type: "small" | "medium" | "large" | "huge"
  direction: "vertical" | "horizontal"
  position: ShipFragment[];


  constructor(position, type, direction, length) {
    this.type = type;
    this.direction = direction ? 'vertical' : 'horizontal';
    this.position = [];

    for (let i = 0; i < length; i++) {
      if (direction) {
        this.position.push(new ShipFragment(position.x, position.y + i));
      } else {
        this.position.push(new ShipFragment(position.x+1, position.y));
      }
    }
  }

  attack(x: number, y: number): boolean {
    return this.position.some(fragment => {
      fragment.attack(x, y);
      return fragment.getIsDamaged();
    })
  }
}

class Player {
  id: string;
  private user: User;
  ships: Ship[];

  constructor(id: string, user: User) {
    this.id = id;
    this.user = user;
    this.ships = [];
  }

  createShip(position, type, direction, length) {
    this.ships.push(new Ship(position, type, direction, length));
  }

  isReady(): boolean {
    return this.ships.length > 0
  }

  getId() {
    return this.id;
  }

  getUserId() {
    return this.user.getIndex()
  }
}


class Game {
  private readonly gameId: string;
  private map: Map<string, Player>;
  private room: Room;

  constructor(room: Room) {
    this.gameId = `game-${getRandomId()}`
    this.map = new Map();
    this.room = room;
  }

  getGameId(): string {
    return this.gameId;
  }

  addPlayer(id: string, user: User) {
    if (this.map.get(id)) {
      console.error(`[Game]: Cannot add a player with id: ${id} because it is already in the game`);
    }
    this.map.set(id, new Player(id, user));
  }

  getAllPlayers() {
    return Array.from(this.map.values())
  }

  getPlayer(id: string) {
    return this.map.get(id);
  }

  isStartable(): boolean {
    return Array.from(this.map.values()).every(player => player.isReady());
  }

  getRoom() {
    return this.room;
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
const userToSocketMap = new Map();

const userMap = new Map<string, User>();
const gameMap = new Map<string, Game>();
const roomMap = new Map<string, Room>();

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
          room.addUser(user);
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

          const game = new Game(room);
          if (room.isFull()) {
            room.getUsers().forEach(user => {
              const playerId = `player-${getRandomId()}`;
              game.addPlayer(playerId, user);

              const playerSocket = userToSocketMap.get(user.getIndex());

              if (!playerSocket) {
                console.error(`[WebSocket]: Cannot find a socket for user: ${user.getIndex()}`)
                return;
              }

              playerSocket.send(
                toSerializedMessage('create_game', {
                  idGame: game.getGameId(),
                  idPlayer: playerId,
                }),
              );

              gameMap.set(game.getGameId(), game);
            });
          }

          break;
        }
        case "add_ships": {
          const gameId = dataPayload.gameId;
          const playerId = dataPayload.indexPlayer;
          const ships = dataPayload.ships;

          const game = gameMap.get(gameId);
          const player = game.getPlayer(playerId);
          for (const ship of ships) {
            player.createShip(ship.position, ship.direction, ship.type, ship.length);
          }

          if (game.isStartable()) {
            game.getAllPlayers().forEach((player) => {
              const userId = player.getUserId();

              const socket = userToSocketMap.get(userId);
              socket.send(toSerializedMessage("start_game", {
                ships,
                currentPlayerIndex: player.getId(),
              }));
            });
          }
        }
        case 'attack': {
        }
        case 'finish': {
        }
        case 'update_room': {
        }
        case 'update_winners': {
        }
        case 'turn': {
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
