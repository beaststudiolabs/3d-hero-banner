(function () {
  "use strict";

  var context = window.BS3DDebugContext || {};
  var FRONTEND_SELECTOR = ".bs3d-banner[data-bs3d]";
  var DEFAULT_TIMEOUT_MS = 12000;

  function dispatchEvent(name, detail) {
    try {
      window.dispatchEvent(new CustomEvent(name, { detail: detail }));
    } catch (error) {
      // Ignore dispatch failures in older browsers.
    }
  }

  function parsePayload(container) {
    var raw = container.getAttribute("data-bs3d");
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }

  function postDiagnostic(payload) {
    if (!context.restUrl || typeof fetch !== "function") {
      return;
    }

    var headers = { "Content-Type": "application/json" };
    if (context.restNonce) {
      headers["X-WP-Nonce"] = context.restNonce;
    }

    fetch(context.restUrl, {
      method: "POST",
      credentials: "same-origin",
      headers: headers,
      body: JSON.stringify(payload),
    }).catch(function () {
      // Diagnostics should never break runtime.
    });
  }

  function resolveDevice(payload) {
    var mobile = window.matchMedia && window.matchMedia("(max-width: 767px)").matches;
    if (!mobile) {
      return "desktop";
    }

    if (payload.mobileMode === "full") {
      return "mobile-full";
    }
    if (payload.mobileMode === "off") {
      return "mobile-off";
    }
    if (payload.mobileMode === "reduced") {
      return "mobile-reduced";
    }

    return "mobile-adaptive";
  }

  function getNumber(value, fallback) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function degToRad(value) {
    return (getNumber(value, 0) * Math.PI) / 180;
  }

  function getScene(payload) {
    if (payload && payload.scene && typeof payload.scene === "object") {
      return payload.scene;
    }
    return {};
  }

  function getModelEntries(payload) {
    var scene = getScene(payload);
    if (!Array.isArray(scene.models)) {
      return [];
    }

    return scene.models
      .slice(0, 3)
      .filter(function (model) {
        return model && typeof model.url === "string" && model.url.trim().length > 0;
      });
  }

  function emitDiagnostic(payload, level, code, message, meta, critical) {
    var detail = {
      timestamp: new Date().toISOString(),
      level: level,
      bannerId: payload.bannerId || 0,
      slug: payload.slug || "",
      surface: payload.surface || "frontend",
      code: code,
      message: message,
      meta: meta || {},
      effectiveDebug: !!payload.effectiveDebug,
      critical: !!critical,
    };

    if (level === "error") {
      dispatchEvent("bs3d.debug_error", detail);
      dispatchEvent("bs3d.load_error", detail);
    } else if (level === "warn") {
      dispatchEvent("bs3d.debug_warning", detail);
    } else {
      dispatchEvent("bs3d.debug_status", detail);
    }

    if (critical || payload.effectiveDebug) {
      postDiagnostic(detail);
    }

    return detail;
  }

  function getStage(container) {
    var stage = container.querySelector(".bs3d-stage");
    if (!stage) {
      stage = document.createElement("div");
      stage.className = "bs3d-stage";
      container.appendChild(stage);
    }
    return stage;
  }

  function clearStage(stage) {
    while (stage.firstChild) {
      stage.removeChild(stage.firstChild);
    }
  }

  function ensureOverlay(container, payload) {
    if (!payload.overlayEnabled || !context.adminOverlayUser) {
      return null;
    }

    var overlay = container.querySelector(".bs3d-debug-overlay");
    if (!overlay) {
      overlay = document.createElement("pre");
      overlay.className = "bs3d-debug-overlay";
      container.appendChild(overlay);
      dispatchEvent("bs3d.debug_overlay_rendered", {
        bannerId: payload.bannerId || 0,
        slug: payload.slug || "",
        surface: payload.surface || "frontend",
        timestamp: new Date().toISOString(),
      });
    }

    return overlay;
  }

  function disposeMaterial(material) {
    if (!material) {
      return;
    }

    var materialList = Array.isArray(material) ? material : [material];
    materialList.forEach(function (entry) {
      if (!entry) {
        return;
      }

      Object.keys(entry).forEach(function (key) {
        var value = entry[key];
        if (value && typeof value.dispose === "function" && typeof value === "object" && value.isTexture) {
          value.dispose();
        }
      });

      if (typeof entry.dispose === "function") {
        entry.dispose();
      }
    });
  }

  function disposeObject3D(object3D) {
    if (!object3D || typeof object3D.traverse !== "function") {
      return;
    }

    object3D.traverse(function (node) {
      if (node.geometry && typeof node.geometry.dispose === "function") {
        node.geometry.dispose();
      }
      if (node.material) {
        disposeMaterial(node.material);
      }
    });
  }

  function createBannerRuntime(container, payload) {
    var stage = getStage(container);
    var scene = null;
    var camera = null;
    var renderer = null;
    var rootGroup = null;
    var loader = null;
    var dracoLoader = null;
    var animationFrameId = 0;
    var resizeHandler = null;
    var pointerMoveHandler = null;
    var pointerEnterHandler = null;
    var pointerLeaveHandler = null;
    var timeoutHandle = 0;
    var intersectionObserver = null;
    var disposed = false;

    var sceneConfig = getScene(payload);
    var interactions = sceneConfig.interactions || {};
    var fallbackConfig = sceneConfig.fallback || {};
    var modelEntries = getModelEntries(payload);

    var deviceMode = resolveDevice(payload);
    var deviceScale = 1;
    if (deviceMode === "mobile-reduced") {
      deviceScale = 0.6;
    } else if (deviceMode === "mobile-adaptive") {
      deviceScale = 0.8;
    } else if (deviceMode === "mobile-off") {
      deviceScale = 0;
    }

    var state = {
      startedAt: performance.now(),
      modelCount: modelEntries.length,
      modelsLoaded: 0,
      modelsReady: false,
      fallbackActive: false,
      fallbackReason: "inactive",
      lastIssue: "none",
      renderSuccessLogged: false,
      drawCallEstimate: 0,
      frames: 0,
      fpsSamples: [],
      fpsBucket: "n/a",
      lastFrameAt: 0,
      nextOverlayAt: 0,
      pointerX: 0,
      pointerY: 0,
      targetRotationX: 0,
      targetRotationY: 0,
      currentRotationX: 0,
      currentRotationY: 0,
      targetParallaxX: 0,
      targetParallaxY: 0,
      currentParallaxX: 0,
      currentParallaxY: 0,
    };

    var overlay = ensureOverlay(container, payload);

    function updateOverlay() {
      if (!overlay) {
        return;
      }

      var elapsed = Math.max(0, Math.round(performance.now() - state.startedAt));
      var verbosity = payload.verbosity || context.verbosity || "normal";
      var lines = [];

      lines.push("Banner: " + (payload.bannerId || "-") + " (" + (payload.slug || "-") + ")");
      lines.push("Mode: " + (payload.surface || "frontend"));
      lines.push("Device: " + deviceMode);
      lines.push("Quality: " + (payload.qualityProfile || "balanced"));

      if (verbosity !== "errors") {
        lines.push("Model Status: " + state.modelsLoaded + "/" + state.modelCount);
      }

      lines.push("Fallback: " + (state.fallbackActive ? "active (" + state.fallbackReason + ")" : "inactive"));
      lines.push("Last Issue: " + state.lastIssue);

      if (verbosity === "verbose") {
        lines.push("Load Time: " + elapsed + "ms");
        lines.push("Avg FPS Bucket: " + state.fpsBucket);
        lines.push("Draw Calls Est.: " + state.drawCallEstimate);
      }

      overlay.textContent = lines.join("\n");
    }

    function setLastIssue(issue) {
      state.lastIssue = issue || "none";
      updateOverlay();
    }

    function setFallback(reason, message, meta) {
      if (disposed || state.fallbackActive) {
        return;
      }

      state.fallbackActive = true;
      state.fallbackReason = reason || "runtime_error";
      setLastIssue(message || "Fallback activated");

      container.classList.remove("bs3d-initializing");
      container.classList.add("bs3d-fallback-active");

      emitDiagnostic(
        payload,
        "error",
        "fallback_shown",
        message || "Fallback activated",
        Object.assign({ reason: state.fallbackReason }, meta || {}),
        false
      );

      dispatchEvent("bs3d.fallback_shown", {
        bannerId: payload.bannerId || 0,
        slug: payload.slug || "",
        reason: state.fallbackReason,
      });

      stopRenderLoop();
    }

    function stopRenderLoop() {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = 0;
      }

      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
        timeoutHandle = 0;
      }
    }

    function disposeRenderer() {
      stopRenderLoop();

      if (resizeHandler) {
        window.removeEventListener("resize", resizeHandler);
        resizeHandler = null;
      }

      if (pointerMoveHandler) {
        container.removeEventListener("pointermove", pointerMoveHandler);
        pointerMoveHandler = null;
      }

      if (pointerEnterHandler) {
        container.removeEventListener("pointerenter", pointerEnterHandler);
        pointerEnterHandler = null;
      }

      if (pointerLeaveHandler) {
        container.removeEventListener("pointerleave", pointerLeaveHandler);
        pointerLeaveHandler = null;
      }

      if (scene) {
        disposeObject3D(scene);
      }

      if (dracoLoader && typeof dracoLoader.dispose === "function") {
        dracoLoader.dispose();
      }

      if (renderer) {
        renderer.dispose();
      }

      clearStage(stage);
      scene = null;
      camera = null;
      renderer = null;
      rootGroup = null;
      loader = null;
      dracoLoader = null;
    }

    function teardown() {
      disposed = true;

      if (intersectionObserver) {
        intersectionObserver.disconnect();
        intersectionObserver = null;
      }

      disposeRenderer();
      updateOverlay();
    }

    function updateFpsBucket(now) {
      if (!state.lastFrameAt) {
        state.lastFrameAt = now;
        return;
      }

      var delta = now - state.lastFrameAt;
      state.lastFrameAt = now;

      if (delta > 0) {
        state.fpsSamples.push(1000 / delta);
      }

      if (state.fpsSamples.length > 45) {
        state.fpsSamples.shift();
      }

      if (state.fpsSamples.length >= 10) {
        var sum = state.fpsSamples.reduce(function (acc, fps) {
          return acc + fps;
        }, 0);
        var avg = sum / state.fpsSamples.length;
        if (avg >= 58) {
          state.fpsBucket = "58-60";
        } else if (avg >= 45) {
          state.fpsBucket = "45-57";
        } else if (avg >= 30) {
          state.fpsBucket = "30-44";
        } else {
          state.fpsBucket = "<30";
        }
      }
    }

    function estimateDrawCalls(root) {
      var calls = 0;
      root.traverse(function (node) {
        if (node.isMesh) {
          calls += 1;
        }
      });
      return calls;
    }

    function applyModelTransform(root, modelConfig) {
      var position = modelConfig.position || {};
      var rotation = modelConfig.rotation || {};
      var scale = modelConfig.scale || {};
      var visible = modelConfig.visible !== false;
      var castShadow = modelConfig.castShadow !== false;
      var receiveShadow = modelConfig.receiveShadow !== false;

      root.visible = visible;
      root.position.set(getNumber(position.x, 0), getNumber(position.y, 0), getNumber(position.z, 0));
      root.rotation.set(degToRad(rotation.x), degToRad(rotation.y), degToRad(rotation.z));
      root.scale.set(
        getNumber(scale.x, 1) || 1,
        getNumber(scale.y, 1) || 1,
        getNumber(scale.z, 1) || 1
      );

      root.traverse(function (node) {
        if (!node.isMesh) {
          return;
        }

        node.castShadow = castShadow;
        node.receiveShadow = receiveShadow;
        if (node.material) {
          node.material.needsUpdate = true;
        }
      });
    }

    function setupScene() {
      var THREE = window.THREE;
      if (!THREE || !THREE.Scene || !THREE.WebGLRenderer) {
        return false;
      }

      var width = Math.max(320, Math.round(stage.clientWidth || container.clientWidth || 640));
      var height = Math.max(200, Math.round(stage.clientHeight || container.clientHeight || 360));
      var qualityProfile = payload.qualityProfile || "balanced";

      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: qualityProfile !== "performance",
        powerPreference: qualityProfile === "performance" ? "high-performance" : "default",
      });

      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, qualityProfile === "performance" ? 1.5 : 2));
      renderer.setSize(width, height, false);

      if (renderer.shadowMap) {
        renderer.shadowMap.enabled = !!(sceneConfig.lighting && sceneConfig.lighting.shadows);
      }

      clearStage(stage);
      stage.appendChild(renderer.domElement);

      scene = new THREE.Scene();

      var bg = sceneConfig.background || {};
      if (bg.color) {
        try {
          scene.background = new THREE.Color(bg.color);
        } catch (error) {
          // Ignore invalid colors and keep transparent background.
        }
      }

      if (bg.imageUrl) {
        var textureLoader = new THREE.TextureLoader();
        textureLoader.load(
          bg.imageUrl,
          function (texture) {
            if (!disposed && scene) {
              scene.background = texture;
            }
          },
          undefined,
          function () {
            emitDiagnostic(payload, "warn", "background_image_failed", "Background image failed to load", {
              imageUrl: bg.imageUrl,
            }, false);
          }
        );
      }

      if (bg.mode === "diorama" && bg.imageUrl) {
        var depth = getNumber(bg.dioramaDepth, 8);
        var dioramaTextureLoader = new THREE.TextureLoader();
        dioramaTextureLoader.load(
          bg.imageUrl,
          function (texture) {
            if (disposed || !scene) {
              return;
            }

            var planes = 5;
            for (var i = 0; i < planes; i += 1) {
              var progress = i / (planes - 1 || 1);
              var plane = new THREE.Mesh(
                new THREE.PlaneGeometry(9 + progress * 2.2, 5 + progress * 1.1),
                new THREE.MeshBasicMaterial({
                  map: texture,
                  transparent: true,
                  opacity: clamp(0.12 + progress * 0.16, 0.1, 0.65),
                  depthWrite: false,
                })
              );
              plane.position.z = -1 * (progress * Math.max(1, depth));
              scene.add(plane);
            }
          },
          undefined,
          function () {
            emitDiagnostic(payload, "warn", "diorama_texture_failed", "Diorama texture failed to load", {
              imageUrl: bg.imageUrl,
            }, false);
          }
        );
      }

      var cameraConfig = sceneConfig.camera || {};
      var cameraPosition = cameraConfig.position || {};

      camera = new THREE.PerspectiveCamera(
        clamp(getNumber(cameraConfig.fov, 45), 20, 100),
        width / height,
        0.1,
        2000
      );
      camera.position.set(
        getNumber(cameraPosition.x, 0),
        getNumber(cameraPosition.y, 0),
        getNumber(cameraPosition.z, 5)
      );
      camera.lookAt(0, 0, 0);

      rootGroup = new THREE.Group();
      scene.add(rootGroup);

      var lighting = sceneConfig.lighting || {};
      var ambient = new THREE.AmbientLight(0xffffff, clamp(getNumber(lighting.ambientIntensity, 0.8), 0, 8));
      scene.add(ambient);

      var directional = new THREE.DirectionalLight(0xffffff, clamp(getNumber(lighting.directionalIntensity, 1.15), 0, 12));
      var directionalPos = lighting.directionalPosition || {};
      directional.position.set(
        getNumber(directionalPos.x, 5),
        getNumber(directionalPos.y, 10),
        getNumber(directionalPos.z, 7)
      );
      directional.castShadow = !!lighting.shadows;
      scene.add(directional);

      var hasDraco = !!(THREE.DRACOLoader && context.dracoConfigured);
      var hasMeshopt = !!(context.meshoptConfigured && window[context.meshoptGlobalKey || "MeshoptDecoder"]);

      loader = new THREE.GLTFLoader();
      if (hasDraco) {
        dracoLoader = new THREE.DRACOLoader();
        dracoLoader.setDecoderPath(context.dracoDecoderPath || "");
        loader.setDRACOLoader(dracoLoader);
      }

      if (hasMeshopt && typeof loader.setMeshoptDecoder === "function") {
        loader.setMeshoptDecoder(window[context.meshoptGlobalKey || "MeshoptDecoder"]);
      }

      if (context.dracoConfigured && !hasDraco) {
        setLastIssue("Draco decoder unavailable in runtime");
        emitDiagnostic(payload, "warn", "draco_runtime_missing", state.lastIssue, {}, false);
      }

      if (context.meshoptConfigured && !hasMeshopt) {
        setLastIssue("Meshopt decoder unavailable in runtime");
        emitDiagnostic(payload, "warn", "meshopt_runtime_missing", state.lastIssue, {}, false);
      }

      resizeHandler = function () {
        if (!renderer || !camera) {
          return;
        }

        var nextWidth = Math.max(320, Math.round(stage.clientWidth || container.clientWidth || 640));
        var nextHeight = Math.max(200, Math.round(stage.clientHeight || container.clientHeight || 360));

        renderer.setSize(nextWidth, nextHeight, false);
        camera.aspect = nextWidth / nextHeight;
        camera.updateProjectionMatrix();
      };
      window.addEventListener("resize", resizeHandler);

      return true;
    }

    function loadModels() {
      if (!loader) {
        return Promise.reject(new Error("Loader not initialized"));
      }

      if (!modelEntries.length) {
        state.modelsReady = true;
        return Promise.resolve();
      }

      var loads = modelEntries.map(function (model, index) {
        return new Promise(function (resolve, reject) {
          loader.load(
            model.url,
            function (gltf) {
              if (disposed || !rootGroup) {
                resolve();
                return;
              }

              var root = gltf && (gltf.scene || (Array.isArray(gltf.scenes) ? gltf.scenes[0] : null));
              if (!root) {
                reject(new Error("GLTF scene missing"));
                return;
              }

              applyModelTransform(root, model);
              rootGroup.add(root);
              state.modelsLoaded += 1;
              state.drawCallEstimate += estimateDrawCalls(root);
              updateOverlay();
              resolve();
            },
            undefined,
            function (error) {
              var errorMessage = error && error.message ? error.message : "Unknown model load error";
              reject(new Error("Model #" + (index + 1) + " failed: " + errorMessage));
            }
          );
        });
      });

      return Promise.all(loads).then(function () {
        state.modelsReady = true;
      });
    }

    function setupInteractionHandlers() {
      var allowInteraction = deviceScale > 0;
      if (!allowInteraction) {
        return;
      }

      pointerEnterHandler = function () {
        dispatchEvent("bs3d.interaction_start", {
          bannerId: payload.bannerId || 0,
          slug: payload.slug || "",
          timestamp: new Date().toISOString(),
        });

        if ((payload.verbosity || context.verbosity) === "verbose") {
          emitDiagnostic(payload, "info", "interaction_start", "Pointer interaction started", {}, false);
        }
      };

      pointerLeaveHandler = function () {
        state.pointerX = 0;
        state.pointerY = 0;
        state.targetRotationX = 0;
        state.targetRotationY = 0;
        state.targetParallaxX = 0;
        state.targetParallaxY = 0;

        dispatchEvent("bs3d.interaction_end", {
          bannerId: payload.bannerId || 0,
          slug: payload.slug || "",
          timestamp: new Date().toISOString(),
        });

        if ((payload.verbosity || context.verbosity) === "verbose") {
          emitDiagnostic(payload, "info", "interaction_end", "Pointer interaction ended", {}, false);
        }
      };

      pointerMoveHandler = function (event) {
        if (!container.getBoundingClientRect) {
          return;
        }

        var rect = container.getBoundingClientRect();
        if (!rect.width || !rect.height) {
          return;
        }

        var x = (event.clientX - rect.left) / rect.width;
        var y = (event.clientY - rect.top) / rect.height;

        state.pointerX = clamp(x * 2 - 1, -1, 1);
        state.pointerY = clamp(y * 2 - 1, -1, 1);
      };

      container.addEventListener("pointerenter", pointerEnterHandler);
      container.addEventListener("pointerleave", pointerLeaveHandler);
      container.addEventListener("pointermove", pointerMoveHandler);
    }

    function updateInteractions() {
      if (!rootGroup || !camera || deviceScale <= 0) {
        return;
      }

      var tiltEnabled = interactions.tilt !== false;
      var rotateEnabled = interactions.rotate !== false;
      var parallaxEnabled = interactions.parallax !== false;
      var scrollCameraEnabled = interactions.scrollCamera !== false;
      var tiltStrength = clamp(getNumber(interactions.tiltIntensity, 0.2), 0, 5) * 0.4 * deviceScale;
      var scrollStrength = clamp(getNumber(interactions.scrollIntensity, 0.35), 0, 2) * 0.6 * deviceScale;

      state.targetRotationX = tiltEnabled ? -state.pointerY * tiltStrength : 0;
      state.targetRotationY = rotateEnabled ? state.pointerX * tiltStrength : 0;

      state.currentRotationX += (state.targetRotationX - state.currentRotationX) * 0.09;
      state.currentRotationY += (state.targetRotationY - state.currentRotationY) * 0.09;

      rootGroup.rotation.x = state.currentRotationX;
      rootGroup.rotation.y = state.currentRotationY;

      var baseCameraX = getNumber(sceneConfig.camera && sceneConfig.camera.position && sceneConfig.camera.position.x, 0);
      var baseCameraY = getNumber(sceneConfig.camera && sceneConfig.camera.position && sceneConfig.camera.position.y, 0);
      var baseCameraZ = getNumber(sceneConfig.camera && sceneConfig.camera.position && sceneConfig.camera.position.z, 5);

      state.targetParallaxX = parallaxEnabled ? state.pointerX * 0.25 * deviceScale : 0;
      state.targetParallaxY = parallaxEnabled ? -state.pointerY * 0.2 * deviceScale : 0;

      state.currentParallaxX += (state.targetParallaxX - state.currentParallaxX) * 0.08;
      state.currentParallaxY += (state.targetParallaxY - state.currentParallaxY) * 0.08;

      camera.position.x = baseCameraX + state.currentParallaxX;
      camera.position.y = baseCameraY + state.currentParallaxY;

      if (scrollCameraEnabled) {
        var maxScroll = Math.max(1, (document.documentElement.scrollHeight || 1) - window.innerHeight);
        var scrollProgress = clamp(window.scrollY / maxScroll, 0, 1);
        var scrollOffset = (scrollProgress - 0.5) * 2 * scrollStrength;
        camera.position.z = baseCameraZ + scrollOffset;
      } else {
        camera.position.z = baseCameraZ;
      }

      camera.lookAt(0, 0, 0);
    }

    function renderLoop(now) {
      if (disposed || state.fallbackActive || !renderer || !scene || !camera) {
        return;
      }

      animationFrameId = requestAnimationFrame(renderLoop);

      updateInteractions();
      renderer.render(scene, camera);

      state.frames += 1;
      updateFpsBucket(now);
      state.drawCallEstimate = renderer.info && renderer.info.render ? renderer.info.render.calls : state.drawCallEstimate;

      if (!state.renderSuccessLogged && state.modelsReady && state.modelsLoaded >= state.modelCount) {
        state.renderSuccessLogged = true;
        container.classList.remove("bs3d-initializing");
        container.classList.remove("bs3d-fallback-active");
        container.classList.add("bs3d-loaded");

        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
          timeoutHandle = 0;
        }

        emitDiagnostic(payload, "info", "render_success", "Renderer initialized", {
          modelCount: state.modelCount,
          loadedModels: state.modelsLoaded,
          loadMs: Math.round(performance.now() - state.startedAt),
          drawCalls: state.drawCallEstimate,
        }, false);

        dispatchEvent("bs3d.banner_loaded", {
          bannerId: payload.bannerId || 0,
          slug: payload.slug || "",
          surface: payload.surface || "frontend",
          timestamp: new Date().toISOString(),
        });
      }

      if (!state.nextOverlayAt || now >= state.nextOverlayAt) {
        state.nextOverlayAt = now + 250;
        updateOverlay();
      }
    }

    function beginRender() {
      var hasThree = typeof window.THREE !== "undefined";
      var hasGLTFLoader = !!(window.THREE && window.THREE.GLTFLoader);
      var hasDracoLoader = !!(window.THREE && window.THREE.DRACOLoader);
      var hasMeshopt = !!window[context.meshoptGlobalKey || "MeshoptDecoder"];

      emitDiagnostic(payload, "info", "status_probe", "Runtime status probe complete", {
        hasThree: hasThree,
        hasGLTFLoader: hasGLTFLoader,
        hasDracoLoader: hasDracoLoader,
        dracoConfigured: !!context.dracoConfigured,
        meshoptConfigured: !!context.meshoptConfigured,
        hasMeshoptDecoder: hasMeshopt,
        modelCount: state.modelCount,
        qualityProfile: payload.qualityProfile || "balanced",
        mobileMode: payload.mobileMode || "adaptive",
      }, false);

      if (!hasThree) {
        setFallback("three_missing", "Three.js runtime not available", {});
        return;
      }

      if (!hasGLTFLoader) {
        setFallback("gltf_loader_missing", "GLTF loader not available", {});
        return;
      }

      if (!setupScene()) {
        setFallback("renderer_setup_failed", "Renderer setup failed", {});
        return;
      }

      setupInteractionHandlers();

      var timeoutMs = clamp(getNumber(fallbackConfig.timeoutMs, DEFAULT_TIMEOUT_MS), 3000, 60000);
      timeoutHandle = window.setTimeout(function () {
        if (!state.renderSuccessLogged) {
          setFallback("renderer_timeout", "Renderer timed out before successful frame", {
            timeoutMs: timeoutMs,
            loadedModels: state.modelsLoaded,
            requiredModels: state.modelCount,
          });
        }
      }, timeoutMs);

      loadModels()
        .then(function () {
          if (disposed || state.fallbackActive) {
            return;
          }
          animationFrameId = requestAnimationFrame(renderLoop);
        })
        .catch(function (error) {
          if (disposed || state.fallbackActive) {
            return;
          }
          var message = error && error.message ? error.message : "Model load failed";
          setFallback("model_load_failed", message, {
            requiredModels: state.modelCount,
            loadedModels: state.modelsLoaded,
          });
        });

      updateOverlay();
    }

    function start() {
      if (disposed) {
        return;
      }

      container.classList.add("bs3d-initializing");
      container.classList.remove("bs3d-loaded");
      container.classList.remove("bs3d-fallback-active");

      dispatchEvent("bs3d.banner_visible", {
        bannerId: payload.bannerId || 0,
        slug: payload.slug || "",
        surface: payload.surface || "frontend",
        timestamp: new Date().toISOString(),
      });

      beginRender();
    }

    function mount() {
      updateOverlay();

      if (payload.lazy && "IntersectionObserver" in window && payload.surface !== "admin-preview") {
        intersectionObserver = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (entry) {
              if (entry.isIntersecting) {
                if (intersectionObserver) {
                  intersectionObserver.disconnect();
                  intersectionObserver = null;
                }
                start();
              }
            });
          },
          { rootMargin: "200px 0px" }
        );
        intersectionObserver.observe(container);
      } else {
        start();
      }
    }

    return {
      mount: mount,
      dispose: teardown,
      updateOverlay: updateOverlay,
    };
  }

  function bootstrapBanner(container) {
    if (!container) {
      return;
    }

    if (container.__bs3dRuntime && typeof container.__bs3dRuntime.dispose === "function") {
      container.__bs3dRuntime.dispose();
    }

    var payload = parsePayload(container);
    if (!payload) {
      return;
    }

    var runtime = createBannerRuntime(container, payload);
    container.__bs3dRuntime = runtime;
    runtime.mount();
  }

  function init() {
    var banners = document.querySelectorAll(FRONTEND_SELECTOR);
    banners.forEach(function (container) {
      bootstrapBanner(container);
    });
  }

  window.BS3DFrontend = {
    init: init,
    bootstrapBanner: bootstrapBanner,
  };

  window.addEventListener("bs3d:refresh", function (event) {
    if (event.detail && event.detail.container) {
      bootstrapBanner(event.detail.container);
      return;
    }

    init();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
