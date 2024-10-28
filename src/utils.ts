import { Command } from './types';

export const toSerializedMessage = (type: Command, payload: object) => {
  return JSON.stringify({
    type,
    data: JSON.stringify(payload),
    id: 0,
  });
};

export const getRandomId = () =>
  `${Date.now()}-${Math.floor(Math.random() * 0x1000)}`;

export const getRandomRow = () => Math.floor(Math.random() * 11);

export const getRandomPosition = () => {
  return {
    x: getRandomRow(),
    y: getRandomRow(),
  };
};

export const getNeighborCells = (
  cell: [x: number, y: number],
): [x: number, y: number][] => {
  const [x, y] = cell;
  const neighbors = [];

  const directions = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ];

  directions.forEach(([dr, dc]) => {
    const newRow = x + dr;
    const newCol = y + dc;

    if (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 10) {
      neighbors.push([newRow, newCol]);
    }
  });
  return neighbors;
};
