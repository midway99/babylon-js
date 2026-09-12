import { Color4, DynamicTexture, ParticleSystem, Scene, Texture, Vector3 } from "@babylonjs/core";

interface DustSystem {
  readonly emitter: Vector3;
  readonly particles: ParticleSystem;
}

export class DustParticlePool {
  private static readonly PoolSize = 18;
  private static readonly EmitOffset = new Vector3(0, 0.04, 0);

  private readonly systems: DustSystem[] = [];
  private readonly texture: DynamicTexture;
  private cursor = 0;

  public constructor(private readonly scene: Scene) {
    this.texture = this.createParticleTexture();

    for (let index = 0; index < DustParticlePool.PoolSize; index += 1) {
      this.systems.push(this.createDustSystem(index));
    }
  }

  public playAt(position: Vector3, intensity = 1): void {
    const system = this.nextSystem();
    system.particles.stop();
    system.emitter.copyFrom(position).addInPlace(DustParticlePool.EmitOffset);
    system.particles.emitRate = 120 + Math.min(intensity, 3) * 85;
    system.particles.minEmitPower = 0.45 + Math.min(intensity, 3) * 0.08;
    system.particles.maxEmitPower = 0.95 + Math.min(intensity, 3) * 0.18;
    system.particles.start();
  }

  private createParticleTexture(): DynamicTexture {
    const texture = new DynamicTexture("dust-particle-texture", { width: 64, height: 64 }, this.scene, false);
    const context = texture.getContext();
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 31);

    gradient.addColorStop(0, "rgba(230, 222, 197, 0.95)");
    gradient.addColorStop(0.45, "rgba(190, 181, 155, 0.45)");
    gradient.addColorStop(1, "rgba(140, 132, 112, 0)");
    context.clearRect(0, 0, 64, 64);
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    texture.update();
    texture.hasAlpha = true;
    texture.wrapU = Texture.CLAMP_ADDRESSMODE;
    texture.wrapV = Texture.CLAMP_ADDRESSMODE;

    return texture;
  }

  private createDustSystem(index: number): DustSystem {
    const emitter = Vector3.Zero();
    const particles = new ParticleSystem(`dust-particles-${index + 1}`, 90, this.scene);

    particles.particleTexture = this.texture;
    particles.emitter = emitter;
    particles.targetStopDuration = 0.16;
    particles.minLifeTime = 0.32;
    particles.maxLifeTime = 0.62;
    particles.minSize = 0.07;
    particles.maxSize = 0.18;
    particles.minAngularSpeed = -2.4;
    particles.maxAngularSpeed = 2.4;
    particles.gravity = new Vector3(0, -0.7, 0);
    particles.blendMode = ParticleSystem.BLENDMODE_STANDARD;
    particles.color1 = new Color4(0.68, 0.64, 0.55, 0.48);
    particles.color2 = new Color4(0.46, 0.44, 0.39, 0.32);
    particles.colorDead = new Color4(0.36, 0.34, 0.3, 0);
    particles.updateSpeed = 0.018;
    particles.createPointEmitter(new Vector3(-0.42, 0.35, -0.42), new Vector3(0.42, 1.2, 0.42));
    particles.stop();

    return { emitter, particles };
  }

  private nextSystem(): DustSystem {
    const system = this.systems[this.cursor];
    this.cursor = (this.cursor + 1) % this.systems.length;

    return system;
  }
}
