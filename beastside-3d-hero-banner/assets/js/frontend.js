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

  function getLocationHref() {
    return window.location && typeof window.location.href === "string" ? window.location.href : "";
  }

  function isLikelyDirectModelUrl(url) {
    return /\.gltf($|[?#])/i.test(url) || /\.glb($|[?#])/i.test(url);
  }

  function normalizeModelUrl(rawUrl) {
    var original = typeof rawUrl === "string" ? rawUrl.trim() : "";
    if (!original) {
      return {
        ok: false,
        code: "unsupported_or_not_direct_url",
        reason: "empty_url",
        message: "Model URL is empty",
        modelUrlOriginal: original,
        modelUrlResolved: "",
        normalizationRule: "none",
        hint: "Provide a direct .glb or .gltf URL.",
      };
    }

    var resolved = original;
    var normalizationRule = "none";

    if (resolved.indexOf("//") === 0) {
      var pageProtocol =
        window.location && typeof window.location.protocol === "string" ? window.location.protocol : "https:";
      resolved = pageProtocol + resolved;
      normalizationRule = "protocol_relative";
    }

    var parsedUrl = null;
    try {
      parsedUrl = new URL(resolved, getLocationHref() || undefined);
      resolved = parsedUrl.href;
    } catch (error) {
      return {
        ok: false,
        code: "unsupported_or_not_direct_url",
        reason: "invalid_url",
        message: "Model URL is invalid",
        modelUrlOriginal: original,
        modelUrlResolved: resolved,
        normalizationRule: normalizationRule,
        hint: "Use a full direct URL to a .glb or .gltf asset.",
      };
    }

    var hostname = (parsedUrl.hostname || "").toLowerCase();
    var pathname = parsedUrl.pathname || "";

    if (
      hostname === "github.com" &&
      pathname.indexOf("/blob/") > -1 &&
      pathname.split("/").length >= 5
    ) {
      var segments = pathname.split("/");
      var owner = segments[1] || "";
      var repo = segments[2] || "";
      var blobIndex = segments.indexOf("blob");
      var branch = blobIndex > -1 && segments.length > blobIndex + 1 ? segments[blobIndex + 1] : "";
      var filePath = blobIndex > -1 ? segments.slice(blobIndex + 2).join("/") : "";
      if (owner && repo && branch && filePath) {
        resolved = "https://raw.githubusercontent.com/" + owner + "/" + repo + "/" + branch + "/" + filePath;
        normalizationRule = "github_blob_to_raw";
      }
    }

    if (
      hostname === "www.dropbox.com" ||
      hostname === "dropbox.com" ||
      hostname === "dl.dropboxusercontent.com"
    ) {
      var dropboxUrl = new URL(resolved);
      if (hostname === "www.dropbox.com" || hostname === "dropbox.com") {
        dropboxUrl.hostname = "dl.dropboxusercontent.com";
      }
      dropboxUrl.searchParams.delete("dl");
      dropboxUrl.searchParams.delete("raw");
      dropboxUrl.searchParams.set("raw", "1");
      resolved = dropboxUrl.href;
      normalizationRule = "dropbox_share_to_direct";
    }

    if (
      window.location &&
      window.location.protocol === "https:" &&
      /^http:\/\//i.test(resolved)
    ) {
      return {
        ok: false,
        code: "mixed_content_blocked",
        reason: "mixed_content_blocked",
        message: "Model URL blocked due to insecure http on https page",
        modelUrlOriginal: original,
        modelUrlResolved: resolved,
        normalizationRule: normalizationRule,
        hint: "Use an https model URL or upload the model to WordPress Media.",
      };
    }

    if (!isLikelyDirectModelUrl(resolved)) {
      return {
        ok: false,
        code: "unsupported_or_not_direct_url",
        reason: "non_direct_url",
        message: "Model URL does not appear to be a direct .glb/.gltf asset",
        modelUrlOriginal: original,
        modelUrlResolved: resolved,
        normalizationRule: normalizationRule,
        hint: "Use a direct file URL ending in .glb or .gltf.",
      };
    }

    return {
      ok: true,
      url: resolved,
      modelUrlOriginal: original,
      modelUrlResolved: resolved,
      normalizationRule: normalizationRule,
      hint: "",
    };
  }

  function classifyModelLoadError(error, normalized) {
    var message = error && error.message ? String(error.message) : "Unknown model load error";
    var lower = message.toLowerCase();
    var code = "unknown_model_load_error";
    var hint = "Ensure the URL is direct, public, and allows cross-origin requests.";

    if (
      lower.indexOf("failed to fetch") > -1 ||
      lower.indexOf("networkerror") > -1 ||
      lower.indexOf("cors") > -1 ||
      lower.indexOf("cross-origin") > -1
    ) {
      code = "network_or_cors_blocked";
      hint = "Host the model with CORS allowed or use WordPress Media Library URL.";
    } else if (lower.indexOf("mixed content") > -1) {
      code = "mixed_content_blocked";
      hint = "Use https model URL when the page is served over https.";
    } else if (
      lower.indexOf("404") > -1 ||
      lower.indexOf("unexpected token") > -1 ||
      lower.indexOf("invalid") > -1
    ) {
      code = "unsupported_or_not_direct_url";
      hint = "Verify the link returns the raw .glb/.gltf file, not an HTML share page.";
    }

    return {
      code: code,
      message: message,
      meta: {
        modelUrlOriginal: normalized && normalized.modelUrlOriginal ? normalized.modelUrlOriginal : "",
        modelUrlResolved: normalized && normalized.modelUrlResolved ? normalized.modelUrlResolved : "",
        normalizationRule: normalized && normalized.normalizationRule ? normalized.normalizationRule : "none",
        hint: hint,
      },
    };
  }

  function canUseModelProxy(payload) {
    return (
      payload &&
      payload.surface === "admin-preview" &&
      !!context.isAdminRequest &&
      typeof context.modelProxyUrl === "string" &&
      context.modelProxyUrl.length > 0 &&
      typeof context.modelProxyNonce === "string" &&
      context.modelProxyNonce.length > 0
    );
  }

  function buildModelProxyUrl(payload, modelUrl) {
    if (!canUseModelProxy(payload) || typeof modelUrl !== "string" || !modelUrl.trim()) {
      return "";
    }

    var base = context.modelProxyUrl;
    var separator = base.indexOf("?") === -1 ? "?" : "&";
    return (
      base +
      separator +
      "nonce=" +
      encodeURIComponent(context.modelProxyNonce) +
      "&url=" +
      encodeURIComponent(modelUrl.trim())
    );
  }

  function isTextGltfUrl(url) {
    return /\.gltf($|[?#])/i.test(String(url || ""));
  }

  function deriveResourcePath(url) {
    try {
      var parsed = new URL(String(url || ""), getLocationHref() || undefined);
      var pathname = parsed.pathname || "/";
      var lastSlash = pathname.lastIndexOf("/");
      var dir = lastSlash >= 0 ? pathname.substring(0, lastSlash + 1) : "/";
      return parsed.origin + dir;
    } catch (error) {
      return "";
    }
  }

  function stripUtf8BomFromText(value) {
    var text = typeof value === "string" ? value : "";
    if (!text) {
      return text;
    }
    return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  }

  function stripUtf8BomFromArrayBuffer(value) {
    if (!(value instanceof ArrayBuffer) || value.byteLength < 3) {
      return value;
    }

    var bytes = new Uint8Array(value);
    if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
      return value.slice(3);
    }
    return value;
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
          var normalized = normalizeModelUrl(model.url);
          var proxyEnabled = canUseModelProxy(payload);

          function onModelLoaded(gltf, viaProxy) {
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

            if (viaProxy) {
              emitDiagnostic(
                payload,
                "info",
                "model_proxy_success",
                "Model #" + (index + 1) + " loaded via admin proxy fallback",
                {
                  modelIndex: index + 1,
                  modelUrlOriginal: normalized.modelUrlOriginal || "",
                  modelUrlResolved: normalized.modelUrlResolved || "",
                  normalizationRule: normalized.normalizationRule || "none",
                  hint: "Direct model fetch failed, proxy fallback succeeded.",
                },
                false
              );
            }

            resolve();
          }

          function finalizeLoadError(classified, viaProxy) {
            emitDiagnostic(
              payload,
              "error",
              classified.code,
              "Model #" + (index + 1) + " load failed",
              Object.assign(
                {
                  modelIndex: index + 1,
                  viaProxy: !!viaProxy,
                },
                classified.meta
              ),
              false
            );
            reject(new Error("Model #" + (index + 1) + " failed: " + classified.message));
          }

          function attemptProxyLoad(proxyUrl) {
            var sourceUrl = normalized.modelUrlResolved || normalized.modelUrlOriginal || "";
            var expectsText = isTextGltfUrl(sourceUrl);

            if (typeof fetch !== "function") {
              finalizeLoadError(
                {
                  code: "model_proxy_fetch_failed",
                  message: "Proxy retry unavailable: fetch API not available",
                  meta: {
                    modelUrlOriginal: normalized.modelUrlOriginal || "",
                    modelUrlResolved: normalized.modelUrlResolved || "",
                    normalizationRule: normalized.normalizationRule || "none",
                    hint: "Use a modern browser for admin preview proxy fallback.",
                  },
                },
                true
              );
              return;
            }

            if (!loader || typeof loader.parse !== "function") {
              finalizeLoadError(
                {
                  code: "model_proxy_parse_failed",
                  message: "Proxy retry unavailable: GLTFLoader.parse not available",
                  meta: {
                    modelUrlOriginal: normalized.modelUrlOriginal || "",
                    modelUrlResolved: normalized.modelUrlResolved || "",
                    normalizationRule: normalized.normalizationRule || "none",
                    hint: "GLTF loader runtime is not fully initialized.",
                  },
                },
                true
              );
              return;
            }

            fetch(proxyUrl, {
              method: "GET",
              credentials: "same-origin",
            })
              .then(function (response) {
                if (!response.ok) {
                  throw new Error("Proxy HTTP " + response.status);
                }
                return expectsText ? response.text() : response.arrayBuffer();
              })
              .then(function (modelData) {
                if (disposed) {
                  resolve();
                  return;
                }

                modelData = expectsText
                  ? stripUtf8BomFromText(modelData)
                  : stripUtf8BomFromArrayBuffer(modelData);

                var resourcePath = deriveResourcePath(sourceUrl);
                loader.parse(
                  modelData,
                  resourcePath,
                  function (gltf) {
                    onModelLoaded(gltf, true);
                  },
                  function (parseError) {
                    finalizeLoadError(
                      {
                        code: "model_proxy_parse_failed",
                        message:
                          parseError && parseError.message
                            ? parseError.message
                            : "Proxy model parse failed",
                        meta: {
                          modelUrlOriginal: normalized.modelUrlOriginal || "",
                          modelUrlResolved: normalized.modelUrlResolved || "",
                          normalizationRule: normalized.normalizationRule || "none",
                          hint:
                            "Proxy response fetched but could not be parsed as GLTF/GLB. Check for upstream response corruption or non-model bytes.",
                        },
                      },
                      true
                    );
                  }
                );
              })
              .catch(function (proxyError) {
                finalizeLoadError(
                  {
                    code: "model_proxy_fetch_failed",
                    message:
                      proxyError && proxyError.message
                        ? proxyError.message
                        : "Proxy fetch failed",
                    meta: {
                      modelUrlOriginal: normalized.modelUrlOriginal || "",
                      modelUrlResolved: normalized.modelUrlResolved || "",
                      normalizationRule: normalized.normalizationRule || "none",
                      hint: "Admin proxy could not fetch the remote model URL.",
                    },
                  },
                  true
                );
              });
          }

          function attemptLoad(targetUrl, viaProxy) {
            if (viaProxy) {
              attemptProxyLoad(targetUrl);
              return;
            }

            loader.load(
              targetUrl,
              function (gltf) {
                onModelLoaded(gltf, viaProxy);
              },
              undefined,
              function (error) {
                var classified = classifyModelLoadError(error, normalized);
                if (!viaProxy && proxyEnabled && classified.code === "network_or_cors_blocked") {
                  var proxyRetryUrl = buildModelProxyUrl(
                    payload,
                    normalized.modelUrlResolved || normalized.modelUrlOriginal || targetUrl
                  );
                  if (proxyRetryUrl) {
                    emitDiagnostic(
                      payload,
                      "warn",
                      "model_proxy_retry",
                      "Retrying model #" + (index + 1) + " through admin proxy",
                      {
                        modelIndex: index + 1,
                        modelUrlOriginal: normalized.modelUrlOriginal || "",
                        modelUrlResolved: normalized.modelUrlResolved || "",
                        normalizationRule: normalized.normalizationRule || "none",
                        hint: "Direct fetch failed due to network/CORS; admin proxy retry started.",
                      },
                      false
                    );
                    attemptLoad(proxyRetryUrl, true);
                    return;
                  }
                }

                finalizeLoadError(classified, viaProxy);
              }
            );
          }

          if (!normalized.ok) {
            if (proxyEnabled && normalized.code === "mixed_content_blocked") {
              var proxyMixedContentUrl = buildModelProxyUrl(
                payload,
                normalized.modelUrlResolved || normalized.modelUrlOriginal || ""
              );
              if (proxyMixedContentUrl) {
                emitDiagnostic(
                  payload,
                  "warn",
                  "model_proxy_retry",
                  "Retrying mixed-content model #" + (index + 1) + " through admin proxy",
                  {
                    modelIndex: index + 1,
                    modelUrlOriginal: normalized.modelUrlOriginal || "",
                    modelUrlResolved: normalized.modelUrlResolved || "",
                    normalizationRule: normalized.normalizationRule || "none",
                    hint: "HTTPS page blocked HTTP model URL; admin proxy retry started.",
                  },
                  false
                );
                attemptLoad(proxyMixedContentUrl, true);
                return;
              }
            }

            emitDiagnostic(
              payload,
              "error",
              normalized.code || "unsupported_or_not_direct_url",
              "Model #" + (index + 1) + " URL rejected: " + (normalized.message || "Invalid URL"),
              {
                modelIndex: index + 1,
                modelUrlOriginal: normalized.modelUrlOriginal || "",
                modelUrlResolved: normalized.modelUrlResolved || "",
                normalizationRule: normalized.normalizationRule || "none",
                hint: normalized.hint || "Provide a direct, CORS-friendly .glb or .gltf URL.",
              },
              false
            );
            reject(new Error("Model #" + (index + 1) + " failed: " + (normalized.message || "Invalid model URL")));
            return;
          }

          attemptLoad(normalized.url, false);
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
