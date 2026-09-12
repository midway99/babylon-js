import {
  Color3,
  Mesh,
  MeshBuilder,
  PhysicsAggregate,
  PhysicsEventType,
  PhysicsShapeType,
  Ray,
  RayHelper,
  Scene,
  StandardMaterial,
  Vector3,
} from "@babylonjs/core";
import type { IBasePhysicsCollisionEvent, IPhysicsEnginePluginV2 } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";

import type { SegmentDebrisPool } from "./snake/segmentDebrisPool";
import { CollisionMasks, type FinishMetadata, type MazeWallMetadata, type SnakeSegment } from "./snake/types";

interface MazeWallSpec {
  readonly name: string;
  readonly position: Vector3;
  readonly size: {
    readonly width: number;
    readonly height: number;
    readonly depth: number;
  };
}

interface ObstacleRay {
  readonly ray: Ray;
  readonly helper: RayHelper;
  readonly hitSegmentIds: Set<string>;
}

export class ArenaCourse {
  private readonly obstacleRays: ObstacleRay[] = [];
  private finishReached = false;

  public constructor(
    private readonly scene: Scene,
    private readonly segments: readonly SnakeSegment[],
    private readonly debrisPool: SegmentDebrisPool,
  ) {}

  public create(): void {
    this.createMazeWalls();
    this.createObstacleRays();
    this.createFinishZone();

    this.scene.onBeforeRenderObservable.add(() => {
      this.updateObstacleRays();
    });
  }

  private createMazeWalls(): void {
    const material = new StandardMaterial("maze-wall-material", this.scene);
    material.diffuseColor = new Color3(0.16, 0.56, 0.36);
    material.specularColor = new Color3(0.02, 0.04, 0.03);

    const wallHeight = 0.62;
    const wallThickness = 0.28;
    const specs: MazeWallSpec[] = [
      { name: "maze-wall-top", position: new Vector3(0, wallHeight * 0.5, 4.35), size: { width: 13.6, height: wallHeight, depth: wallThickness } },
      { name: "maze-wall-bottom", position: new Vector3(0, wallHeight * 0.5, -4.35), size: { width: 13.6, height: wallHeight, depth: wallThickness } },
      { name: "maze-wall-left", position: new Vector3(-6.8, wallHeight * 0.5, 0.8), size: { width: wallThickness, height: wallHeight, depth: 6.75 } },
      { name: "maze-wall-right", position: new Vector3(6.8, wallHeight * 0.5, -0.35), size: { width: wallThickness, height: wallHeight, depth: 7.85 } },
      { name: "maze-gate-1", position: new Vector3(-4.45, wallHeight * 0.5, -0.9), size: { width: wallThickness, height: wallHeight, depth: 5.0 } },
      { name: "maze-gate-2", position: new Vector3(-2.35, wallHeight * 0.5, 1.45), size: { width: wallThickness, height: wallHeight, depth: 4.85 } },
      { name: "maze-gate-3", position: new Vector3(-0.15, wallHeight * 0.5, -1.35), size: { width: wallThickness, height: wallHeight, depth: 4.95 } },
      { name: "maze-gate-4", position: new Vector3(2.05, wallHeight * 0.5, 1.35), size: { width: wallThickness, height: wallHeight, depth: 4.85 } },
      { name: "maze-gate-5", position: new Vector3(4.25, wallHeight * 0.5, -1.2), size: { width: wallThickness, height: wallHeight, depth: 5.0 } },
      { name: "maze-cross-1", position: new Vector3(-3.45, wallHeight * 0.5, -2.45), size: { width: 1.7, height: wallHeight, depth: wallThickness } },
      { name: "maze-cross-2", position: new Vector3(-1.25, wallHeight * 0.5, 2.75), size: { width: 1.75, height: wallHeight, depth: wallThickness } },
      { name: "maze-cross-3", position: new Vector3(0.85, wallHeight * 0.5, -2.75), size: { width: 1.75, height: wallHeight, depth: wallThickness } },
      { name: "maze-cross-4", position: new Vector3(3.15, wallHeight * 0.5, 2.55), size: { width: 1.65, height: wallHeight, depth: wallThickness } },
      { name: "maze-finish-guide", position: new Vector3(5.7, wallHeight * 0.5, 1.75), size: { width: 2.0, height: wallHeight, depth: wallThickness } },
    ];

    for (const spec of specs) {
      this.createMazeWall(spec, material);
    }
  }

