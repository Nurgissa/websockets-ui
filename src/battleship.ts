import { User } from './models/user';
import { Room } from './models/room';
import { Game } from './models/game';
import { Player } from './models/player';

const ships1 = [
  {
    position: { x: 5, y: 4 },
    direction: false,
    type: 'huge',
    length: 4,
  },
  {
    position: { x: 4, y: 7 },
    direction: false,
    type: 'large',
    length: 3,
  },
  {
    position: { x: 6, y: 2 },
    direction: false,
    type: 'large',
    length: 3,
  },
  {
    position: { x: 4, y: 0 },
    direction: true,
    type: 'medium',
    length: 2,
  },
  {
    position: { x: 1, y: 5 },
    direction: false,
    type: 'medium',
    length: 2,
  },
  {
    position: { x: 0, y: 7 },
    direction: false,
    type: 'medium',
    length: 2,
  },
  {
    position: { x: 1, y: 0 },
    direction: false,
    type: 'small',
    length: 1,
  },
  {
    position: { x: 8, y: 8 },
    direction: false,
    type: 'small',
    length: 1,
  },
  {
    position: { x: 2, y: 2 },
    direction: true,
    type: 'small',
    length: 1,
  },
  {
    position: { x: 8, y: 6 },
    direction: false,
    type: 'small',
    length: 1,
  },
];

const ships2 = [
  { position: { x: 3, y: 1 }, direction: true, type: 'huge', length: 4 },
  { position: { x: 9, y: 2 }, direction: true, type: 'large', length: 3 },
  { position: { x: 5, y: 3 }, direction: false, type: 'large', length: 3 },
  { position: { x: 1, y: 4 }, direction: true, type: 'medium', length: 2 },
  { position: { x: 6, y: 0 }, direction: true, type: 'medium', length: 2 },
  { position: { x: 2, y: 7 }, direction: true, type: 'medium', length: 2 },
  { position: { x: 6, y: 6 }, direction: true, type: 'small', length: 1 },
  { position: { x: 0, y: 1 }, direction: false, type: 'small', length: 1 },
  { position: { x: 0, y: 7 }, direction: false, type: 'small', length: 1 },
  { position: { x: 6, y: 8 }, direction: true, type: 'small', length: 1 },
];

export function main() {
  const u1 = new User('u1');
  const u2 = new User('u2');

  const r1 = new Room();
  r1.addUser(u1);

  console.log(r1);
  r1.addUser(u2);

  console.log(r1);

  const p1 = new Player(u1);
  const p2 = new Player(u2);

  for (const ship of ships1) {
    p1.createShip(ship.position, ship.direction, ship.length);
  }

  for (const ship of ships2) {
    p2.createShip(ship.position, ship.direction, ship.length);
  }

  const g1 = new Game(r1);
  g1.addPlayer(p1);
  g1.addPlayer(p2);

  console.log(g1.isStartable());

  console.log(g1.getTurn());
  console.log(g1.isStartable());
  g1.start();
  console.log(g1.isStartable());
  // console.log(g1.getTurn());
  //
  // g1.attack(p1.getId(), { x: 1, y: 2 });
  // console.log(g1.getTurn());
  // g1.attack(p2.getId(), { x: 1, y: 2 });
  // console.log(g1.getTurn());
  // console.log(g1.attack(p1.getId(), { x: 6, y: 8 }));
  //
  // console.log(g1.attack(p1.getId(), { x: 2, y: 7 }));
  // const result = g1.attack(p1.getId(), { x: 2, y: 8 });
  // console.log(result);
  // console.log(g1.attack(p1.getId(), { x: 2, y: 7 }));
  // console.log(g1.attack(p1.getId(), { x: 2, y: 7 }));
}

export class Battleship {
  private userMap = new Map<string, User>();
  private gameMap = new Map<string, Game>();
  private roomMap = new Map<string, Room>();
}
