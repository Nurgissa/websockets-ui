import { Player } from './player';
import { User } from './user';
import { getRandomId, getRandomPosition } from '../utils';
import { shipList } from './mock';

export class Bot extends Player {
  constructor() {
    super(new User(`bot-${getRandomId()}`), true);
    const ships = shipList[Math.floor(Math.random() * 0x1000) % 10];
    this.setDto(ships as []);
    for (const ship of ships) {
      this.createShip(ship.position, ship.direction, ship.length);
    }
  }

  getNextAttack() {
    return getRandomPosition();
  }
}
