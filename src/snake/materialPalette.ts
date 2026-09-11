import { Color3, Scene, StandardMaterial } from "@babylonjs/core";

export class MaterialPalette {
  private readonly materials: readonly StandardMaterial[];

  public constructor(scene: Scene) {
    const colors = [
      new Color3(0.22, 0.7, 0.46),
      new Color3(0.18, 0.56, 0.78),
      new Color3(0.86, 0.63, 0.24),
      new Color3(0.76, 0.32, 0.42),
    ];

    this.materials = colors.map((color, index) => {
      const material = new StandardMaterial(`snake-material-${index}`, scene);
      material.diffuseColor = color;
      material.specularColor = new Color3(0.08, 0.08, 0.08);
      return material;
    });
  }

  public get(index: number): StandardMaterial {
    return this.materials[index % this.materials.length];
  }
}
