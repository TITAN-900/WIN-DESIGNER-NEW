/* About-only progressive enhancement. Three.js is local and loaded on approach. */
(() => {
  "use strict";

  const root = document.querySelector("#studio [data-sculpture]");
  if (!root) return;

  const stage = root.querySelector("[data-sculpture-stage]");
  const canvas = root.querySelector("[data-sculpture-canvas]");
  const fallback = root.querySelector(".sculpture-fallback");
  const controls = root.querySelector("[data-sculpture-controls]");
  const instructions = root.querySelector("[data-sculpture-instructions]");
  const status = root.querySelector("[data-sculpture-status]");
  const pauseButton = root.querySelector("[data-sculpture-pause]");
  const resetButton = root.querySelector("[data-sculpture-reset]");
  const retryButton = root.querySelector("[data-sculpture-retry]");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const coarsePointer = matchMedia("(pointer: coarse)");
  const lifetime = new AbortController();
  const listenerOptions = { signal: lifetime.signal };
  const keys = new Set();
  const spring = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0 };
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  let view;
  let loading = false;
  let destroyed = false;
  let visible = false;
  let paused = reducedMotion.matches;
  let pointer = null;
  let frame = 0;
  let lastTime = 0;
  let lastDraw = 0;
  let idleTime = 0;
  let yaw = 0;
  let appliedX = NaN;
  let appliedY = NaN;
  let needsRender = true;
  let contextLost = false;

  function updateInstructions() {
    instructions.textContent = coarsePointer.matches
      ? "Drag sideways to bend. Scroll vertically to explore."
      : "Drag to bend & twist. Release to settle.";
    canvas.setAttribute("aria-description", "Hold arrow keys to bend or twist. Release to return. Press Escape to reset. Vertical touch gestures scroll the page.");
    pauseButton.disabled = reducedMotion.matches;
    pauseButton.textContent = reducedMotion.matches ? "Motion reduced" : paused ? "Resume motion" : "Pause motion";
    pauseButton.setAttribute("aria-pressed", String(paused));
  }

  function announce(message) {
    status.textContent = message;
  }

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
    lastDraw = 0;
  }

  function wake() {
    if (!frame && view && visible && !document.hidden && !contextLost && !destroyed) {
      frame = requestAnimationFrame(tick);
    }
  }

  function resetSpring() {
    spring.x = spring.y = spring.vx = spring.vy = spring.tx = spring.ty = 0;
    needsRender = true;
  }

  function releasePointer() {
    if (pointer && canvas.hasPointerCapture(pointer.id)) canvas.releasePointerCapture(pointer.id);
    pointer = null;
    canvas.classList.remove("is-dragging");
  }

  function releaseInput(instant = false) {
    // Clear ownership before releasePointerCapture dispatches lostpointercapture.
    const activePointer = pointer;
    pointer = null;
    if (activePointer && canvas.hasPointerCapture(activePointer.id)) canvas.releasePointerCapture(activePointer.id);
    canvas.classList.remove("is-dragging");
    keys.clear();
    spring.tx = spring.ty = 0;
    if (instant || reducedMotion.matches) resetSpring();
    wake();
  }

  function setTarget(x, y) {
    spring.tx = clamp(x, -1, 1);
    spring.ty = clamp(y, -1, 1);
    if (reducedMotion.matches) {
      spring.x = spring.tx;
      spring.y = spring.ty;
      spring.vx = spring.vy = 0;
    }
    needsRender = true;
    wake();
  }

  function advanceSpring(dt) {
    // Small fixed substeps keep the damped spring stable after slow frames.
    const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
    const step = dt / steps;
    for (let i = 0; i < steps; i++) {
      for (const [position, velocity, target] of [["x", "vx", "tx"], ["y", "vy", "ty"]]) {
        spring[velocity] += ((spring[target] - spring[position]) * 105 - spring[velocity] * 17) * step;
        spring[position] = clamp(spring[position] + spring[velocity] * step, -1.03, 1.03);
        if (Math.abs(spring[target] - spring[position]) < 0.0002 && Math.abs(spring[velocity]) < 0.001) {
          spring[position] = spring[target];
          spring[velocity] = 0;
        }
      }
    }
  }

  function tick(time) {
    frame = 0;
    if (!view || !visible || document.hidden || contextLost || destroyed) return;
    const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 1 / 60;
    lastTime = time;
    if (!reducedMotion.matches) advanceSpring(dt);

    const resting = !pointer && keys.size === 0 && spring.x === 0 && spring.y === 0;
    const idle = !paused && !reducedMotion.matches && resting;
    if (idle) {
      idleTime += dt;
      yaw = Math.sin(idleTime * 0.14) * 0.105;
    }

    // A paused/resting scene has no persistent requestAnimationFrame loop.
    const moving = idle || spring.vx !== 0 || spring.vy !== 0 || spring.x !== spring.tx || spring.y !== spring.ty;
    const geometryChanged = spring.x !== appliedX || spring.y !== appliedY;
    const interval = coarsePointer.matches ? 1000 / 30 : 1000 / 60;
    if (needsRender || !moving || time - lastDraw >= interval - 1) {
      if (geometryChanged) {
        view.sculpture.deform(spring.x, spring.y);
        appliedX = spring.x;
        appliedY = spring.y;
      }
      view.sculpture.group.rotation.y = -0.14 + yaw + spring.x * 0.045;
      view.renderer.render(view.scene, view.camera);
      needsRender = false;
      lastDraw = time;
    }
    if (moving || needsRender) wake();
    else lastTime = 0;
  }

  function resize() {
    if (!view) return;
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    if (!width || !height) return;
    const aspect = width / height;
    const halfHeight = Math.max(2.55, 2.6 / aspect);
    const { camera, renderer } = view;
    camera.left = -halfHeight * aspect;
    camera.right = halfHeight * aspect;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, coarsePointer.matches ? 1.5 : 1.75));
    renderer.setSize(width, height, false);
    needsRender = true;
    wake();
  }

  function showFallback(message) {
    canvas.hidden = true;
    fallback.hidden = false;
    controls.hidden = true;
    retryButton.hidden = false;
    root.dataset.sculptureState = "fallback";
    instructions.textContent = message;
    announce(message);
  }

  async function init() {
    if (loading || view || destroyed) return;
    loading = true;
    retryButton.hidden = true;
    root.dataset.sculptureState = "loading";
    instructions.textContent = "Preparing the form…";
    let renderer;
    let wood;
    let sculpture;
    let floor;
    try {
      const [THREE, geometryModule] = await Promise.all([
        import("./vendor/three.module.min.js"),
        import("./studio-sculpture-geometry.js")
      ]);
      if (destroyed) return;
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.3;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.VSMShadowMap;

      // Reuse the site's actual walnut photograph. No runtime CDN or model request.
      wood = await new THREE.TextureLoader().loadAsync("american-walnut.jpg.jpeg");
      wood.colorSpace = THREE.SRGBColorSpace;
      wood.wrapS = wood.wrapT = THREE.RepeatWrapping;
      wood.center.set(0.5, 0.5);
      wood.rotation = Math.PI / 2;
      wood.repeat.set(1.6, 0.26);
      wood.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      if (destroyed) {
        wood.dispose();
        renderer.dispose();
        return;
      }

      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-3, 3, 2.55, -2.55, 0.1, 40);
      camera.position.set(4.7, 3.8, 7.5);
      camera.lookAt(0, 1.3, 0);
      scene.add(new THREE.HemisphereLight(0xfffaf1, 0xb4ada2, 2.5));

      const key = new THREE.DirectionalLight(0xfff9f0, 3);
      key.position.set(-2.4, 10, 3);
      key.target.position.set(0, 1.25, 0);
      key.castShadow = true;
      key.shadow.mapSize.setScalar(1024);
      key.shadow.radius = 4;
      key.shadow.blurSamples = 8;
      Object.assign(key.shadow.camera, { left: -4.5, right: 4.5, top: 4.5, bottom: -4.5, near: 0.5, far: 20 });
      key.shadow.normalBias = 0.018;
      key.shadow.bias = -0.0002;
      scene.add(key, key.target);
      const fill = new THREE.DirectionalLight(0xf4eee7, 1.4);
      fill.position.set(4, 3, -4);
      scene.add(fill);

      sculpture = geometryModule.createSculpture(THREE, wood);
      scene.add(sculpture.group);
      floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ color: 0x573b28, opacity: 0.17 }));
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -0.012;
      floor.receiveShadow = true;
      scene.add(floor);
      view = { renderer, scene, camera, sculpture, wood, floor, key };

      // A GPU context can be lost while the asynchronous texture is loading.
      // Keep the photograph visible until the browser restores that context.
      if (contextLost) {
        showFallback("3D is temporarily unavailable. Our workshop is shown instead.");
        return;
      }
      canvas.hidden = false;
      fallback.hidden = true;
      controls.hidden = false;
      root.dataset.sculptureState = "ready";
      updateInstructions();
      resize();
      announce("Interactive wooden sculpture ready. Drag or hold arrow keys to bend. Release to return to its original form.");
      wake();
    } catch (error) {
      sculpture?.dispose();
      wood?.dispose();
      floor?.geometry.dispose();
      floor?.material.dispose();
      renderer?.dispose();
      view = undefined;
      showFallback("3D is unavailable. Our workshop is shown instead.");
      console.warn("WIN DESIGN studio sculpture could not start:", error);
    } finally {
      loading = false;
    }
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (!view || contextLost || pointer || event.button !== 0 || !event.isPrimary) return;
    keys.clear();
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, touch: event.pointerType === "touch", startX: spring.x, startY: spring.y };
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add("is-dragging");
    canvas.focus({ preventScroll: true });
    // Native pan-y/pinch-zoom remains available for touch input.
    if (event.pointerType !== "touch") event.preventDefault();
  }, listenerOptions);

  canvas.addEventListener("pointermove", (event) => {
    if (!pointer || event.pointerId !== pointer.id) return;
    const distance = Math.max(140, stage.clientWidth * 0.36);
    const x = pointer.startX + (event.clientX - pointer.x) / distance;
    const y = pointer.touch ? pointer.startY : pointer.startY - (event.clientY - pointer.y) / distance;
    setTarget(x, y);
  }, listenerOptions);

  for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
    canvas.addEventListener(type, (event) => {
      if (pointer?.id === event.pointerId) releaseInput();
    }, listenerOptions);
  }

  function keyboardTarget() {
    setTarget((Number(keys.has("ArrowRight")) - Number(keys.has("ArrowLeft"))) * 0.85,
      (Number(keys.has("ArrowUp")) - Number(keys.has("ArrowDown"))) * 0.85);
  }

  canvas.addEventListener("keydown", (event) => {
    if (event.key === "Escape" || event.key === "Home") {
      event.preventDefault();
      reset();
    } else if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      releasePointer();
      keys.add(event.key);
      keyboardTarget();
    }
  }, listenerOptions);
  canvas.addEventListener("keyup", (event) => {
    if (!keys.has(event.key)) return;
    event.preventDefault();
    keys.delete(event.key);
    keyboardTarget();
  }, listenerOptions);
  canvas.addEventListener("blur", () => releaseInput(), listenerOptions);
  window.addEventListener("blur", () => releaseInput(true), listenerOptions);

  function reset() {
    releaseInput(true);
    idleTime = yaw = 0;
    wake();
    announce("Original form restored.");
  }

  resetButton.addEventListener("click", reset, listenerOptions);
  pauseButton.addEventListener("click", () => {
    paused = !paused;
    updateInstructions();
    needsRender = true;
    wake();
    announce(paused ? "Automatic motion paused. Drag and keyboard controls remain available." : reducedMotion.matches ? "Reduced motion is enabled on your device. Automatic motion remains off." : "Automatic motion resumed.");
  }, listenerOptions);
  retryButton.addEventListener("click", () => {
    if (contextLost) {
      announce("The graphics context is still unavailable. Reload the page to try again.");
      instructions.textContent = "Please reload the page to restore 3D.";
    } else init();
  }, listenerOptions);

  reducedMotion.addEventListener("change", () => {
    paused = reducedMotion.matches;
    reset();
    if (view) updateInstructions();
  }, listenerOptions);
  coarsePointer.addEventListener("change", () => {
    if (view) updateInstructions();
    resize();
  }, listenerOptions);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      releaseInput(true);
      stop();
    } else {
      needsRender = true;
      wake();
    }
  }, listenerOptions);

  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    contextLost = true;
    releaseInput(true);
    stop();
    showFallback("3D is temporarily unavailable. Our workshop is shown instead.");
  }, listenerOptions);
  canvas.addEventListener("webglcontextrestored", () => {
    contextLost = false;
    if (!view) return;
    canvas.hidden = false;
    fallback.hidden = true;
    controls.hidden = false;
    retryButton.hidden = true;
    root.dataset.sculptureState = "ready";
    updateInstructions();
    needsRender = true;
    resize();
    announce("The interactive sculpture is available again.");
  }, listenerOptions);

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(stage);
  let approachObserver;
  let visibilityObserver;
  if ("IntersectionObserver" in window) {
    approachObserver = new IntersectionObserver((entries, observer) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      init();
    }, { rootMargin: "450px" });
    approachObserver.observe(stage);
    visibilityObserver = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      if (visible) {
        needsRender = true;
        wake();
      } else {
        releaseInput(true);
        stop();
      }
    });
    visibilityObserver.observe(stage);
  } else {
    visible = true;
    init();
  }

  window.addEventListener("pagehide", (event) => {
    releaseInput(true);
    stop();
    if (event.persisted) return;
    destroyed = true;
    approachObserver?.disconnect();
    visibilityObserver?.disconnect();
    resizeObserver.disconnect();
    lifetime.abort();
    if (view) {
      view.sculpture.dispose();
      view.wood.dispose();
      view.floor.geometry.dispose();
      view.floor.material.dispose();
      view.key.shadow.map?.dispose();
      view.renderer.dispose();
      view = undefined;
    }
  }, listenerOptions);
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      needsRender = true;
      wake();
    }
  }, listenerOptions);
})();
