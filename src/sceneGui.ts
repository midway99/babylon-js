import {
  Color3,
  Mesh,
  PointerEventTypes,
  Scene,
  StandardMaterial,
} from "@babylonjs/core";
import {
  AdvancedDynamicTexture,
  Button,
  Control,
  InputText,
  Rectangle,
  StackPanel,
  TextBlock,
} from "@babylonjs/gui";

interface MeshMetadataWithId {
  readonly id?: string;
}

export class SceneGui {
  private readonly selectedIdInput: InputText;
  private readonly finishPanel: Rectangle;

  public constructor(private readonly scene: Scene) {
    const texture = AdvancedDynamicTexture.CreateFullscreenUI("scene-gui", true, scene);
    const panel = this.createToolsPanel();

    this.selectedIdInput = this.createSelectedIdInput();
    panel.addControl(this.selectedIdInput);
    panel.addControl(this.createColorButton("Коралл", "#f06449", new Color3(0.94, 0.22, 0.16)));
    panel.addControl(this.createColorButton("Лазурь", "#34a0e8", new Color3(0.08, 0.45, 0.95)));

    this.finishPanel = this.createFinishPanel();
    texture.addControl(panel);
    texture.addControl(this.finishPanel);

    this.scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.type !== PointerEventTypes.POINTERPICK) {
        return;
      }

      const mesh = pointerInfo.pickInfo?.pickedMesh;
      const id = (mesh?.metadata as MeshMetadataWithId | undefined)?.id;

      if (id) {
        this.selectedIdInput.text = id;
      }
    });
  }

  public showFinishMessage(): void {
    this.finishPanel.isVisible = true;
  }

  private createToolsPanel(): StackPanel {
    const panel = new StackPanel("mesh-tools-panel");
    panel.width = "260px";
    panel.height = "156px";
    panel.paddingTop = "16px";
    panel.paddingLeft = "16px";
    panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    panel.isVertical = true;

    return panel;
  }

  private createSelectedIdInput(): InputText {
    const input = new InputText("selected-mesh-id", "");
    input.height = "38px";
    input.width = "244px";
    input.color = "#f7f4ea";
    input.background = "#1f2528";
    input.focusedBackground = "#1f2528";
    input.placeholderText = "Выберите mesh";
    input.placeholderColor = "#9aa4a8";
    input.thickness = 1;
    input.isReadOnly = true;
    input.paddingBottom = "8px";

    return input;
  }

  private createColorButton(label: string, background: string, color: Color3): Button {
    const button = Button.CreateSimpleButton(`${label}-material-button`, label);
    button.width = "244px";
    button.height = "38px";
    button.color = "#ffffff";
    button.background = background;
    button.thickness = 0;
    button.cornerRadius = 6;
    button.paddingBottom = "8px";
    button.onPointerClickObservable.add(() => {
      this.applyColorToSelectedMesh(color);
    });

    return button;
  }

  private createFinishPanel(): Rectangle {
    const panel = new Rectangle("finish-message-panel");
    panel.width = "420px";
    panel.height = "86px";
    panel.cornerRadius = 8;
    panel.thickness = 1;
    panel.color = "#dff8dc";
    panel.background = "#17351f";
    panel.alpha = 0.94;
    panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    panel.top = "22px";
    panel.isVisible = false;

    const text = new TextBlock("finish-message-text", "Поздравляем! Змейка добралась до финиша!");
    text.color = "#f2ffe9";
    text.fontSize = 20;
    text.textWrapping = true;
    text.paddingLeft = "18px";
    text.paddingRight = "18px";
    panel.addControl(text);

    return panel;
  }

  private applyColorToSelectedMesh(color: Color3): void {
    const mesh = this.findMeshByMetadataId(this.selectedIdInput.text);

    if (!mesh) {
      return;
    }

    const material = new StandardMaterial(`${mesh.name}-gui-material`, this.scene);
    material.diffuseColor = color;
    material.specularColor = new Color3(0.04, 0.04, 0.04);
    mesh.material = material;
  }

  private findMeshByMetadataId(id: string): Mesh | undefined {
    return this.scene.meshes.find((mesh): mesh is Mesh => {
      return mesh instanceof Mesh && (mesh.metadata as MeshMetadataWithId | undefined)?.id === id;
    });
  }
}
