import { User } from './user';
import { getRandomId } from '../utils';

export class Room {
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
    if (this._hasUser(user.getIndex())) {
      console.error(`User ${user.getIndex()} already exists`);
      return;
    }
    this.roomUsers.push(user);
  }

  _hasUser(userId: string): boolean {
    return this.roomUsers.some((roomUser) => roomUser.getIndex() === userId);
  }

  isFull(): boolean {
    return this.roomUsers.length >= 2;
  }

  getUsers(): User[] {
    return this.roomUsers;
  }
}
