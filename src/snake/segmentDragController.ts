import { PhysicsMotionType, PointerDragBehavior, Vector3 } from "@babylonjs/core";

import type { SnakeSegment } from "./types";

export class SegmentDragController {
  public attach(segment: SnakeSegment): void {
    const dragBehavior = new PointerDragBehavior({ dragPlaneNormal: Vector3.UpReadOnly });
    dragBehavior.dragDeltaRatio = 0.35;
    dragBehavior.detachCameraControls = true;

    dragBehavior.onDragStartObservable.add(() => {
      segment.aggregate.body.setLinearVelocity(Vector3.ZeroReadOnly);
      segment.aggregate.body.setAngularVelocity(Vector3.ZeroReadOnly);
      segment.aggregate.body.setMotionType(PhysicsMotionType.ANIMATED);
      segment.aggregate.body.disablePreStep = false;
    });

    dragBehavior.onDragEndObservable.add(() => {
      segment.aggregate.body.disablePreStep = true;
      segment.aggregate.body.setMotionType(PhysicsMotionType.DYNAMIC);
      segment.aggregate.body.setLinearVelocity(Vector3.ZeroReadOnly);
      segment.aggregate.body.setAngularVelocity(Vector3.ZeroReadOnly);
    });

    segment.mesh.addBehavior(dragBehavior);
  }
}
