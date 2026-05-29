declare module 'pathfinding' {
  export class AStarFinder {
    constructor(options?: {
      allowDiagonal?: boolean;
      dontCrossCorners?: boolean;
      heuristic?: (dx: number, dy: number) => number;
      weight?: number;
    });
    findPath(
      startX: number,
      startY: number,
      endX: number,
      endY: number,
      grid: Grid
    ): number[][];
  }

  export class Grid {
    width: number;
    height: number;
    constructor(width: number, height: number, matrix?: number[][]);
    constructor(matrix: number[][]);
    setWalkableAt(x: number, y: number, walkable: boolean): void;
    isWalkableAt(x: number, y: number): boolean;
    clone(): Grid;
  }
}
