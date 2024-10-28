import { Player } from './player';
import { Room } from './room';
import { getRandomId } from '../utils';
import { User } from './user';
import EventEmitter from 'node:events';

export class Game extends EventEmitter {
  private readonly gameId: string;
  private playerList: Player[];
  private readonly room: Room;
  private status: 'waiting' | 'started';
  private attackCounter: number;

  constructor(room: Room) {
    super();
    this.gameId = `game-${getRandomId()}`;
    this.playerList = [];
    this.room = room;
    this.attackCounter = 0;
    this.status = 'waiting';
  }

  getGameId(): string {
    return this.gameId;
  }

  addPlayer(newPlayer: Player) {
    if (
      this.playerList.some((player) => player.getId() === newPlayer.getId())
    ) {
      console.error(
        `[Game]: Cannot add a player with id: ${newPlayer.getId()} because it is already in the game`,
      );
      return;
    }

    this.playerList.push(newPlayer);
  }

  getAllPlayers() {
    return Array.from(this.playerList);
  }

  getPlayer(id: string) {
    console.log(this.playerList);
    return this.playerList.find((player) => player.getId() === id);
  }

  isStartable(): boolean {
    return (
      this.status === 'waiting' &&
      this.playerList.every((player) => player.isReady())
    );
  }

  start() {
    this.status = 'started';
  }

  getTurn() {
    return this.playerList[this.attackCounter % 2].getId();
  }

  getRoom() {
    return this.room;
  }

  attack(
    attackerId: string,
    position?: {
      x: number;
      y: number;
    },
  ) {
    const opponent = this._getOpponentByPlayerId(attackerId);
    console.log(`checking attack: x=${position.x} y=${position.y}`);
    const result = opponent.checkAttack(position.x, position.y);
    // if (result.status !== 'retry') {
    //   this._switchTurns();
    // }
    return result;
  }

  _getOpponentByPlayerId(playerId: string) {
    return this.playerList.find((player) => player.getId() !== playerId);
  }

  _switchTurns() {
    this.attackCounter++;
  }
}
