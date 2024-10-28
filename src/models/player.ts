import { Ship } from './ship';
import { User } from './user';
import { AttackResult } from '../types';

export class Player {
  id: string;
  private user: User;
  ships: Ship[];
  dto: [];

  constructor(id: string, user: User) {
    this.id = id;
    this.user = user;
    this.ships = [];
    this.dto = [];
  }

  createShip(position, direction, length) {
    this.ships.push(new Ship(position, direction, length));
  }

  isReady(): boolean {
    return this.ships.length > 0;
  }

  getId() {
    return this.id;
  }

  getUserId() {
    return this.user.getIndex();
  }

  setDto(dto: []) {
    this.dto = dto;
  }

  getDto() {
    return this.dto;
  }

  checkAttack(
    x: number,
    y: number,
  ): {
    status: AttackResult;
    borders: [x: number, y: number][];
  } {
    for (let i = 0; i < this.ships.length; i++) {
      const ship = this.ships[i];
      const result = ship.attack(x, y);
      console.log('result', result);
      if (result !== 'miss') {
        if (result === 'retry') {
          return {
            status: 'retry',
            borders: [],
          };
        }

        if (result === 'killed') {
          return {
            status: 'killed',
            borders: ship.getBorders(),
          };
        }
        return {
          status: 'shot',
          borders: [],
        };
      }
    }

    return {
      status: 'miss',
      borders: [],
    };
  }
}
