/* About-only progressive enhancement. Three.js is local and loaded on approach. */
(() => {
  "use strict";

  const root = document.querySelector("#studio [data-sculpture]");
  if (!root) return;
  const moduleBase = document.currentScript?.src
    ? new URL(".", document.currentScript.src)
    : new URL("assets/js/", document.baseURI);

  const storySection = document.querySelector("#studio[data-story-section]");
  const storyTrack = storySection?.querySelector("[data-story-track]");
  const storySteps = storySection ? Array.from(storySection.querySelectorAll("[data-story-step]")) : [];
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
  // Start as visible so the first render cannot be lost between the async
  // module load and the visibility observer's first callback.
  let visible = true;
  let paused = reducedMotion.matches;
  let pointer = null;
  let frame = 0;
  let lastTime = 0;
  let lastDraw = 0;
  let idleTime = 0;
  let yaw = 0;
  let storyProgress = 0;
  let wheelTarget = 0;
  let wheelEngaged = false;
  let scrollLocked = false;
  let lockedScrollY = 0;
  let lockPhase = "idle";
  let exitDirection = 0;
  let settleTimer = 0;
  let wheelSnapTimer = 0;
  let touchY = null;
  let storyStage = -1;
  let appliedX = NaN;
  let appliedY = NaN;
  let needsRender = true;
  let contextLost = false;

  function updateInstructions() {
    instructions.textContent = "Scroll to move through the space.";
    canvas.setAttribute("aria-description", "Scroll through the three stages. Drag remains available for close inspection. Press Escape to reset the form.");
    pauseButton.hidden = Boolean(storySection);
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

  function updateStoryProgress() {
    if (!storySection || !view) return false;
    const rect = storyTrack.getBoundingClientRect();
    const pageProgress = rect.top > window.innerHeight * 0.5 ? 0 : rect.bottom < window.innerHeight * 0.5 ? 1 : storyProgress;
    const target = !reducedMotion.matches && wheelEngaged ? wheelTarget : pageProgress;
    const delta = clamp(target - storyProgress, -0.018, 0.018);
    const next = Math.abs(target - storyProgress) < 0.001 ? target : storyProgress + delta;
    const changed = Math.abs(next - storyProgress) > 0.0005;
    storyProgress = next;
    if (changed || storyStage < 0) applyStoryProgress(next);
    if (scrollLocked && lockPhase === "active" &&
        ((wheelTarget >= 0.999 && storyProgress >= 0.999) ||
         (wheelTarget <= 0.001 && storyProgress <= 0.001))) {
      finishAtEndpoint(wheelTarget >= 0.999 ? 1 : 0);
    }
    return changed;
  }

  function getLockTop() {
    return Math.min(112, Math.max(76, window.innerHeight * 0.1));
  }

  function lockStory(direction) {
    if (scrollLocked || !storyTrack) return;
    const rect = storyTrack.getBoundingClientRect();
    const currentScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    lockedScrollY = Math.max(0, currentScrollY + rect.top - getLockTop());
    window.scrollTo(0, lockedScrollY);
    document.documentElement.style.setProperty("--studio-lock-offset", `-${lockedScrollY}px`);
    document.documentElement.classList.add("is-studio-scroll-locked");
    document.body.classList.add("is-studio-scroll-locked");
    storySection.classList.add("is-scroll-locked");
    storySection.dataset.scrollDirection = direction > 0 ? "forward" : "reverse";
    storySection.dataset.scrollState = "active";
    scrollLocked = true;
    lockPhase = "active";
    exitDirection = 0;
    window.clearTimeout(settleTimer);
    wheelEngaged = true;
    wheelTarget = storyProgress;
    announce(direction > 0 ? "Studio locked. Scroll to build the space." : "Studio locked. Scroll upward to reverse the space.");
  }

  function restoreScrollPosition(y) {
    const html = document.documentElement;
    const previousInlineBehavior = html.style.scrollBehavior;
    html.style.scrollBehavior = "auto";
    window.scrollTo(0, y);
    html.style.scrollBehavior = previousInlineBehavior;
  }

  function unlockStory() {
    if (!scrollLocked) return;
    scrollLocked = false;
    wheelEngaged = false;
    lockPhase = "idle";
    exitDirection = 0;
    window.clearTimeout(settleTimer);
    window.clearTimeout(wheelSnapTimer);
    document.documentElement.classList.remove("is-studio-scroll-locked");
    document.body.classList.remove("is-studio-scroll-locked");
    document.documentElement.style.removeProperty("--studio-lock-offset");
    storySection.classList.remove("is-scroll-locked");
    delete storySection.dataset.scrollState;
    delete storySection.dataset.scrollDirection;
    restoreScrollPosition(lockedScrollY);
  }

  function armExitAfterQuiet() {
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(() => {
      if (!scrollLocked || lockPhase !== "settling") return;
      lockPhase = "armed";
      storySection.dataset.scrollState = "awaiting-new-input";
      announce(exitDirection > 0 ? "Studio complete. Scroll again to continue." : "Studio reset. Scroll upward again to continue.");
    }, 180);
  }

  function finishAtEndpoint(endpoint) {
    if (!scrollLocked) return;
    const progress = endpoint === 1 ? 1 : 0;
    exitDirection = endpoint === 1 ? 1 : -1;
    lockPhase = "settling";
    storySection.dataset.scrollState = "settling";
    wheelTarget = progress;
    wheelEngaged = true;
    touchY = null;
    window.clearTimeout(wheelSnapTimer);
    applyStoryProgress(progress);
    armExitAfterQuiet();
  }

  function exitOnFreshInput(direction, delta, event) {
    event.preventDefault();
    const destination = Math.max(0, lockedScrollY + clamp(delta, -120, 120));
    unlockStory();
    requestAnimationFrame(() => restoreScrollPosition(destination));
    return true;
  }

  function shouldLock(direction, delta) {
    if (!storyTrack) return false;
    const rect = storyTrack.getBoundingClientRect();
    const activation = Math.max(28, Math.min(window.innerHeight, Math.abs(delta) * 1.25));
    const lockTop = getLockTop();
    if (direction > 0) {
      return storyProgress < 0.999 && rect.top <= lockTop + activation && rect.bottom > lockTop + 120;
    }
    return storyProgress > 0.001 && rect.bottom >= window.innerHeight - activation && rect.top < window.innerHeight - 120;
  }

  function consumeStoryDelta(delta, event) {
    if (!storyTrack || reducedMotion.matches || !view || Math.abs(delta) < 0.01) return false;
    const direction = Math.sign(delta);
    if (scrollLocked && lockPhase === "settling") {
      event.preventDefault();
      wheelTarget = exitDirection > 0 ? 1 : 0;
      applyStoryProgress(wheelTarget);
      armExitAfterQuiet();
      return true;
    }
    if (scrollLocked && lockPhase === "armed") {
      if (direction === exitDirection) return exitOnFreshInput(direction, delta, event);
      lockPhase = "active";
      storySection.dataset.scrollState = "active";
      wheelTarget = storyProgress;
    }
    if (!scrollLocked) {
      if (!shouldLock(direction, delta)) return false;
      lockStory(direction);
    }
    if ((direction > 0 && storyProgress >= 0.999) || (direction < 0 && storyProgress <= 0.001)) {
      event.preventDefault();
      const endpoint = direction > 0 ? 1 : 0;
      finishAtEndpoint(endpoint);
      return true;
    }
    event.preventDefault();
    wheelEngaged = true;
    wheelTarget = clamp(wheelTarget + clamp(delta, -100, 100) / 1450, 0, 1);
    window.clearTimeout(wheelSnapTimer);
    wheelSnapTimer = window.setTimeout(() => {
      const stops = Array.from({ length: storySteps.length + 1 }, (_, index) => index / storySteps.length);
      const nearest = stops.reduce((best, stop) => Math.abs(stop - wheelTarget) < Math.abs(best - wheelTarget) ? stop : best, stops[0]);
      if (Math.abs(nearest - wheelTarget) < 0.012) wheelTarget = nearest;
      wake();
    }, 220);
    wake();
    return true;
  }

  if (storySection) {
    window.addEventListener("wheel", (event) => consumeStoryDelta(event.deltaY, event), { ...listenerOptions, passive: false });
    window.addEventListener("touchstart", (event) => { touchY = event.touches[0]?.clientY ?? null; }, { ...listenerOptions, passive: true });
    window.addEventListener("touchmove", (event) => {
      const nextY = event.touches[0]?.clientY;
      if (touchY == null || nextY == null) return;
      const delta = (touchY - nextY) * 1.35;
      if (consumeStoryDelta(delta, event)) touchY = nextY;
    }, { ...listenerOptions, passive: false });
    window.addEventListener("touchend", () => { touchY = null; }, listenerOptions);
    window.addEventListener("keydown", (event) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
      const deltaByKey = {
        PageDown: 100,
        PageUp: -100,
        " ": event.shiftKey ? -100 : 100,
        End: 100,
        Home: -100
      }[event.key];
      if (deltaByKey) consumeStoryDelta(deltaByKey, event);
    }, listenerOptions);
  }

  function applyStoryProgress(progress) {
    storyProgress = clamp(progress, 0, 1);
    if (storySection) {
      storySection.dataset.storyProgress = storyProgress.toFixed(3);
      storySection.style.setProperty("--story-progress", String(storyProgress * 100));
    }
    if (!view?.story) return;
    view.story.setProgress(storyProgress);
    const p = storyProgress * storyProgress * (3 - 2 * storyProgress);
    const portrait = stage.clientWidth / stage.clientHeight < 1;
    view.camera.position.set(2.35 - p * 0.7, 2.25 - p * 0.25, (portrait ? 10.8 : 7.3) - p * 1.5);
    view.camera.lookAt(-0.12, 1.38, -1.1 - p * 0.2);
    view.key.intensity = 2.0 + clamp((storyProgress - 0.72) / 0.16, 0, 1) * 0.75;
    const nextStage = [0.15, 0.35, 0.55, 0.72, 0.88].filter(boundary => storyProgress >= boundary).length;
    storySteps.forEach((step, index) => step.classList.toggle("is-active", index === nextStage));
    if (nextStage !== storyStage) {
      storyStage = nextStage;
      const labels = ["Design stage.", "Craftsmanship stage.", "Custom cabinetry stage.", "Materials stage.", "Precision stage.", "Built for your space."];
      announce(labels[nextStage]);
    }
    needsRender = true;
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
    const storyChanged = updateStoryProgress();
    if (!reducedMotion.matches) advanceSpring(dt);

    const resting = !pointer && keys.size === 0 && spring.x === 0 && spring.y === 0;
    const idle = !storySection && !paused && !reducedMotion.matches && resting;
    if (idle) {
      idleTime += dt;
      yaw = Math.sin(idleTime * 0.14) * 0.105;
    } else {
      yaw = 0;
    }

    // A paused/resting scene has no persistent requestAnimationFrame loop.
    const moving = Boolean(storySection && visible) || idle || storyChanged || spring.vx !== 0 || spring.vy !== 0 || spring.x !== spring.tx || spring.y !== spring.ty;
    const geometryChanged = spring.x !== appliedX || spring.y !== appliedY;
    const interval = coarsePointer.matches ? 1000 / 30 : 1000 / 60;
    if (needsRender || !moving || time - lastDraw >= interval - 1) {
      if (geometryChanged) {
        view.sculpture.deform(spring.x, spring.y);
        appliedX = spring.x;
        appliedY = spring.y;
      }
      if (!storySection) view.sculpture.group.rotation.y = -0.14 + yaw + spring.x * 0.045;
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
    if (camera.isPerspectiveCamera) {
      camera.aspect = aspect;
    } else {
      camera.left = -halfHeight * aspect;
      camera.right = halfHeight * aspect;
      camera.top = halfHeight;
      camera.bottom = -halfHeight;
    }
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, coarsePointer.matches ? 1.5 : 1.75));
    renderer.setSize(width, height, false);
    if (storySection) applyStoryProgress(storyProgress);
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
    let story;
    try {
      const [THREE, geometryModule] = await Promise.all([
        import(new URL("./vendor/three.module.min.js", moduleBase).href),
        import(new URL("./studio-sculpture-geometry.js", moduleBase).href)
      ]);
      if (destroyed) return;
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
      renderer.setClearColor(0xded5c7, 1);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.95;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.VSMShadowMap;

      // Reuse the site's actual walnut photograph. No runtime CDN or model request.
      const textureUrl = new URL("assets/../american-walnut.jpg.jpeg", document.baseURI);
      wood = await new THREE.TextureLoader().loadAsync(textureUrl.href);
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
      const camera = storySection ? new THREE.PerspectiveCamera(44, 1, 0.1, 50) : new THREE.OrthographicCamera(-3, 3, 2.55, -2.55, 0.1, 40);
      camera.position.set(4.7, 3.8, 7.5);
      camera.lookAt(0, 1.3, 0);
      scene.add(new THREE.HemisphereLight(0xfff6e5, 0x706153, 0.65));

      // Bake a small photographic studio environment once for glass/metal
      // reflections. The lighting cards are absent from the visible room.
      if (storySection) {
        const environmentScene = new THREE.Scene();
        environmentScene.background = new THREE.Color(0x9e968c);
        const envGeometry = new THREE.BoxGeometry(1, 1, 1);
        const envMaterials = [];
        for (const [position, scale, color, intensity] of [
          [[-5, 2, 0], [0.1, 4, 7], 0xe9f4ff, 4],
          [[0, 6, 0], [8, 0.1, 8], 0xfff2dc, 1.5],
          [[3, 1, -4], [2, 3, 0.1], 0xffc786, 1.2]
        ]) {
          const mat = new THREE.MeshBasicMaterial({color: new THREE.Color(color).multiplyScalar(intensity)});
          envMaterials.push(mat);
          const card = new THREE.Mesh(envGeometry, mat);
          card.position.set(...position); card.scale.set(...scale); environmentScene.add(card);
        }
        const pmrem = new THREE.PMREMGenerator(renderer);
        const environmentTarget = pmrem.fromScene(environmentScene, 0.04);
        scene.environment = environmentTarget.texture;
        scene.environmentIntensity = 0.65;
        scene.userData.environmentTarget = environmentTarget;
        pmrem.dispose(); envGeometry.dispose(); envMaterials.forEach(mat => mat.dispose());
      }

      const key = new THREE.DirectionalLight(0xfff5e8, 2.55);
      key.position.set(-3.5, 3.25, 1.7);
      key.target.position.set(0.5, 0.5, -1.6);
      key.castShadow = true;
      key.shadow.mapSize.setScalar(1024);
      key.shadow.radius = 5;
      key.shadow.blurSamples = 8;
      Object.assign(key.shadow.camera, { left: -4.5, right: 4.5, top: 4.5, bottom: -4.5, near: 0.5, far: 20 });
      key.shadow.normalBias = 0.018;
      key.shadow.bias = -0.0002;
      scene.add(key, key.target);
      const fill = new THREE.DirectionalLight(0xe8d6c4, 0.8);
      fill.position.set(0, 2.8, 5);
      scene.add(fill);
      const bounce = new THREE.PointLight(0xd8a36a, 0.55, 5.5, 2);
      bounce.position.set(-1.7, 2.05, -0.75);
      scene.add(bounce);
      const interiorGlow = new THREE.SpotLight(0xffd7a0, 7.5, 7, Math.PI / 5, 0.72, 1.7);
      interiorGlow.position.set(-1.55, 3.25, 1.6);
      interiorGlow.target.position.set(-0.45, 0.2, -0.35);
      interiorGlow.castShadow = false;
      interiorGlow.shadow.mapSize.setScalar(768);
      scene.add(interiorGlow, interiorGlow.target);

      sculpture = geometryModule.createSculpture(THREE, wood);
      scene.add(sculpture.group);
      let roomAssets;
      if (storySection) {
        const { GLTFLoader } = await import(new URL('./vendor/GLTFLoader.js', moduleBase).href);
        const textureLoader = new THREE.TextureLoader();
        const names = ['rosewood_veneer1', 'marble_01', 'wood_floor'];
        const loaded = await Promise.all(names.map(async (name) => {
          const maps = await Promise.all(['Diffuse', 'nor_gl', 'Rough'].map(kind => textureLoader.loadAsync(new URL(`assets/3d/materials/${name}_${kind}.jpg`, document.baseURI).href)));
          maps.forEach(t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; });
          maps[0].colorSpace = THREE.SRGBColorSpace;
          return maps;
        }));
        const sofa = await new GLTFLoader().loadAsync(new URL('assets/3d/lounge/lounge.gltf', document.baseURI).href);
        roomAssets = { wood: loaded[0], stone: loaded[1], floor: loaded[2], sofa: sofa.scene };
      }
      story = geometryModule.createInteriorStory(THREE, wood, roomAssets);
      scene.add(story.group);
      story.group.renderOrder = -1;
      story.setProgress(0);
      sculpture.group.visible = !storySection;
      sculpture.group.scale.setScalar(storySection ? 0.72 : 1);
      sculpture.group.position.set(storySection ? -0.28 : 0, storySection ? 0.03 : 0, storySection ? 0.08 : 0);
      floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ color: 0x573b28, opacity: 0.17 }));
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -0.012;
      floor.receiveShadow = true;
      scene.add(floor);
      view = { renderer, scene, camera, sculpture, story, storyGroup: story.group, wood, floor, key };

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
      // Reuse this renderer once for the About hero, never a second WebGL scene.
      // The interactive progress and original scroll state remain at their start.
      const preview = document.querySelector("[data-studio-preview]");
      if (preview && storySection) {
        const initialProgress = storyProgress;
        try {
          applyStoryProgress(1);
          renderer.setPixelRatio(1);
          renderer.setSize(1120, 720, false);
          camera.aspect = 1120 / 720;
          camera.position.set(1.65, 2, 5.8);
          camera.lookAt(-0.12, 1.38, -1.3);
          camera.updateProjectionMatrix();
          renderer.render(scene, camera);
          preview.src = canvas.toDataURL("image/webp", 0.88);
          preview.alt = "Finished 3D interior study with walnut cabinetry, stone, leather seating and warm lighting";
        } catch {
          // A blocked canvas export must not disable the working 3D story.
          // Keep the supplied interior photograph as the hero fallback.
        } finally {
          applyStoryProgress(initialProgress);
          resize();
        }
      }
      applyStoryProgress(storyProgress);
      announce(storySection ? "Scroll-driven interior story ready." : "Interactive wooden sculpture ready. Drag or hold arrow keys to bend. Release to return to its original form.");
      wake();
    } catch (error) {
      sculpture?.dispose();
      story?.dispose();
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
  let visibilityObserver;
  if ("IntersectionObserver" in window) {
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
  }

  // Deterministic startup is more reliable than gating the whole About
  // experience behind an observer. The local modules and texture are small,
  // while rendering still pauses whenever the section is off screen.
  init();

  window.addEventListener("pagehide", (event) => {
    unlockStory();
    releaseInput(true);
    stop();
    if (event.persisted) return;
    destroyed = true;
    visibilityObserver?.disconnect();
    resizeObserver.disconnect();
    lifetime.abort();
    if (view) {
      view.sculpture.dispose();
      view.story.dispose();
      view.wood.dispose();
      view.floor.geometry.dispose();
      view.floor.material.dispose();
      view.key.shadow.map?.dispose();
      view.renderer.dispose();
      view.scene.userData.environmentTarget?.dispose();
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
