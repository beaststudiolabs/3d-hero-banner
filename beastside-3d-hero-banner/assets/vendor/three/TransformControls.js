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

  function TransformControls(camera, domElement) {
    THREE.Object3D.call(this);

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

    this._gizmoRoot = new THREE.Group();
    this._axisLines = {
      x: buildAxisLine(new THREE.Vector3(1, 0, 0), 0xff7a7a),
      y: buildAxisLine(new THREE.Vector3(0, 1, 0), 0x8cf0b5),
      z: buildAxisLine(new THREE.Vector3(0, 0, 1), 0x7fc9ff),
    };

    this._handles = {
      x: buildAxisHandle(new THREE.Vector3(1, 0, 0), 0xff8f8f, "x"),
      y: buildAxisHandle(new THREE.Vector3(0, 1, 0), 0x9cffc2, "y"),
      z: buildAxisHandle(new THREE.Vector3(0, 0, 1), 0x8ed4ff, "z"),
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
    this._gizmoRoot.add(this._centerHandle);
    this.add(this._gizmoRoot);

    this._pickTargets = [
      this._handles.x,
      this._handles.y,
      this._handles.z,
      this._centerHandle,
    ];

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

  TransformControls.prototype = Object.create(THREE.Object3D.prototype);
  TransformControls.prototype.constructor = TransformControls;
  Object.assign(TransformControls.prototype, THREE.EventDispatcher.prototype);

  TransformControls.prototype.setMode = function (mode) {
    this.mode = mode || "translate";
    return this;
  };

  TransformControls.prototype.setTranslationSnap = function () {
    return this;
  };

  TransformControls.prototype.setSpace = function () {
    return this;
  };

  TransformControls.prototype.setSize = function () {
    return this;
  };

  TransformControls.prototype.setDragPlaneName = function (plane) {
    var nextPlane = String(plane || "xy").toLowerCase();
    if (nextPlane !== "xy" && nextPlane !== "xz" && nextPlane !== "yz") {
      nextPlane = "xy";
    }
    this.dragPlaneName = nextPlane;
    return this;
  };

  TransformControls.prototype.attach = function (object) {
    this.object = object || null;
    this.visible = !!this.object;
    if (this.object) {
      this.position.copy(this.object.position);
    }
    return this;
  };

  TransformControls.prototype.detach = function () {
    this.object = null;
    this.visible = false;
    this.dragging = false;
    this.axis = null;
    return this;
  };

  TransformControls.prototype.dispose = function () {
    this.detach();
    if (this.domElement && this.domElement.removeEventListener) {
      this.domElement.removeEventListener("pointerdown", this._onPointerDown);
      this.domElement.removeEventListener("pointermove", this._onPointerMove);
      this.domElement.removeEventListener("pointerup", this._onPointerUp);
      this.domElement.removeEventListener("pointercancel", this._onPointerUp);
      this.domElement.removeEventListener("lostpointercapture", this._onPointerUp);
    }
  };

  TransformControls.prototype._syncAxisVisibility = function () {
    this._axisLines.x.visible = this.showX;
    this._axisLines.y.visible = this.showY;
    this._axisLines.z.visible = this.showZ;
    this._handles.x.visible = this.showX;
    this._handles.y.visible = this.showY;
    this._handles.z.visible = this.showZ;
  };

  TransformControls.prototype._pointerToNdc = function (event) {
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
  };

  TransformControls.prototype._configurePlane = function () {
    if (!this.object) {
      return false;
    }

    var normal;
    if (this.dragPlaneName === "xz") {
      normal = new THREE.Vector3(0, 1, 0);
    } else if (this.dragPlaneName === "yz") {
      normal = new THREE.Vector3(1, 0, 0);
    } else {
      normal = new THREE.Vector3(0, 0, 1);
    }

    this._dragPlane.setFromNormalAndCoplanarPoint(normal, this.object.position);
    return true;
  };

  TransformControls.prototype._handlePointerDown = function (event) {
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

    if (!this._configurePlane()) {
      return;
    }

    if (!this._raycaster.ray.intersectPlane(this._dragPlane, this._dragIntersection)) {
      return;
    }

    this.axis = intersections[0].object.userData.axis || "all";
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
  };

  TransformControls.prototype._handlePointerMove = function (event) {
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

    this.object.position.copy(this._dragIntersection).add(this._dragOffset);
    this.position.copy(this.object.position);
    this.dispatchEvent({ type: "change" });
    this.dispatchEvent({ type: "objectChange" });
    event.preventDefault();
  };

  TransformControls.prototype._handlePointerUp = function (event) {
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
  };

  TransformControls.prototype.updateMatrixWorld = function (force) {
    if (this.object) {
      this.position.copy(this.object.position);
    }
    this._syncAxisVisibility();
    THREE.Object3D.prototype.updateMatrixWorld.call(this, force);
  };

  THREE.TransformControls = TransformControls;
})();

