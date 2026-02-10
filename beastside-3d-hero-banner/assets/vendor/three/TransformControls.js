(function () {
  "use strict";

  if (typeof window === "undefined" || !window.THREE) {
    return;
  }

  var THREE = window.THREE;
  if (THREE.TransformControls) {
    return;
  }

  function buildAxisLine(axis, color) {
    var points = [new THREE.Vector3(0, 0, 0), axis.clone().multiplyScalar(0.72)];
    var geometry = new THREE.BufferGeometry().setFromPoints(points);
    var material = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
    });
    return new THREE.Line(geometry, material);
  }

  function buildAxisHandle(axis, color, axisName) {
    var material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
    });
    var handle = new THREE.Mesh(new THREE.SphereGeometry(0.08, 18, 18), material);
    handle.position.copy(axis.clone().multiplyScalar(0.72));
    handle.userData.axis = axisName;
    return handle;
  }

  function buildAxisLabel(text, color, axis) {
    if (typeof document === "undefined" || !document.createElement) {
      var fallback = new THREE.Object3D();
      fallback.visible = false;
      return fallback;
    }

    var canvas = document.createElement("canvas");
    canvas.width = 96;
    canvas.height = 96;
    var context = canvas.getContext("2d");
    if (!context) {
      var fallbackNoContext = new THREE.Object3D();
      fallbackNoContext.visible = false;
      return fallbackNoContext;
    }

    context.clearRect(0, 0, 96, 96);
    context.font = "700 52px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#ffffff";
    context.strokeStyle = "#" + color.toString(16).padStart(6, "0");
    context.lineWidth = 8;
    context.strokeText(text, 48, 48);
    context.fillText(text, 48, 48);

    var texture = new THREE.CanvasTexture(canvas);
    var material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      sizeAttenuation: false,
    });
    var sprite = new THREE.Sprite(material);
    sprite.scale.set(0.16, 0.16, 0.16);
    sprite.position.copy(axis.clone().multiplyScalar(0.98));
    return sprite;
  }

  class TransformControls extends THREE.Object3D {
    constructor(camera, domElement) {
      super();

      this.camera = camera || null;
      this.domElement = domElement || null;
      this.object = null;
      this.enabled = true;
      this.visible = false;
      this.dragging = false;
      this.axis = null;
      this.mode = "translate";
      this.showX = true;
      this.showY = true;
      this.showZ = true;
      this.dragPlaneName = "xy";

      this._raycaster = new THREE.Raycaster();
      this._pointer = new THREE.Vector2();
      this._dragPlane = new THREE.Plane();
      this._dragOffset = new THREE.Vector3();
      this._dragIntersection = new THREE.Vector3();
      this._startIntersection = new THREE.Vector3();
      this._startPosition = new THREE.Vector3();
      this._axisVector = new THREE.Vector3();

      this._gizmoRoot = new THREE.Group();
      this._axisLines = {
        x: buildAxisLine(new THREE.Vector3(1, 0, 0), 0xff4b4b),
        y: buildAxisLine(new THREE.Vector3(0, 1, 0), 0x45d16f),
        z: buildAxisLine(new THREE.Vector3(0, 0, 1), 0x4f8cff),
      };

      this._handles = {
        x: buildAxisHandle(new THREE.Vector3(1, 0, 0), 0xff5f5f, "x"),
        y: buildAxisHandle(new THREE.Vector3(0, 1, 0), 0x52dd7a, "y"),
        z: buildAxisHandle(new THREE.Vector3(0, 0, 1), 0x5e99ff, "z"),
      };
      this._axisLabels = {
        x: buildAxisLabel("X", 0xff4b4b, new THREE.Vector3(1, 0, 0)),
        y: buildAxisLabel("Y", 0x45d16f, new THREE.Vector3(0, 1, 0)),
        z: buildAxisLabel("Z", 0x4f8cff, new THREE.Vector3(0, 0, 1)),
      };

      this._centerHandle = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 20, 20),
        new THREE.MeshBasicMaterial({
          color: 0xfafcff,
          transparent: true,
          opacity: 0.2,
          depthWrite: false,
        })
      );
      this._centerHandle.userData.axis = "all";

      this._gizmoRoot.add(this._axisLines.x);
      this._gizmoRoot.add(this._axisLines.y);
      this._gizmoRoot.add(this._axisLines.z);
      this._gizmoRoot.add(this._handles.x);
      this._gizmoRoot.add(this._handles.y);
      this._gizmoRoot.add(this._handles.z);
      this._gizmoRoot.add(this._axisLabels.x);
      this._gizmoRoot.add(this._axisLabels.y);
      this._gizmoRoot.add(this._axisLabels.z);
      this._gizmoRoot.add(this._centerHandle);
      this.add(this._gizmoRoot);

      this._pickTargets = [this._handles.x, this._handles.y, this._handles.z, this._centerHandle];

      this._onPointerDown = this._handlePointerDown.bind(this);
      this._onPointerMove = this._handlePointerMove.bind(this);
      this._onPointerUp = this._handlePointerUp.bind(this);

      if (this.domElement && this.domElement.addEventListener) {
        this.domElement.addEventListener("pointerdown", this._onPointerDown);
        this.domElement.addEventListener("pointermove", this._onPointerMove);
        this.domElement.addEventListener("pointerup", this._onPointerUp);
        this.domElement.addEventListener("pointercancel", this._onPointerUp);
        this.domElement.addEventListener("lostpointercapture", this._onPointerUp);
      }
    }

    setMode(mode) {
      this.mode = mode || "translate";
      return this;
    }

    setTranslationSnap() {
      return this;
    }

    setSpace() {
      return this;
    }

    setSize() {
      return this;
    }

    setDragPlaneName(plane) {
      var nextPlane = String(plane || "xy").toLowerCase();
      if (nextPlane !== "xy" && nextPlane !== "xz" && nextPlane !== "yz") {
        nextPlane = "xy";
      }
      this.dragPlaneName = nextPlane;
      return this;
    }

    attach(object) {
      this.object = object || null;
      this.visible = !!this.object;
      if (this.object) {
        this.position.copy(this.object.position);
      }
      return this;
    }

    detach() {
      this.object = null;
      this.visible = false;
      this.dragging = false;
      this.axis = null;
      return this;
    }

    dispose() {
      this.detach();
      if (this.domElement && this.domElement.removeEventListener) {
        this.domElement.removeEventListener("pointerdown", this._onPointerDown);
        this.domElement.removeEventListener("pointermove", this._onPointerMove);
        this.domElement.removeEventListener("pointerup", this._onPointerUp);
        this.domElement.removeEventListener("pointercancel", this._onPointerUp);
        this.domElement.removeEventListener("lostpointercapture", this._onPointerUp);
      }
    }

    _syncAxisVisibility() {
      this._axisLines.x.visible = this.showX;
      this._axisLines.y.visible = this.showY;
      this._axisLines.z.visible = this.showZ;
      this._handles.x.visible = this.showX;
      this._handles.y.visible = this.showY;
      this._handles.z.visible = this.showZ;
      this._axisLabels.x.visible = this.showX;
      this._axisLabels.y.visible = this.showY;
      this._axisLabels.z.visible = this.showZ;
    }

    _pointerToNdc(event) {
      if (!this.domElement || typeof this.domElement.getBoundingClientRect !== "function") {
        return false;
      }

      var rect = this.domElement.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return false;
      }

      this._pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -(((event.clientY - rect.top) / rect.height) * 2 - 1)
      );
      return true;
    }

    _configurePlane(axisName) {
      if (!this.object) {
        return false;
      }

      var normal = new THREE.Vector3();
      var axis = String(axisName || "all").toLowerCase();
      if (axis === "x" || axis === "y" || axis === "z") {
        if (!this.camera || typeof this.camera.getWorldDirection !== "function") {
          return false;
        }
        this._axisVector.set(axis === "x" ? 1 : 0, axis === "y" ? 1 : 0, axis === "z" ? 1 : 0);
        var viewDirection = new THREE.Vector3();
        this.camera.getWorldDirection(viewDirection);
        var helperCross = new THREE.Vector3().crossVectors(this._axisVector, viewDirection);
        if (helperCross.lengthSq() < 1e-8) {
          helperCross.set(0, 1, 0).cross(this._axisVector);
          if (helperCross.lengthSq() < 1e-8) {
            helperCross.set(0, 0, 1).cross(this._axisVector);
          }
        }
        normal.crossVectors(helperCross, this._axisVector).normalize();
        if (normal.lengthSq() < 1e-8) {
          return false;
        }
      } else if (this.dragPlaneName === "xz") {
        normal.set(0, 1, 0);
      } else if (this.dragPlaneName === "yz") {
        normal.set(1, 0, 0);
      } else {
        normal.set(0, 0, 1);
      }

      this._dragPlane.setFromNormalAndCoplanarPoint(normal, this.object.position);
      return true;
    }

    _handlePointerDown(event) {
      if (!this.enabled || !this.object || !this.visible || !this.camera) {
        return;
      }
      if (typeof event.button === "number" && event.button !== 0) {
        return;
      }
      if (!this._pointerToNdc(event)) {
        return;
      }

      this._raycaster.setFromCamera(this._pointer, this.camera);
      var intersections = this._raycaster.intersectObjects(this._pickTargets, false);
      if (!intersections.length) {
        return;
      }

      this.axis = intersections[0].object.userData.axis || "all";
      if (!this._configurePlane(this.axis)) {
        this.axis = null;
        return;
      }

      if (!this._raycaster.ray.intersectPlane(this._dragPlane, this._dragIntersection)) {
        return;
      }

      this._startIntersection.copy(this._dragIntersection);
      this._startPosition.copy(this.object.position);
      this._dragOffset.copy(this.object.position).sub(this._dragIntersection);
      this.dragging = true;

      if (this.domElement && this.domElement.setPointerCapture && typeof event.pointerId === "number") {
        try {
          this.domElement.setPointerCapture(event.pointerId);
        } catch (error) {
          // Ignore capture failures.
        }
      }

      this.dispatchEvent({ type: "dragging-changed", value: true });
      this.dispatchEvent({ type: "mouseDown", axis: this.axis });
      event.preventDefault();
    }

    _handlePointerMove(event) {
      if (!this.enabled || !this.object || !this.dragging || !this.camera) {
        return;
      }
      if (!this._pointerToNdc(event)) {
        return;
      }

      this._raycaster.setFromCamera(this._pointer, this.camera);
      if (!this._raycaster.ray.intersectPlane(this._dragPlane, this._dragIntersection)) {
        return;
      }

      if (this.axis === "x" || this.axis === "y" || this.axis === "z") {
        var delta = new THREE.Vector3().copy(this._dragIntersection).sub(this._startIntersection);
        var travel = delta.dot(this._axisVector);
        this.object.position.copy(this._startPosition).addScaledVector(this._axisVector, travel);
      } else {
        this.object.position.copy(this._dragIntersection).add(this._dragOffset);
      }
      this.position.copy(this.object.position);
      this.dispatchEvent({ type: "change" });
      this.dispatchEvent({ type: "objectChange" });
      event.preventDefault();
    }

    _handlePointerUp(event) {
      if (!this.dragging) {
        return;
      }

      this.dragging = false;
      this.dispatchEvent({ type: "mouseUp", axis: this.axis });
      this.dispatchEvent({ type: "dragging-changed", value: false });
      this.axis = null;

      if (this.domElement && this.domElement.releasePointerCapture && typeof event.pointerId === "number") {
        try {
          this.domElement.releasePointerCapture(event.pointerId);
        } catch (error) {
          // Ignore capture release failures.
        }
      }
    }

    updateMatrixWorld(force) {
      if (this.object) {
        this.position.copy(this.object.position);
      }
      this._syncAxisVisibility();
      super.updateMatrixWorld(force);
    }
  }

  THREE.TransformControls = TransformControls;
})();

