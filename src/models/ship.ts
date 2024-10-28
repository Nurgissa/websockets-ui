import { AttackResult } from '../types';
import { getNeighborCells } from '../utils';

export class Ship {
  private readonly fragments: Map<string, boolean>;
  private previousAttacks: Set<string>;

  constructor(
    position: { x: number; y: number },
    isVertical: boolean,
    length: number,
  ) {
    this.fragments = new Map();
    this.previousAttacks = new Set();

    for (let i = 0; i < length; i++) {
      if (isVertical) {
        this.fragments.set(`${position.x}-${position.y + i}`, false);
      } else {
        this.fragments.set(`${position.x + i}-${position.y}`, false);
      }
    }
    console.log('ship', this.fragments);
  }

  attack(x: number, y: number): AttackResult {
    const key = `${x}-${y}`;

    // if (this.previousAttacks.has(key)) {
    //   return 'retry';
    // }

    this.previousAttacks.add(key);

    const hasShot = this.fragments.has(key);
    if (!hasShot) {
      return 'miss';
    }

    this.fragments.set(key, true);

    const isKilled = Array.from(this.fragments.values()).every(
      (hasShot) => hasShot,
    );

    if (isKilled) {
      return 'killed';
    }

    return 'shot';
  }

  getBorders(): [x: number, y: number][] {
    return Array.from(this.fragments.keys()).reduce((acc, key) => {
      const [x, y] = key.split('-');
      const neighborCells = getNeighborCells([+x, +y]).filter(
        (cell) => !this.fragments.has(`${cell[0]}-${cell[1]}`),
      );

      return acc.concat(neighborCells);
    }, []);
  }
}
