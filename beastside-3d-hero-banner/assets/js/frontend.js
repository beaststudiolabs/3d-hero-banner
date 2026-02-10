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

  var LENS_MM_OPTIONS = [8, 16, 24, 35, 50, 70, 85, 100, 120, 150, 180, 200];
  var FULL_FRAME_SENSOR_HEIGHT_MM = 24;

  function getNearestLensMm(value) {
    var lens = getNumber(value, 35);
    var nearest = LENS_MM_OPTIONS[0];
    var delta = Math.abs(nearest - lens);

    LENS_MM_OPTIONS.forEach(function (candidate) {
      var nextDelta = Math.abs(candidate - lens);
      if (nextDelta < delta) {
        nearest = candidate;
        delta = nextDelta;
      }
    });

    return nearest;
  }

  function lensToVerticalFov(lensMm) {
    var safeLens = Math.max(1, getNearestLensMm(lensMm));
    var radians = 2 * Math.atan(FULL_FRAME_SENSOR_HEIGHT_MM / (2 * safeLens));
    return clamp((radians * 180) / Math.PI, 10, 130);
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

    var canonicalOrigin = typeof context.siteOrigin === "string" ? context.siteOrigin.trim() : "";
    if (canonicalOrigin) {
      try {
        var canonicalUrl = new URL(canonicalOrigin, getLocationHref() || undefined);
        var normalizedCurrentHost = (parsedUrl.hostname || "").toLowerCase().replace(/^www\./, "");
        var normalizedCanonicalHost = (canonicalUrl.hostname || "").toLowerCase().replace(/^www\./, "");
        if (
          normalizedCurrentHost &&
          normalizedCanonicalHost &&
          normalizedCurrentHost === normalizedCanonicalHost &&
          (parsedUrl.protocol !== canonicalUrl.protocol || parsedUrl.host.toLowerCase() !== canonicalUrl.host.toLowerCase())
        ) {
          parsedUrl.protocol = canonicalUrl.protocol;
          parsedUrl.host = canonicalUrl.host;
          resolved = parsedUrl.href;
          normalizationRule =
            normalizationRule === "none"
              ? "same_site_canonical_host"
              : normalizationRule + "+same_site_canonical_host";
        }
      } catch (error) {
        // Ignore malformed localized site origin.
      }
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

  function canUseAdminModelProxy(payload) {
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

  function getPublicProxySignature(payload, modelIndex) {
    if (!payload || !payload.modelProxySignatures || typeof payload.modelProxySignatures !== "object") {
      return "";
    }

    var signature = payload.modelProxySignatures[String(modelIndex)];
    return typeof signature === "string" && signature.trim().length > 0 ? signature.trim() : "";
  }

  function canUsePublicModelProxy(payload, modelIndex) {
    return (
      payload &&
      payload.surface !== "admin-preview" &&
      typeof context.modelProxyPublicUrl === "string" &&
      context.modelProxyPublicUrl.length > 0 &&
      Number(payload.bannerId) > 0 &&
      getPublicProxySignature(payload, modelIndex).length > 0
    );
  }

  function canUseModelProxy(payload, modelIndex) {
    return canUseAdminModelProxy(payload) || canUsePublicModelProxy(payload, modelIndex);
  }

  function buildModelProxyUrl(payload, modelUrl, modelIndex) {
    if (canUseAdminModelProxy(payload)) {
      if (typeof modelUrl !== "string" || !modelUrl.trim()) {
        return "";
      }
      var adminBase = context.modelProxyUrl;
      var adminSeparator = adminBase.indexOf("?") === -1 ? "?" : "&";
      return (
        adminBase +
        adminSeparator +
        "nonce=" +
        encodeURIComponent(context.modelProxyNonce) +
        "&url=" +
        encodeURIComponent(modelUrl.trim())
      );
    }

    if (!canUsePublicModelProxy(payload, modelIndex)) {
      return "";
    }

    var signature = getPublicProxySignature(payload, modelIndex);
    var base = context.modelProxyPublicUrl;
    var separator = base.indexOf("?") === -1 ? "?" : "&";
    return (
      base +
      separator +
      "banner_id=" +
      encodeURIComponent(String(payload.bannerId || "")) +
      "&model_index=" +
      encodeURIComponent(String(modelIndex)) +
      "&sig=" +
      encodeURIComponent(signature)
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
    var helperGroup = null;
    var helperPickTargets = [];
    var helperPointLights = [];
    var ambientHelper = null;
    var cameraHelper = null;
    var raycaster = null;
    var ambientLight = null;
    var directionalLight = null;
    var runtimePointLights = [];
    var loader = null;
    var dracoLoader = null;
    var animationFrameId = 0;
    var resizeHandler = null;
    var resizeObserver = null;
    var resizeObserverTargets = [];
    var pointerMoveHandler = null;
    var pointerEnterHandler = null;
    var pointerLeaveHandler = null;
    var pointerDownHandler = null;
    var pointerUpHandler = null;
    var pointerCancelHandler = null;
    var editorBridgeHandler = null;
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

    var editorState = {
      active: payload.surface === "admin-preview",
      mode: "none",
      plane: "xy",
      dragging: false,
      draggedType: "",
      draggedIndex: -1,
      pointerId: null,
      dragOffset: null,
      dragPlane: null,
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

    function normalizeEditorMode(value) {
      var mode = String(value || "none");
      if (
        mode !== "none" &&
        mode !== "camera" &&
        mode !== "pointLight1" &&
        mode !== "pointLight2" &&
        mode !== "pointLight3"
      ) {
        return "none";
      }
      return mode;
    }

    function normalizeEditorPlane(value) {
      var plane = String(value || "xy").toLowerCase();
      if (plane !== "xy" && plane !== "xz" && plane !== "yz") {
        plane = "xy";
      }
      return plane;
    }

    function updateEditorState(mode, plane) {
      editorState.mode = normalizeEditorMode(mode);
      editorState.plane = normalizeEditorPlane(plane);

      if (!editorState.active) {
        editorState.mode = "none";
      }

      if (editorState.mode === "none") {
        stopEditorDrag();
      }
    }

    function readEditorStateFromContainer() {
      if (!editorState.active) {
        updateEditorState("none", "xy");
        return;
      }

      var payloadMode = payload.editorMode || payload.editMode;
      var payloadPlane = payload.dragPlane;
      var attrMode = container.getAttribute("data-bs3d-edit-mode");
      var attrPlane = container.getAttribute("data-bs3d-drag-plane");

      updateEditorState(attrMode || payloadMode || "none", attrPlane || payloadPlane || "xy");
    }

    function isEditModeActive() {
      return editorState.active && editorState.mode !== "none";
    }

    function dispatchEditorHelperUpdate(target, index, vector) {
      if (!editorState.active || !vector) {
        return;
      }

      window.dispatchEvent(
        new CustomEvent("bs3d:editor-helper-update", {
          detail: {
            container: container,
            target: target,
            index: index,
            position: {
              x: Math.round(getNumber(vector.x, 0) * 1000) / 1000,
              y: Math.round(getNumber(vector.y, 0) * 1000) / 1000,
              z: Math.round(getNumber(vector.z, 0) * 1000) / 1000,
            },
          },
        })
      );
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

    function getRuntimeSize() {
      var stageRect = typeof stage.getBoundingClientRect === "function" ? stage.getBoundingClientRect() : null;
      var containerRect =
        container && typeof container.getBoundingClientRect === "function"
          ? container.getBoundingClientRect()
          : null;

      var rawWidth =
        stageRect && stageRect.width > 0
          ? stageRect.width
          : containerRect && containerRect.width > 0
            ? containerRect.width
            : stage.clientWidth || container.clientWidth || 640;

      var rawHeight =
        stageRect && stageRect.height > 0
          ? stageRect.height
          : containerRect && containerRect.height > 0
            ? containerRect.height
            : stage.clientHeight || container.clientHeight || 360;

      return {
        width: Math.max(320, Math.round(rawWidth || 640)),
        height: Math.max(200, Math.round(rawHeight || 360)),
      };
    }

    function handleRuntimeResize() {
      if (!renderer || !camera) {
        return;
      }

      var nextSize = getRuntimeSize();
      renderer.setSize(nextSize.width, nextSize.height, false);
      camera.aspect = nextSize.width / nextSize.height;
      camera.updateProjectionMatrix();
    }

    function observeResizeTargets() {
      if (typeof ResizeObserver !== "function") {
        return;
      }

      resizeObserver = new ResizeObserver(function () {
        handleRuntimeResize();
      });

      resizeObserverTargets = [];

      function observeTarget(target) {
        if (!target || resizeObserverTargets.indexOf(target) !== -1) {
          return;
        }
        resizeObserver.observe(target);
        resizeObserverTargets.push(target);
      }

      observeTarget(container);
      observeTarget(stage);

      if (payload.surface === "elementor" && typeof container.closest === "function") {
        var elementorWidget =
          container.closest(".elementor-widget-beastside_3d_hero_banner") ||
          container.closest(".elementor-widget");

        if (elementorWidget) {
          observeTarget(elementorWidget);

          var elementorWidgetContainer = elementorWidget.querySelector(".elementor-widget-container");
          if (elementorWidgetContainer) {
            observeTarget(elementorWidgetContainer);
          }
        }
      }
    }

    function disposeRenderer() {
      stopRenderLoop();

      if (resizeHandler) {
        window.removeEventListener("resize", resizeHandler);
        resizeHandler = null;
      }

      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
        resizeObserverTargets = [];
      }

      if (pointerMoveHandler) {
        container.removeEventListener("pointermove", pointerMoveHandler);
        pointerMoveHandler = null;
      }

      if (pointerDownHandler) {
        container.removeEventListener("pointerdown", pointerDownHandler);
        pointerDownHandler = null;
      }

      if (pointerUpHandler) {
        container.removeEventListener("pointerup", pointerUpHandler);
        pointerUpHandler = null;
      }

      if (pointerCancelHandler) {
        container.removeEventListener("pointercancel", pointerCancelHandler);
        container.removeEventListener("lostpointercapture", pointerCancelHandler);
        pointerCancelHandler = null;
      }

      if (pointerEnterHandler) {
        container.removeEventListener("pointerenter", pointerEnterHandler);
        pointerEnterHandler = null;
      }

      if (pointerLeaveHandler) {
        container.removeEventListener("pointerleave", pointerLeaveHandler);
        pointerLeaveHandler = null;
      }

      if (editorBridgeHandler) {
        window.removeEventListener("bs3d:editor-bridge", editorBridgeHandler);
        editorBridgeHandler = null;
      }

      stopEditorDrag();

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
      helperGroup = null;
      helperPickTargets = [];
      helperPointLights = [];
      ambientHelper = null;
      cameraHelper = null;
      raycaster = null;
      ambientLight = null;
      directionalLight = null;
      runtimePointLights = [];
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

    function ensureVector3(THREE, value, fallback) {
      return new THREE.Vector3(
        getNumber(value && value.x, fallback.x),
        getNumber(value && value.y, fallback.y),
        getNumber(value && value.z, fallback.z)
      );
    }

    function buildCameraFrameHelper(THREE) {
      var frameGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-0.75, 0.42, 0),
        new THREE.Vector3(0.75, 0.42, 0),
        new THREE.Vector3(0.75, -0.42, 0),
        new THREE.Vector3(-0.75, -0.42, 0),
      ]);
      var frameMaterial = new THREE.LineBasicMaterial({
        color: 0xc9e7ff,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      });
      var frame = new THREE.LineLoop(frameGeometry, frameMaterial);

      var pickMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 20, 20),
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.24,
          depthWrite: false,
        })
      );
      pickMesh.position.set(0, 0, 0.08);
      pickMesh.userData.helperType = "camera";

      var group = new THREE.Group();
      group.add(frame);
      group.add(pickMesh);
      group.userData.helperType = "camera";

      return {
        group: group,
        frame: frame,
        pick: pickMesh,
      };
    }

    function createPointLightHelper(THREE, index) {
      var group = new THREE.Group();

      var ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.24, 0.016, 10, 30),
        new THREE.MeshBasicMaterial({
          color: 0xffb58a,
          transparent: true,
          opacity: 0.6,
          depthWrite: false,
        })
      );
      ring.rotation.x = Math.PI / 2;
      group.add(ring);

      var sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 20, 20),
        new THREE.MeshBasicMaterial({
          color: 0xffcda5,
          transparent: true,
          opacity: 0.26,
          depthWrite: false,
        })
      );
      sphere.userData.helperType = "pointLight";
      sphere.userData.lightIndex = index;
      group.add(sphere);

      group.userData.helperType = "pointLight";
      group.userData.lightIndex = index;

      return {
        group: group,
        ring: ring,
        pick: sphere,
      };
    }

    function createAmbientHelper(THREE) {
      var helper = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 20, 20),
        new THREE.MeshBasicMaterial({
          color: 0xffdc9c,
          transparent: true,
          opacity: 0.22,
          depthWrite: false,
        })
      );
      helper.userData.helperType = "ambient";
      return helper;
    }

    function syncHelperStyles() {
      if (!editorState.active) {
        return;
      }

      var activeMode = editorState.mode;
      var activePointIndex = -1;
      if (activeMode.indexOf("pointLight") === 0) {
        activePointIndex = Number(activeMode.replace("pointLight", "")) - 1;
      }

      if (cameraHelper && cameraHelper.frame && cameraHelper.frame.material) {
        cameraHelper.frame.material.color.set(activeMode === "camera" ? 0x8ce8ff : 0xc9e7ff);
      }

      helperPointLights.forEach(function (entry, index) {
        if (!entry || !entry.ring || !entry.ring.material) {
          return;
        }
        entry.ring.material.color.set(activePointIndex === index ? 0x99f6d5 : 0xffb58a);
      });
    }

    function createEditorHelpers(THREE) {
      if (!editorState.active || !scene) {
        return;
      }

      helperGroup = new THREE.Group();
      helperGroup.name = "bs3d-editor-helpers";
      helperPickTargets = [];
      helperPointLights = [];

      ambientHelper = createAmbientHelper(THREE);
      helperGroup.add(ambientHelper);

      cameraHelper = buildCameraFrameHelper(THREE);
      helperGroup.add(cameraHelper.group);
      helperPickTargets.push(cameraHelper.pick);

      runtimePointLights.forEach(function (_, index) {
        var helper = createPointLightHelper(THREE, index);
        helperPointLights.push(helper);
        helperGroup.add(helper.group);
        helperPickTargets.push(helper.pick);
      });

      scene.add(helperGroup);
      syncEditorHelpers(THREE);
      syncHelperStyles();
    }

    function syncEditorHelpers(THREE) {
      if (!editorState.active) {
        return;
      }

      var cameraPosition = ensureVector3(
        THREE,
        sceneConfig.camera && sceneConfig.camera.position,
        { x: 0, y: 0, z: 5 }
      );
      if (cameraHelper && cameraHelper.group) {
        cameraHelper.group.position.copy(cameraPosition);
        cameraHelper.group.lookAt(new THREE.Vector3(0, 0, 0));
      }

      if (ambientHelper) {
        var ambientVisible = !!(sceneConfig.lighting && sceneConfig.lighting.ambientEnabled !== false);
        ambientHelper.visible = ambientVisible;
        ambientHelper.position.set(0, 1.35, 0);
      }

      var pointLights = (sceneConfig.lighting && sceneConfig.lighting.pointLights) || [];
      helperPointLights.forEach(function (helper, index) {
        var lightConfig = pointLights[index] || {};
        var position = ensureVector3(THREE, lightConfig.position, { x: 0, y: 3, z: 3 });
        helper.group.position.copy(position);
        helper.group.visible = !!lightConfig.enabled;
        var color = lightConfig.color || "#ffd2ad";
        try {
          helper.ring.material.color.set(color);
          helper.pick.material.color.set(color);
        } catch (error) {
          helper.ring.material.color.set(0xffb58a);
          helper.pick.material.color.set(0xffcda5);
        }
      });
    }

    function defaultPointLightConfig(index) {
      if (index === 1) {
        return {
          enabled: false,
          color: "#f7b3ff",
          intensity: 2.2,
          distance: 20,
          decay: 2,
          position: { x: 0, y: 3, z: 2 },
        };
      }

      if (index === 2) {
        return {
          enabled: false,
          color: "#a8e6ff",
          intensity: 2.2,
          distance: 20,
          decay: 2,
          position: { x: 2, y: 3, z: 3 },
        };
      }

      return {
        enabled: false,
        color: "#ffd2ad",
        intensity: 2.5,
        distance: 20,
        decay: 2,
        position: { x: -2, y: 3, z: 3 },
      };
    }

    function ensureScenePointLights() {
      if (!sceneConfig.lighting || typeof sceneConfig.lighting !== "object") {
        sceneConfig.lighting = {};
      }

      if (!Array.isArray(sceneConfig.lighting.pointLights)) {
        sceneConfig.lighting.pointLights = [];
      }

      for (var index = 0; index < 3; index += 1) {
        var fallback = defaultPointLightConfig(index);
        var entry = sceneConfig.lighting.pointLights[index];
        if (!entry || typeof entry !== "object") {
          sceneConfig.lighting.pointLights[index] = fallback;
          continue;
        }

        sceneConfig.lighting.pointLights[index] = {
          enabled: entry.enabled === true || entry.enabled === 1 || entry.enabled === "1" || entry.enabled === "true",
          color: typeof entry.color === "string" && entry.color ? entry.color : fallback.color,
          intensity: clamp(getNumber(entry.intensity, fallback.intensity), 0, 20),
          distance: clamp(getNumber(entry.distance, fallback.distance), 0, 200),
          decay: clamp(getNumber(entry.decay, fallback.decay), 0, 4),
          position: {
            x: getNumber(entry.position && entry.position.x, fallback.position.x),
            y: getNumber(entry.position && entry.position.y, fallback.position.y),
            z: getNumber(entry.position && entry.position.z, fallback.position.z),
          },
        };
      }

      sceneConfig.lighting.pointLights = sceneConfig.lighting.pointLights.slice(0, 3);
      return sceneConfig.lighting.pointLights;
    }

    function syncCameraFromScene() {
      if (!camera) {
        return;
      }

      var cameraPosition = sceneConfig.camera && sceneConfig.camera.position ? sceneConfig.camera.position : {};
      camera.position.set(
        getNumber(cameraPosition.x, 0),
        getNumber(cameraPosition.y, 0),
        getNumber(cameraPosition.z, 5)
      );
      camera.lookAt(0, 0, 0);
    }

    function updateRuntimeLighting(THREE) {
      if (!scene || !THREE) {
        return;
      }

      var lighting = sceneConfig.lighting || {};
      if (ambientLight) {
        ambientLight.intensity =
          lighting.ambientEnabled === false
            ? 0
            : clamp(getNumber(lighting.ambientIntensity, 0.8), 0, 8);
      }

      if (directionalLight) {
        var directionalPos = lighting.directionalPosition || {};
        directionalLight.intensity = clamp(getNumber(lighting.directionalIntensity, 1.15), 0, 12);
        directionalLight.position.set(
          getNumber(directionalPos.x, 5),
          getNumber(directionalPos.y, 10),
          getNumber(directionalPos.z, 7)
        );
        directionalLight.castShadow = !!lighting.shadows;
      }

      var pointLights = ensureScenePointLights();
      runtimePointLights.forEach(function (entry, index) {
        if (!entry || !entry.light) {
          return;
        }

        var fallback = defaultPointLightConfig(index);
        var lightConfig = pointLights[index] || fallback;

        try {
          entry.light.color.set(lightConfig.color || fallback.color);
        } catch (error) {
          entry.light.color.set(fallback.color);
        }

        entry.light.intensity = clamp(getNumber(lightConfig.intensity, fallback.intensity), 0, 20);
        entry.light.distance = clamp(getNumber(lightConfig.distance, fallback.distance), 0, 200);
        entry.light.decay = clamp(getNumber(lightConfig.decay, fallback.decay), 0, 4);
        entry.light.position.set(
          getNumber(lightConfig.position && lightConfig.position.x, fallback.position.x),
          getNumber(lightConfig.position && lightConfig.position.y, fallback.position.y),
          getNumber(lightConfig.position && lightConfig.position.z, fallback.position.z)
        );
        entry.light.visible = !!lightConfig.enabled;
        entry.light.castShadow = !!lighting.shadows;
      });

      syncEditorHelpers(THREE);
      syncHelperStyles();
    }

    function getModeTarget() {
      if (!editorState.active || editorState.mode === "none") {
        return null;
      }

      if (editorState.mode === "camera") {
        return { type: "camera", index: -1 };
      }

      if (editorState.mode.indexOf("pointLight") === 0) {
        var pointIndex = Number(editorState.mode.replace("pointLight", "")) - 1;
        if (Number.isFinite(pointIndex) && pointIndex >= 0 && pointIndex < 3) {
          return { type: "pointLight", index: pointIndex };
        }
      }

      return null;
    }

    function sameTarget(a, b) {
      return !!a && !!b && a.type === b.type && a.index === b.index;
    }

    function getTargetPositionVector(THREE, target) {
      if (!target) {
        return null;
      }

      if (target.type === "camera") {
        return ensureVector3(THREE, sceneConfig.camera && sceneConfig.camera.position, { x: 0, y: 0, z: 5 });
      }

      var pointLights = ensureScenePointLights();
      if (target.type === "pointLight" && pointLights[target.index]) {
        return ensureVector3(THREE, pointLights[target.index].position, defaultPointLightConfig(target.index).position);
      }

      return null;
    }

    function setTargetPosition(target, vector) {
      if (!target || !vector) {
        return;
      }

      if (target.type === "camera") {
        if (!sceneConfig.camera || typeof sceneConfig.camera !== "object") {
          sceneConfig.camera = {};
        }
        sceneConfig.camera.position = {
          x: getNumber(vector.x, 0),
          y: getNumber(vector.y, 0),
          z: getNumber(vector.z, 5),
        };
        return;
      }

      var pointLights = ensureScenePointLights();
      if (target.type === "pointLight" && pointLights[target.index]) {
        pointLights[target.index].position = {
          x: getNumber(vector.x, 0),
          y: getNumber(vector.y, 3),
          z: getNumber(vector.z, 3),
        };
      }
    }

    function targetToName(target) {
      if (!target) {
        return "";
      }
      if (target.type === "camera") {
        return "camera";
      }
      return "pointLight" + String(target.index + 1);
    }

    function pointerToNdc(event) {
      if (!container || typeof container.getBoundingClientRect !== "function") {
        return null;
      }
      var rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return null;
      }

      var x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      var y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
      return { x: x, y: y };
    }

    function resolvePickedTarget(event) {
      if (!raycaster || !camera || !helperPickTargets.length) {
        return null;
      }

      var ndc = pointerToNdc(event);
      if (!ndc) {
        return null;
      }

      raycaster.setFromCamera(ndc, camera);
      var intersections = raycaster.intersectObjects(helperPickTargets, false);
      if (!intersections.length) {
        return null;
      }

      var picked = intersections[0].object;
      if (!picked || !picked.userData) {
        return null;
      }

      if (picked.userData.helperType === "camera") {
        return { type: "camera", index: -1 };
      }

      if (picked.userData.helperType === "pointLight") {
        var lightIndex = Number(picked.userData.lightIndex);
        if (Number.isFinite(lightIndex) && lightIndex >= 0 && lightIndex < 3) {
          return { type: "pointLight", index: lightIndex };
        }
      }

      return null;
    }

    function planeNormalForMode(THREE) {
      if (editorState.plane === "xz") {
        return new THREE.Vector3(0, 1, 0);
      }
      if (editorState.plane === "yz") {
        return new THREE.Vector3(1, 0, 0);
      }
      return new THREE.Vector3(0, 0, 1);
    }

    function stopEditorDrag() {
      editorState.dragging = false;
      editorState.draggedType = "";
      editorState.draggedIndex = -1;
      editorState.pointerId = null;
      editorState.dragOffset = null;
      editorState.dragPlane = null;
    }

    function startEditorDrag(THREE, event) {
      if (!editorState.active || !isEditModeActive() || !raycaster || !camera) {
        return false;
      }

      var modeTarget = getModeTarget();
      if (!modeTarget) {
        return false;
      }

      var pickedTarget = resolvePickedTarget(event);
      if (!sameTarget(modeTarget, pickedTarget)) {
        return false;
      }

      var targetPosition = getTargetPositionVector(THREE, modeTarget);
      if (!targetPosition) {
        return false;
      }

      var ndc = pointerToNdc(event);
      if (!ndc) {
        return false;
      }

      var dragPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
        planeNormalForMode(THREE),
        targetPosition
      );
      var intersection = new THREE.Vector3();
      raycaster.setFromCamera(ndc, camera);
      if (!raycaster.ray.intersectPlane(dragPlane, intersection)) {
        return false;
      }

      editorState.dragging = true;
      editorState.draggedType = modeTarget.type;
      editorState.draggedIndex = modeTarget.index;
      editorState.pointerId = typeof event.pointerId === "number" ? event.pointerId : null;
      editorState.dragOffset = targetPosition.clone().sub(intersection);
      editorState.dragPlane = dragPlane;

      if (typeof container.setPointerCapture === "function" && typeof event.pointerId === "number") {
        try {
          container.setPointerCapture(event.pointerId);
        } catch (error) {
          // Ignore capture failures.
        }
      }

      event.preventDefault();
      return true;
    }

    function updateEditorDrag(THREE, event) {
      if (!editorState.active || !editorState.dragging || !editorState.dragPlane || !raycaster || !camera) {
        return false;
      }

      if (
        editorState.pointerId !== null &&
        typeof event.pointerId === "number" &&
        event.pointerId !== editorState.pointerId
      ) {
        return false;
      }

      var ndc = pointerToNdc(event);
      if (!ndc) {
        return false;
      }

      var intersection = new THREE.Vector3();
      raycaster.setFromCamera(ndc, camera);
      if (!raycaster.ray.intersectPlane(editorState.dragPlane, intersection)) {
        return false;
      }

      if (editorState.dragOffset) {
        intersection.add(editorState.dragOffset);
      }

      var activeTarget = {
        type: editorState.draggedType,
        index: editorState.draggedIndex,
      };
      setTargetPosition(activeTarget, intersection);
      syncCameraFromScene();
      updateRuntimeLighting(THREE);

      dispatchEditorHelperUpdate(targetToName(activeTarget), activeTarget.index, intersection);
      event.preventDefault();
      return true;
    }

    function setupScene() {
      var THREE = window.THREE;
      if (!THREE || !THREE.Scene || !THREE.WebGLRenderer) {
        return false;
      }

      var initialSize = getRuntimeSize();
      var width = initialSize.width;
      var height = initialSize.height;
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
      var cameraLens = getNearestLensMm(cameraConfig.lensMm);
      var cameraFov = lensToVerticalFov(cameraLens);

      camera = new THREE.PerspectiveCamera(
        cameraFov,
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
      ambientLight = new THREE.AmbientLight(0xffffff, 0);
      scene.add(ambientLight);

      directionalLight = new THREE.DirectionalLight(0xffffff, 0);
      scene.add(directionalLight);

      runtimePointLights = [];
      var pointLights = ensureScenePointLights();
      raycaster = new THREE.Raycaster();

      pointLights.forEach(function (pointLightConfig, index) {
        var entry = pointLightConfig && typeof pointLightConfig === "object" ? pointLightConfig : {};
        var fallbackLight = defaultPointLightConfig(index);
        var colorValue = entry.color || fallbackLight.color;
        var pointLight = new THREE.PointLight(
          colorValue,
          clamp(getNumber(entry.intensity, fallbackLight.intensity), 0, 20),
          clamp(getNumber(entry.distance, fallbackLight.distance), 0, 200),
          clamp(getNumber(entry.decay, fallbackLight.decay), 0, 4)
        );
        var lightPosition = entry.position || {};
        pointLight.position.set(
          getNumber(lightPosition.x, fallbackLight.position.x),
          getNumber(lightPosition.y, fallbackLight.position.y),
          getNumber(lightPosition.z, fallbackLight.position.z)
        );
        pointLight.visible = !!entry.enabled;
        pointLight.castShadow = !!lighting.shadows;
        scene.add(pointLight);

        runtimePointLights.push({
          light: pointLight,
          index: index,
        });
      });

      readEditorStateFromContainer();
      updateRuntimeLighting(THREE);
      createEditorHelpers(THREE);

      editorBridgeHandler = function (event) {
        var detail = event && event.detail ? event.detail : null;
        if (!detail || detail.container !== container) {
          return;
        }

        updateEditorState(detail.editMode, detail.dragPlane);
        syncHelperStyles();
      };
      window.addEventListener("bs3d:editor-bridge", editorBridgeHandler);

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
        handleRuntimeResize();
      };
      window.addEventListener("resize", resizeHandler);
      observeResizeTargets();
      handleRuntimeResize();

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
          var proxyEnabled = canUseModelProxy(payload, index);

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
                "Model #" + (index + 1) + " loaded via model proxy fallback",
                {
                  modelIndex: index + 1,
                  modelUrlOriginal: normalized.modelUrlOriginal || "",
                  modelUrlResolved: normalized.modelUrlResolved || "",
                  normalizationRule: normalized.normalizationRule || "none",
                  hint: "Direct model fetch failed, model proxy fallback succeeded.",
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
                    hint: "Use a modern browser for model proxy fallback support.",
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
                      hint: "Model proxy could not fetch the remote model URL.",
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
                    normalized.modelUrlResolved || normalized.modelUrlOriginal || targetUrl,
                    index
                  );
                  if (proxyRetryUrl) {
                    emitDiagnostic(
                      payload,
                      "warn",
                      "model_proxy_retry",
                      "Retrying model #" + (index + 1) + " through model proxy",
                      {
                        modelIndex: index + 1,
                        modelUrlOriginal: normalized.modelUrlOriginal || "",
                        modelUrlResolved: normalized.modelUrlResolved || "",
                        normalizationRule: normalized.normalizationRule || "none",
                        hint: "Direct fetch failed due to network/CORS; model proxy retry started.",
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
                normalized.modelUrlResolved || normalized.modelUrlOriginal || "",
                index
              );
              if (proxyMixedContentUrl) {
                emitDiagnostic(
                  payload,
                  "warn",
                  "model_proxy_retry",
                  "Retrying mixed-content model #" + (index + 1) + " through model proxy",
                  {
                    modelIndex: index + 1,
                    modelUrlOriginal: normalized.modelUrlOriginal || "",
                    modelUrlResolved: normalized.modelUrlResolved || "",
                    normalizationRule: normalized.normalizationRule || "none",
                    hint: "HTTPS page blocked HTTP model URL; model proxy retry started.",
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

      var THREE = window.THREE;

      pointerEnterHandler = function () {
        if (isEditModeActive()) {
          return;
        }

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
        if (editorState.dragging) {
          stopEditorDrag();
        }

        state.pointerX = 0;
        state.pointerY = 0;
        state.targetRotationX = 0;
        state.targetRotationY = 0;
        state.targetParallaxX = 0;
        state.targetParallaxY = 0;

        if (isEditModeActive()) {
          return;
        }

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
        if (isEditModeActive()) {
          if (THREE && updateEditorDrag(THREE, event)) {
            return;
          }
          return;
        }

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

      pointerDownHandler = function (event) {
        if (!isEditModeActive() || !THREE) {
          return;
        }

        startEditorDrag(THREE, event);
      };

      pointerUpHandler = function (event) {
        if (!editorState.dragging) {
          return;
        }

        if (
          editorState.pointerId !== null &&
          typeof event.pointerId === "number" &&
          event.pointerId !== editorState.pointerId
        ) {
          return;
        }

        if (typeof container.releasePointerCapture === "function" && typeof event.pointerId === "number") {
          try {
            container.releasePointerCapture(event.pointerId);
          } catch (error) {
            // Ignore capture release failures.
          }
        }

        stopEditorDrag();
      };

      pointerCancelHandler = function () {
        stopEditorDrag();
      };

      container.addEventListener("pointerenter", pointerEnterHandler);
      container.addEventListener("pointerleave", pointerLeaveHandler);
      container.addEventListener("pointerdown", pointerDownHandler);
      container.addEventListener("pointerup", pointerUpHandler);
      container.addEventListener("pointercancel", pointerCancelHandler);
      container.addEventListener("lostpointercapture", pointerCancelHandler);
      container.addEventListener("pointermove", pointerMoveHandler);
    }

    function updateInteractions() {
      if (!rootGroup || !camera || deviceScale <= 0) {
        return;
      }

      if (isEditModeActive()) {
        state.targetRotationX = 0;
        state.targetRotationY = 0;
        state.targetParallaxX = 0;
        state.targetParallaxY = 0;

        state.currentRotationX += (0 - state.currentRotationX) * 0.15;
        state.currentRotationY += (0 - state.currentRotationY) * 0.15;
        rootGroup.rotation.x = state.currentRotationX;
        rootGroup.rotation.y = state.currentRotationY;

        syncCameraFromScene();
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
