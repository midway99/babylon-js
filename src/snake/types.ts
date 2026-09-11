import type { BallAndSocketConstraint, Mesh, PhysicsAggregate } from "@babylonjs/core";
import { Vector3 } from "@babylonjs/core";

export interface SegmentMetadata {
  id: string;
  kind: "snake-segment";
}

export interface GroundMetadata {
  kind: "ground";
}

export interface SnakeSegment {
  readonly mesh: Mesh;
  readonly aggregate: PhysicsAggregate;
  readonly index: number;
  readonly constraints: BallAndSocketConstraint[];
}

export const enum CollisionLayer {
  Snake = 1 << 0,
  Ground = 1 << 1,
}

export class SnakeDimensions {
  public static readonly Size = new Vector3(1.2, 0.42, 0.42);
  public static readonly StartHeight = 2.4;
}
