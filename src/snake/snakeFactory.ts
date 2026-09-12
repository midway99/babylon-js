import { BallAndSocketConstraint, MeshBuilder, PhysicsAggregate, PhysicsShapeType, Scene, Vector3 } from "@babylonjs/core";

import type { MaterialPalette } from "./materialPalette";
import type { SegmentDebrisPool } from "./segmentDebrisPool";
import type { SegmentDragController } from "./segmentDragController";
import { CollisionMasks, SnakeDimensions, type SegmentMetadata, type SnakeSegment } from "./types";

export class SnakeFactory {
  private static readonly SegmentCount = 4;
  private static readonly JointAxis = Vector3.RightReadOnly;

  private readonly jointPivotA = new Vector3(-SnakeDimensions.Size.x * 0.5, 0, 0);
  private readonly jointPivotB = new Vector3(SnakeDimensions.Size.x * 0.5, 0, 0);
  private readonly segments: SnakeSegment[] = [];

  public constructor(
    private readonly scene: Scene,
    private readonly palette: MaterialPalette,
    private readonly dragController: SegmentDragController,
    private readonly debrisPool: SegmentDebrisPool,
  ) {}

  public create(): readonly SnakeSegment[] {
    for (let index = 0; index < SnakeFactory.SegmentCount; index += 1) {
      this.segments.push(this.createSegment(index));
    }

    for (let index = 1; index < this.segments.length; index += 1) {
      this.connect(this.segments[index - 1], this.segments[index]);
    }

    return this.segments;
  }

  private createSegment(index: number): SnakeSegment {
    const id = `snake-segment-${index + 1}`;
    const mesh = MeshBuilder.CreateBox(
      id,
      {
        width: SnakeDimensions.Size.x,
        height: SnakeDimensions.Size.y,
        depth: SnakeDimensions.Size.z,
      },
      this.scene,
    );
    mesh.position.set(SnakeDimensions.StartPosition.x - index * SnakeDimensions.Size.x, SnakeDimensions.StartPosition.y, SnakeDimensions.StartPosition.z);
    mesh.material = this.palette.get(index);
    mesh.metadata = { id, kind: "snake-segment" } satisfies SegmentMetadata;

    const aggregate = new PhysicsAggregate(
      mesh,
      PhysicsShapeType.BOX,
      {
        mass: 1,
        friction: 0.6,
        restitution: 0.08,
      },
      this.scene,
    );

    aggregate.body.setLinearDamping(0.35);
    aggregate.body.setAngularDamping(0.55);
    aggregate.shape.filterMembershipMask = CollisionMasks.SnakeMembership;
    aggregate.shape.filterCollideMask = CollisionMasks.SnakeCollidesWith;

    const segment = { mesh, aggregate, index, constraints: [] };
    this.dragController.attach(segment);
    this.debrisPool.prepare(segment);

    return segment;
  }

  private connect(parent: SnakeSegment, child: SnakeSegment): void {
    const constraint = new BallAndSocketConstraint(
      this.jointPivotA,
      this.jointPivotB,
      SnakeFactory.JointAxis,
      SnakeFactory.JointAxis,
      this.scene,
    );

    parent.aggregate.body.addConstraint(child.aggregate.body, constraint);
    parent.constraints.push(constraint);
    child.constraints.push(constraint);
  }
}
