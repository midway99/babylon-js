import type { BallAndSocketConstraint, Mesh, PhysicsAggregate } from "@babylonjs/core";
import { Vector3 } from "@babylonjs/core";

export interface SegmentMetadata {
  id: string;
  kind: "snake-segment";
}

export interface GroundMetadata {
  kind: "ground";
}

export interface FinishMetadata {
  kind: "finish";
}

export interface MazeWallMetadata {
  kind: "maze-wall";
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

export class CollisionMasks {
  public static readonly Disabled = 0;
  public static readonly SnakeMembership = CollisionLayer.Snake;
  public static readonly SnakeCollidesWith = CollisionLayer.Ground;
  public static readonly GroundMembership = CollisionLayer.Ground;
  public static readonly GroundCollidesWith = CollisionLayer.Snake;
}

export class SnakeDimensions {
  public static readonly Size = new Vector3(0.78, 0.28, 0.28);
  public static readonly StartPosition = new Vector3(-2.3, 2.4, -4.03);
}
