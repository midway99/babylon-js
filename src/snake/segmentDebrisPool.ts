import {
  BallAndSocketConstraint,
  Color3,
  Mesh,
  MeshBuilder,
  PhysicsAggregate,
  PhysicsEventType,
  PhysicsMotionType,
  PhysicsShapeType,
  Quaternion,
  Scene,
  StandardMaterial,
  Vector3,
} from "@babylonjs/core";
import type { IPhysicsCollisionEvent } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";

import type { DustParticlePool } from "./dustParticlePool";
import { CollisionMasks, SnakeDimensions, type SnakeSegment } from "./types";

interface DebrisPiece {
  readonly mesh: Mesh;
  readonly aggregate: PhysicsAggregate;
  readonly localOffset: Vector3;
}

export class SegmentDebrisPool {
  private static readonly ImpactThreshold = 4.8;
  private static readonly PieceColumns = 3;
  private static readonly PieceRows = 2;
  private static readonly PieceDepths = 2;

  private readonly piecesBySegment = new Map<string, DebrisPiece[]>();
  private readonly brokenSegmentIds = new Set<string>();
  private readonly lastDustTimeBySegment = new Map<string, number>();
  private readonly disposedConstraints = new WeakSet<BallAndSocketConstraint>();
  private readonly tmpVelocity = Vector3.Zero();

  public constructor(
    private readonly scene: Scene,
    private readonly dustPool: DustParticlePool,
  ) {}

  public prepare(segment: SnakeSegment): void {
    const pieces = this.createPieces(segment);
    this.piecesBySegment.set(segment.mesh.metadata.id, pieces);

    segment.aggregate.body.setCollisionCallbackEnabled(true);
    segment.aggregate.body.getCollisionObservable().add((event) => {
      this.handleCollision(segment, event);
    });
  }

  public breakByObstacle(segment: SnakeSegment, impactPoint = segment.mesh.getAbsolutePosition()): void {
    if (this.brokenSegmentIds.has(segment.mesh.metadata.id)) {
      return;
    }

    segment.aggregate.body.getLinearVelocityToRef(this.tmpVelocity);
    this.breakSegment(segment, impactPoint, Math.max(SegmentDebrisPool.ImpactThreshold, 7.5));
  }

  private createPieces(segment: SnakeSegment): DebrisPiece[] {
    const pieces: DebrisPiece[] = [];
    const size = SnakeDimensions.Size;
    const pieceWidth = size.x / SegmentDebrisPool.PieceColumns;
    const pieceHeight = size.y / SegmentDebrisPool.PieceRows;
    const pieceDepth = size.z / SegmentDebrisPool.PieceDepths;
    const baseColor = segment.mesh.material instanceof StandardMaterial ? segment.mesh.material.diffuseColor : new Color3(0.7, 0.7, 0.7);

    for (let x = 0; x < SegmentDebrisPool.PieceColumns; x += 1) {
      for (let y = 0; y < SegmentDebrisPool.PieceRows; y += 1) {
        for (let z = 0; z < SegmentDebrisPool.PieceDepths; z += 1) {
          pieces.push(this.createPiece(segment, pieces.length, pieceWidth, pieceHeight, pieceDepth, baseColor, x, y, z));
        }
      }
    }

    return pieces;
  }

  private createPiece(
    segment: SnakeSegment,
    pieceIndex: number,
    pieceWidth: number,
    pieceHeight: number,
    pieceDepth: number,
    baseColor: Color3,
    x: number,
    y: number,
    z: number,
  ): DebrisPiece {
    const localOffset = new Vector3(
      (x - (SegmentDebrisPool.PieceColumns - 1) * 0.5) * pieceWidth,
      (y - (SegmentDebrisPool.PieceRows - 1) * 0.5) * pieceHeight,
      (z - (SegmentDebrisPool.PieceDepths - 1) * 0.5) * pieceDepth,
    );
    const mesh = MeshBuilder.CreateBox(
      `${segment.mesh.metadata.id}-debris-${pieceIndex + 1}`,
      {
        width: pieceWidth * 0.92,
        height: pieceHeight * 0.9,
        depth: pieceDepth * 0.9,
      },
      this.scene,
    );
    const material = new StandardMaterial(`${mesh.name}-material`, this.scene);
    material.diffuseColor = baseColor.scale(0.84 + pieceIndex * 0.018);
    material.specularColor = new Color3(0.04, 0.04, 0.04);
    mesh.material = material;
    mesh.position.set(0, -30, 0);
    mesh.isVisible = false;

    const aggregate = new PhysicsAggregate(
      mesh,
      PhysicsShapeType.BOX,
      {
        mass: 0.12,
        friction: 0.72,
        restitution: 0.18,
      },
      this.scene,
    );
    aggregate.body.setGravityFactor(0);
    aggregate.body.setLinearDamping(0.08);
    aggregate.body.setAngularDamping(0.12);
    aggregate.shape.filterMembershipMask = CollisionMasks.Disabled;
    aggregate.shape.filterCollideMask = CollisionMasks.Disabled;

    return { mesh, aggregate, localOffset };
  }

