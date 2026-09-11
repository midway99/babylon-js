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

import { MaterialPalette } from "./snake/materialPalette";
import { SegmentDebrisPool } from "./snake/segmentDebrisPool";
import { SegmentDragController } from "./snake/segmentDragController";
import { SnakeFactory } from "./snake/snakeFactory";
import { CollisionLayer, type GroundMetadata } from "./snake/types";

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
    new SnakeFactory(scene, new MaterialPalette(scene), new SegmentDragController(), new SegmentDebrisPool(scene)).create();

    return scene;
  }

  private createCamera(scene: Scene): void {
    const camera = new ArcRotateCamera("camera", -Math.PI * 0.42, Math.PI * 0.32, 7.5, new Vector3(-1.8, 0.8, 0), scene);
    camera.attachControl(this.canvas, true);
    camera.lowerRadiusLimit = 4;
    camera.upperRadiusLimit = 12;
  }

  private createLight(scene: Scene): void {
    const light = new HemisphericLight("light", new Vector3(0.2, 1, 0.3), scene);
    light.intensity = 0.95;
  }

  private createGround(scene: Scene): void {
    const ground = MeshBuilder.CreateGround("ground", { width: 8, height: 5 }, scene);
    const material = new StandardMaterial("ground-material", scene);
    material.diffuseColor = new Color3(0.34, 0.36, 0.38);
    material.specularColor = Color3.Black();
    ground.material = material;
    ground.metadata = { kind: "ground" } satisfies GroundMetadata;

    const aggregate = new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0, friction: 0.85, restitution: 0.05 }, scene);
    aggregate.shape.filterMembershipMask = CollisionLayer.Ground;
    aggregate.shape.filterCollideMask = CollisionLayer.Snake;
  }

  private readonly handleResize = (): void => {
    this.engine.resize();
  };
}