  private createMazeWall(spec: MazeWallSpec, material: StandardMaterial): void {
    const wall = MeshBuilder.CreateBox(spec.name, spec.size, this.scene);
    wall.position.copyFrom(spec.position);
    wall.material = material;
    wall.metadata = { kind: "maze-wall" } satisfies MazeWallMetadata;

    const aggregate = new PhysicsAggregate(
      wall,
      PhysicsShapeType.BOX,
      {
        mass: 0,
        friction: 0.9,
        restitution: 0.03,
      },
      this.scene,
    );
    aggregate.shape.filterMembershipMask = CollisionMasks.GroundMembership;
    aggregate.shape.filterCollideMask = CollisionMasks.GroundCollidesWith;
  }

  private createObstacleRays(): void {
    const specs = [
      { from: new Vector3(-6.0, 0.42, -1.55), to: new Vector3(-4.9, 0.42, -0.4) },
      { from: new Vector3(-3.45, 0.74, -3.85), to: new Vector3(-2.7, 0.74, -0.35) },
      { from: new Vector3(-1.95, 0.48, 3.85), to: new Vector3(-0.45, 0.48, 0.45) },
      { from: new Vector3(0.35, 0.82, -3.8), to: new Vector3(1.45, 0.82, -0.45) },
      { from: new Vector3(2.35, 0.5, 3.8), to: new Vector3(3.45, 0.5, 0.05) },
      { from: new Vector3(4.85, 0.68, -3.65), to: new Vector3(6.1, 0.68, -0.45) },
    ];

    for (const spec of specs) {
      const ray = Ray.CreateNewFromTo(spec.from, spec.to);
      const helper = RayHelper.CreateAndShow(ray, this.scene, new Color3(1, 0.18, 0.08));
      this.obstacleRays.push({ ray, helper, hitSegmentIds: new Set<string>() });
    }
  }

  private updateObstacleRays(): void {
    const liveMeshes = this.segments.filter((segment) => segment.mesh.isVisible).map((segment) => segment.mesh);

    for (const obstacle of this.obstacleRays) {
      const hit = this.scene.pickWithRay(
        obstacle.ray,
        (mesh) => liveMeshes.includes(mesh as Mesh),
        false,
      );

      if (!hit?.hit || !hit.pickedMesh) {
        continue;
      }

      const segment = this.findSegmentByMesh(hit.pickedMesh as Mesh);

      if (!segment || obstacle.hitSegmentIds.has(segment.mesh.metadata.id)) {
        continue;
      }

      obstacle.hitSegmentIds.add(segment.mesh.metadata.id);
      this.debrisPool.breakByObstacle(segment, hit.pickedPoint ?? segment.mesh.getAbsolutePosition());
    }
  }

  private createFinishZone(): void {
    const finish = MeshBuilder.CreateBox("finish-zone", { width: 1.4, height: 0.8, depth: 1.45 }, this.scene);
    finish.position.set(6.05, 0.4, 3.25);
    finish.metadata = { kind: "finish" } satisfies FinishMetadata;

    const material = new StandardMaterial("finish-zone-material", this.scene);
    material.diffuseColor = new Color3(0.1, 0.95, 0.25);
    material.alpha = 0.5;
    finish.material = material;

    const aggregate = new PhysicsAggregate(
      finish,
      PhysicsShapeType.BOX,
      {
        mass: 0,
        isTriggerShape: true,
      },
      this.scene,
    );
    aggregate.shape.filterMembershipMask = CollisionMasks.GroundMembership;
    aggregate.shape.filterCollideMask = CollisionMasks.GroundCollidesWith;

    const plugin = this.scene.getPhysicsEngine()?.getPhysicsPlugin() as IPhysicsEnginePluginV2 | undefined;
    plugin?.onTriggerCollisionObservable.add((event) => {
      this.handleFinishTrigger(event, aggregate);
    });
  }

  private handleFinishTrigger(event: IBasePhysicsCollisionEvent, finishAggregate: PhysicsAggregate): void {
    if (this.finishReached || event.type !== PhysicsEventType.TRIGGER_ENTERED || !this.isFinishEvent(event, finishAggregate)) {
      return;
    }

    this.finishReached = true;
    window.alert("Поздравляем! Змейка добралась до финиша!");
  }

  private isFinishEvent(event: IBasePhysicsCollisionEvent, finishAggregate: PhysicsAggregate): boolean {
    const touchedFinish = event.collider === finishAggregate.body || event.collidedAgainst === finishAggregate.body;
    const touchedSnake = this.segments.some((segment) => event.collider === segment.aggregate.body || event.collidedAgainst === segment.aggregate.body);

    return touchedFinish && touchedSnake;
  }

  private findSegmentByMesh(mesh: Mesh): SnakeSegment | undefined {
    return this.segments.find((segment) => segment.mesh === mesh);
  }
}
