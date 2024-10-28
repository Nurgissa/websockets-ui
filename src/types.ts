export type Command =
  | 'reg'
  | 'create_room'
  | 'add_user_to_room'
  | 'create_game'
  | 'add_ships'
  | 'start_game'
  | 'turn'
  | 'attack'
  | 'randomAttack'
  | 'finish'
  | 'update_room'
  | 'update_winners'
  | 'single_play';

export type AttackResult = 'miss' | 'killed' | 'shot' | 'retry';
