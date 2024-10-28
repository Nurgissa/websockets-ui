import { getRandomId } from '../utils';

export class User {
  private readonly name: string;
  private readonly index: string;

  constructor(name: string) {
    this.name = name;
    this.index = `user-${name}-${getRandomId()}`;
  }

  getIndex() {
    return this.index;
  }

  getName() {
    return this.name;
  }
}
