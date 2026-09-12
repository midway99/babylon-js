import {
  ArcRotateCamera,
  Color3,
  Engine,
  HavokPlugin,
  HemisphericLight,
  MeshBuilder,
  PhysicsAggregate,
  PhysicsShapeType,
  Scene,
  StandardMaterial,
  Vector3,
} from "@babylonjs/core";
import HavokPhysics from "@babylonjs/havok";
import havokWasmUrl from "@babylonjs/havok/lib/esm/HavokPhysics.wasm?url";

import { ArenaCourse } from "./arenaCourse";
import { DustParticlePool } from "./snake/dustParticlePool";
import { MaterialPalette } from "./snake/materialPalette";
import { SegmentDebrisPool } from "./snake/segmentDebrisPool";
import { SegmentDragController } from "./snake/segmentDragController";
import { SnakeFactory } from "./snake/snakeFactory";
import { CollisionMasks, type GroundMetadata } from "./snake/types";

export class PhysicsSnakeApp {
  private readonly engine: Engine;
  private scene: Scene | undefined;

  public constructor(private readonly canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true);
  }

  public async start(): Promise<void> {
    this.scene = await this.createScene();

    this.engine.runRenderLoop(() => {
      this.scene?.render();
    });

    window.addEventListener("resize", this.handleResize);
  }

  private async createScene(): Promise<Scene> {
    const scene = new Scene(this.engine);
    scene.clearColor.set(0.09, 0.1, 0.13, 1);

    const havok = await HavokPhysics({
      locateFile: () => havokWasmUrl,
    });
    scene.enablePhysics(new Vector3(0, -9.81, 0), new HavokPlugin(true, havok));

    this.createCamera(scene);
    this.createLight(scene);
    this.createGround(scene);
    const dustPool = new DustParticlePool(scene);
    const debrisPool = new SegmentDebrisPool(scene, dustPool);
    const segments = new SnakeFactory(scene, new MaterialPalette(scene), new SegmentDragController(), debrisPool).create();
    new ArenaCourse(scene, segments, debrisPool).create();

    return scene;
  }

  private createCamera(scene: Scene): void {
    const camera = new ArcRotateCamera("camera", -Math.PI * 0.38, Math.PI * 0.31, 14, new Vector3(0, 0.55, 0), scene);
    camera.attachControl(this.canvas, true);
    camera.lowerRadiusLimit = 8;
    camera.upperRadiusLimit = 19;
  }

  private createLight(scene: Scene): void {
    const light = new HemisphericLight("light", new Vector3(0.2, 1, 0.3), scene);
    light.intensity = 0.95;
  }

  private createGround(scene: Scene): void {
    const ground = MeshBuilder.CreateGround("ground", { width: 15, height: 10 }, scene);
    const material = new StandardMaterial("ground-material", scene);
    material.diffuseColor = new Color3(0.34, 0.36, 0.38);
    material.specularColor = Color3.Black();
    ground.material = material;
    ground.metadata = { kind: "ground" } satisfies GroundMetadata;

    const aggregate = new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0, friction: 0.85, restitution: 0.05 }, scene);
    aggregate.shape.filterMembershipMask = CollisionMasks.GroundMembership;
    aggregate.shape.filterCollideMask = CollisionMasks.GroundCollidesWith;
  }

  private readonly handleResize = (): void => {
    this.engine.resize();
  };
}
