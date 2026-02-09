(function () {
  "use strict";

  var root = document.getElementById("bs3d-composer-root");
  if (!root) {
    return;
  }

  var hiddenSceneInput = document.getElementById("bs3d_scene_config");
  var previewBanner = root.querySelector(".bs3d-admin-preview-banner");

  function getField(name) {
    var fields = document.getElementsByName(name);
    if (!fields || !fields.length) {
      return null;
    }
    return fields[0];
  }

  function getValue(name, fallback) {
    var field = getField(name);
    if (!field) {
      return fallback;
    }

    return field.value;
  }

  function getNumber(name, fallback) {
    var value = Number(getValue(name, fallback));
    return Number.isFinite(value) ? value : fallback;
  }

  function getBoolean(name, fallback) {
    var field = getField(name);
    if (!field) {
      return !!fallback;
    }

    return !!field.checked;
  }

  function parsePreviewPayload() {
    if (!previewBanner) {
      return {};
    }

    var raw = previewBanner.getAttribute("data-bs3d");
    if (!raw) {
      return {};
    }

    try {
      return JSON.parse(raw);
    } catch (error) {
      return {};
    }
  }

  function collectModels() {
    var models = [];

    for (var i = 0; i < 3; i += 1) {
      var prefix = "bs3d_models[" + i + "]";
      var url = String(getValue(prefix + "[url]", "") || "").trim();
      if (!url) {
        continue;
      }

      models.push({
        url: url,
        position: {
          x: getNumber(prefix + "[position][x]", 0),
          y: getNumber(prefix + "[position][y]", 0),
          z: getNumber(prefix + "[position][z]", 0),
        },
        rotation: {
          x: getNumber(prefix + "[rotation][x]", 0),
          y: getNumber(prefix + "[rotation][y]", 0),
          z: getNumber(prefix + "[rotation][z]", 0),
        },
        scale: {
          x: getNumber(prefix + "[scale][x]", 1),
          y: getNumber(prefix + "[scale][y]", 1),
          z: getNumber(prefix + "[scale][z]", 1),
        },
        visible: getBoolean(prefix + "[visible]", true),
        castShadow: getBoolean(prefix + "[castShadow]", true),
        receiveShadow: getBoolean(prefix + "[receiveShadow]", true),
      });
    }

    return models;
  }

  function collectSceneConfig() {
    return {
      sceneSchemaVersion: 1,
      models: collectModels(),
      background: {
        mode: String(getValue("bs3d_background_mode", "static") || "static"),
        color: String(getValue("bs3d_background_color", "#111827") || "#111827"),
        imageUrl: String(getValue("bs3d_background_image", "") || ""),
        dioramaDepth: getNumber("bs3d_diorama_depth", 8),
      },
      camera: {
        fov: getNumber("bs3d_camera_fov", 45),
        position: {
          x: getNumber("bs3d_camera_x", 0),
          y: getNumber("bs3d_camera_y", 0),
          z: getNumber("bs3d_camera_z", 5),
        },
      },
      lighting: {
        ambientIntensity: getNumber("bs3d_ambient_intensity", 0.8),
        directionalIntensity: getNumber("bs3d_directional_intensity", 1.15),
        directionalPosition: {
          x: getNumber("bs3d_light_x", 5),
          y: getNumber("bs3d_light_y", 10),
          z: getNumber("bs3d_light_z", 7),
        },
        shadows: getBoolean("bs3d_light_shadows", true),
      },
      interactions: {
        tilt: getBoolean("bs3d_interaction_tilt", true),
        rotate: getBoolean("bs3d_interaction_rotate", true),
        parallax: getBoolean("bs3d_interaction_parallax", true),
        tiltIntensity: getNumber("bs3d_tilt_intensity", 0.2),
        scrollCamera: getBoolean("bs3d_interaction_scroll_camera", true),
        scrollIntensity: getNumber("bs3d_scroll_intensity", 0.35),
      },
      fallback: {
        timeoutMs: getNumber("bs3d_fallback_timeout_ms", 12000),
      },
    };
  }

  function updateDioramaVisibility() {
    var modeField = getField("bs3d_background_mode");
    if (!modeField) {
      return;
    }

    var dioramaRows = root.querySelectorAll(".bs3d-diorama-only");
    var isDiorama = modeField.value === "diorama";

    dioramaRows.forEach(function (row) {
      row.style.display = isDiorama ? "" : "none";
    });
  }

  function syncLinkedControls(changedInput) {
    if (!changedInput) {
      return;
    }

    var syncKey = changedInput.getAttribute("data-bs3d-sync");
    if (!syncKey) {
      return;
    }

    var linked = root.querySelectorAll('[data-bs3d-sync="' + syncKey + '"]');
    linked.forEach(function (field) {
      if (field !== changedInput) {
        field.value = changedInput.value;
      }
    });
  }

  function updatePosterImage() {
    if (!previewBanner) {
      return;
    }

    var posterUrl = String(getValue("bs3d_poster_url", "") || "").trim();
    var poster = previewBanner.querySelector(".bs3d-poster");

    if (!posterUrl) {
      if (poster) {
        poster.removeAttribute("src");
        poster.style.display = "none";
      }
      return;
    }

    if (!poster) {
      poster = document.createElement("img");
      poster.className = "bs3d-poster";
      poster.alt = "";
      poster.loading = "lazy";
      previewBanner.appendChild(poster);
    }

    poster.src = posterUrl;
    poster.style.display = "none";
  }

  function updateHiddenScene(sceneConfig) {
    if (!hiddenSceneInput) {
      return;
    }

    hiddenSceneInput.value = JSON.stringify(sceneConfig);
  }

  function updatePreviewPayload(sceneConfig) {
    if (!previewBanner) {
      return;
    }

    var payload = parsePreviewPayload();
    payload.scene = sceneConfig;
    payload.surface = "admin-preview";
    payload.lazy = false;
    payload.posterUrl = String(getValue("bs3d_poster_url", "") || "");
    payload.qualityProfile = String(getValue("bs3d_quality_profile", "balanced") || "balanced");
    payload.mobileMode = String(getValue("bs3d_mobile_mode", "adaptive") || "adaptive");
    payload.effectiveDebug = true;
    payload.overlayEnabled = true;

    previewBanner.setAttribute("data-bs3d", JSON.stringify(payload));
    updatePosterImage();

    if (window.BS3DFrontend && typeof window.BS3DFrontend.bootstrapBanner === "function") {
      window.BS3DFrontend.bootstrapBanner(previewBanner);
    } else {
      window.dispatchEvent(
        new CustomEvent("bs3d:refresh", {
          detail: {
            container: previewBanner,
          },
        })
      );
    }
  }

  var refreshTimer = 0;
  function scheduleRefresh() {
    if (refreshTimer) {
      clearTimeout(refreshTimer);
    }

    refreshTimer = window.setTimeout(function () {
      var sceneConfig = collectSceneConfig();
      updateHiddenScene(sceneConfig);
      updatePreviewPayload(sceneConfig);
      updateDioramaVisibility();
    }, 130);
  }

  function bindMediaButtons() {
    if (typeof window.wp === "undefined" || !window.wp.media) {
      return;
    }

    var buttons = root.querySelectorAll(".bs3d-media-button[data-target]");
    buttons.forEach(function (button) {
      button.addEventListener("click", function (event) {
        event.preventDefault();

        var targetName = button.getAttribute("data-target");
        var libraryType = button.getAttribute("data-library") || "";

        var frame = window.wp.media({
          title: button.getAttribute("data-title") || "Select asset",
          button: {
            text: button.getAttribute("data-button") || "Use this asset",
          },
          multiple: false,
          library: libraryType ? { type: libraryType } : {},
        });

        frame.on("select", function () {
          var selection = frame.state().get("selection").first();
          if (!selection) {
            return;
          }

          var json = selection.toJSON();
          var targetField = getField(targetName);
          if (!targetField) {
            return;
          }

          targetField.value = json.url || "";
          targetField.dispatchEvent(new Event("input", { bubbles: true }));
          targetField.dispatchEvent(new Event("change", { bubbles: true }));
        });

        frame.open();
      });
    });
  }

  function bindInputListeners() {
    var fields = root.querySelectorAll("input, select, textarea");
    fields.forEach(function (field) {
      field.addEventListener("input", function () {
        syncLinkedControls(field);
        scheduleRefresh();
      });

      field.addEventListener("change", function () {
        syncLinkedControls(field);
        scheduleRefresh();
      });
    });
  }

  function init() {
    bindInputListeners();
    bindMediaButtons();
    updateDioramaVisibility();

    var sceneConfig = collectSceneConfig();
    updateHiddenScene(sceneConfig);
    updatePreviewPayload(sceneConfig);
  }

  init();
})();
