import { Ship } from './ship';
import { User } from './user';
import { AttackResult } from '../types';

export class Player {
  id: string;
  private user: User;
  ships: Ship[];
  dto: [];

  constructor(user: User) {
    this.id = user.getIndex();
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

  getUsername() {
    return this.user.getName();
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
    playerId: string;
    status: AttackResult;
    borders: [x: number, y: number][];
    hasLost: boolean;
  } {
    const response = {
      playerId: this.id,
      borders: [],
      hasLost: false,
    };

    for (let i = 0; i < this.ships.length; i++) {
      const ship = this.ships[i];
      const result = ship.attack(x, y);
      console.log('result', result);
      if (result !== 'miss') {
        if (result === 'retry') {
          return {
            ...response,
            status: 'retry',
          };
        }

        if (result === 'killed') {
          return {
            ...response,
            status: 'killed',
            borders: ship.getBorders(),
            hasLost: this.ships.every((ship) => ship.isDestroyed()),
          };
        }
        return {
          ...response,
          status: 'shot',
        };
      }
    }

    return {
      ...response,
      status: 'miss',
    };
  }
}