  private handleCollision(segment: SnakeSegment, event: IPhysicsCollisionEvent): void {
    const isGroundCollision = this.isGroundCollision(event);
    const isWallCollision = this.isWallCollision(event);

    if (isGroundCollision) {
      this.emitMovementDust(segment, event);
    }

    if (
      event.type !== PhysicsEventType.COLLISION_STARTED ||
      this.brokenSegmentIds.has(segment.mesh.metadata.id) ||
      (!isGroundCollision && !isWallCollision) ||
      event.impulse < SegmentDebrisPool.ImpactThreshold
    ) {
      return;
    }

    segment.aggregate.body.getLinearVelocityToRef(this.tmpVelocity);
    this.breakSegment(segment, event.point ?? segment.mesh.getAbsolutePosition(), event.impulse);
  }

  private isGroundCollision(event: IPhysicsCollisionEvent): boolean {
    return this.hasCollisionKind(event, "ground");
  }

  private isWallCollision(event: IPhysicsCollisionEvent): boolean {
    return this.hasCollisionKind(event, "maze-wall");
  }

  private hasCollisionKind(event: IPhysicsCollisionEvent, kind: string): boolean {
    return event.collider.transformNode.metadata?.kind === kind || event.collidedAgainst.transformNode.metadata?.kind === kind;
  }

  private emitMovementDust(segment: SnakeSegment, event: IPhysicsCollisionEvent): void {
    if (
      this.brokenSegmentIds.has(segment.mesh.metadata.id) ||
      (event.type !== PhysicsEventType.COLLISION_STARTED && event.type !== PhysicsEventType.COLLISION_CONTINUED)
    ) {
      return;
    }

    const now = performance.now();
    const lastDustTime = this.lastDustTimeBySegment.get(segment.mesh.metadata.id) ?? 0;

    if (now - lastDustTime < 130) {
      return;
    }

    this.lastDustTimeBySegment.set(segment.mesh.metadata.id, now);
    this.dustPool.playAt(event.point ?? segment.mesh.getAbsolutePosition(), Math.max(0.7, event.impulse * 0.16));
  }

  private breakSegment(segment: SnakeSegment, impactPoint: Vector3, impactImpulse: number): void {
    const pieces = this.piecesBySegment.get(segment.mesh.metadata.id);

    if (!pieces) {
      return;
    }

    this.brokenSegmentIds.add(segment.mesh.metadata.id);
    this.dustPool.playAt(impactPoint, Math.max(2.2, impactImpulse * 0.18));
    this.detachSegment(segment);
    segment.aggregate.body.setLinearVelocity(Vector3.ZeroReadOnly);
    segment.aggregate.body.setAngularVelocity(Vector3.ZeroReadOnly);
    segment.aggregate.body.setCollisionCallbackEnabled(false);
    segment.aggregate.body.setGravityFactor(0);
    segment.aggregate.body.setMotionType(PhysicsMotionType.ANIMATED);
    segment.aggregate.shape.filterMembershipMask = CollisionMasks.Disabled;
    segment.aggregate.shape.filterCollideMask = CollisionMasks.Disabled;
    segment.mesh.isVisible = false;

    const segmentRotation = segment.mesh.absoluteRotationQuaternion.clone();

    for (const piece of pieces) {
      this.activatePiece(piece, segment, segmentRotation, impactPoint, impactImpulse);
    }
  }

  private activatePiece(piece: DebrisPiece, segment: SnakeSegment, segmentRotation: Quaternion, impactPoint: Vector3, impactImpulse: number): void {
    const worldOffset = Vector3.TransformCoordinates(piece.localOffset, segment.mesh.getWorldMatrix()).subtract(segment.mesh.getAbsolutePosition());
    const position = segment.mesh.getAbsolutePosition().add(worldOffset);
    const scatterDirection = position.subtract(impactPoint);

    if (scatterDirection.lengthSquared() === 0) {
      scatterDirection.copyFromFloats(Math.random() - 0.5, 0.75, Math.random() - 0.5);
    }

    scatterDirection.normalize();
    piece.aggregate.body.disablePreStep = false;
    piece.mesh.position.copyFrom(position);
    piece.mesh.rotationQuaternion = segmentRotation.clone();
    piece.mesh.isVisible = true;
    piece.aggregate.body.setGravityFactor(1);
    piece.aggregate.body.setMotionType(PhysicsMotionType.DYNAMIC);
    piece.aggregate.body.setLinearVelocity(this.tmpVelocity.scale(0.35));
    piece.aggregate.body.setAngularVelocity(Vector3.ZeroReadOnly);
    piece.aggregate.shape.filterMembershipMask = CollisionMasks.SnakeMembership;
    piece.aggregate.shape.filterCollideMask = CollisionMasks.SnakeCollidesWith;

    const impulseScale = Math.min(impactImpulse, 12);
    const impulse = scatterDirection.scale(impulseScale * 0.18).add(new Vector3(0, impulseScale * 0.07, 0));
    piece.aggregate.body.applyImpulse(impulse, piece.mesh.getAbsolutePosition());
    piece.aggregate.body.applyAngularImpulse(
      new Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).scale(0.65),
    );
    this.scene.onAfterPhysicsObservable.addOnce(() => {
      piece.aggregate.body.disablePreStep = true;
    });
  }

  private detachSegment(segment: SnakeSegment): void {
    for (const constraint of segment.constraints) {
      if (!this.disposedConstraints.has(constraint)) {
        constraint.dispose();
        this.disposedConstraints.add(constraint);
      }
    }

    segment.constraints.length = 0;
  }
}
