/**
 * Fifteen bent-timber ribs describe one asymmetric, open architectural volume.
 * The geometry is authored in metres, with its two feet resting at y = 0.018.
 * No model, loader, framework or runtime-generated image is required.
 */
export function createSculpture(THREE, woodTexture) {
  const RIB_COUNT = 15;
  const PATH_SEGMENTS = 80;
  const RIB_SPACING = 0.166;
  const BAND_WIDTH = 0.202;
  const BAND_THICKNESS = 0.062;
  const EDGE_RADIUS = 0.009;
  const group = new THREE.Group();
  group.name = "WIN DESIGN · bent walnut pavilion";
  const ribs = [];
  const restBox = new THREE.Box3();
  const currentBox = new THREE.Box3();
  const size = new THREE.Vector3();
  let previousX = NaN;
  let previousY = NaN;

  // Counterclockwise rounded rectangle: broad timber faces and a small,
  // physical bevel catch light without making the wood look inflated.
  const profile = [];
  const halfWidth = BAND_WIDTH / 2;
  const halfThickness = BAND_THICKNESS / 2;
  const corners = [
    [halfWidth - EDGE_RADIUS, halfThickness - EDGE_RADIUS, 0],
    [-halfWidth + EDGE_RADIUS, halfThickness - EDGE_RADIUS, Math.PI / 2],
    [-halfWidth + EDGE_RADIUS, -halfThickness + EDGE_RADIUS, Math.PI],
    [halfWidth - EDGE_RADIUS, -halfThickness + EDGE_RADIUS, Math.PI * 1.5]
  ];
  for (const [cx, cz, start] of corners) {
    for (let step = 0; step < 4; step += 1) {
      const angle = start + step * Math.PI / 6;
      profile.push([cx + Math.cos(angle) * EDGE_RADIUS, cz + Math.sin(angle) * EDGE_RADIUS]);
    }
  }
  const profileCount = profile.length;
  const perimeterDistances = [0];
  for (let i = 1; i <= profileCount; i += 1) {
    const a = profile[i - 1];
    const b = profile[i % profileCount];
    perimeterDistances.push(perimeterDistances[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const perimeter = perimeterDistances[profileCount];

  for (let ribIndex = 0; ribIndex < RIB_COUNT; ribIndex += 1) {
    const q = (ribIndex - (RIB_COUNT - 1) / 2) / ((RIB_COUNT - 1) / 2);
    const z = q * (RIB_COUNT - 1) / 2 * RIB_SPACING;
    // A full left vault flows into a concave right shoulder. The crown steps
    // gently through the depth, giving the stack a legible sculptural contour.
    const outline = [
      [-1.42, 0.04],
      [-1.44, 0.65],
      [-1.47, 1.45],
      [-1.22, 2.30],
      [-0.60, 2.83],
      [0.10, 2.88],
      [0.67, 2.37],
      [0.78, 1.62],
      [1.30, 0.97],
      [1.49, 0.04]
    ];
    const points = outline.map(([x, y], index) => {
      const t = index / (outline.length - 1);
      const crown = Math.sin(Math.PI * t);
      return new THREE.Vector3(
        x + 0.11 * q * crown + 0.055 * q * q * crown,
        0.04 + (y - 0.04) * (1 - 0.075 * q * q) + 0.065 * q * crown,
        z
      );
    });
    const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
    const path = curve.getSpacedPoints(PATH_SEGMENTS);
    const positions = [];
    const uvs = [];
    const indices = [];
    const tangent = new THREE.Vector3();
    let distance = 0;
    const pathDistances = [0];
    for (let j = 1; j <= PATH_SEGMENTS; j += 1) {
      distance += path[j].distanceTo(path[j - 1]);
      pathDistances.push(distance);
    }

    // Duplicate the UV seam while preserving matching rounded-edge normals
    // below. U follows arc length, so the grain bends with the timber.
    const ringSize = profileCount + 1;
    for (let j = 0; j <= PATH_SEGMENTS; j += 1) {
      const previous = path[Math.max(0, j - 1)];
      const next = path[Math.min(PATH_SEGMENTS, j + 1)];
      tangent.subVectors(next, previous).normalize();
      const nx = -tangent.y;
      const ny = tangent.x;
      for (let k = 0; k <= profileCount; k += 1) {
        const [a, b] = profile[k % profileCount];
        positions.push(path[j].x + nx * a, path[j].y + ny * a, z + b);
        uvs.push(pathDistances[j] / distance + ribIndex * 0.041, perimeterDistances[k] / perimeter + ribIndex * 0.173);
      }
      if (j === PATH_SEGMENTS) continue;
      for (let k = 0; k < profileCount; k += 1) {
        const a = j * ringSize + k;
        const b = a + ringSize;
        // Right-handed profile basis (normal, depth, tangent).
        indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }

    // Dedicated cap vertices keep the end grain faces planar and their
    // normals separate from the rounded long edges.
    for (const endpoint of [0, PATH_SEGMENTS]) {
      const centerIndex = positions.length / 3;
      positions.push(path[endpoint].x, path[endpoint].y, z);
      uvs.push(0.5, 0.5);
      const first = positions.length / 3;
      for (let k = 0; k < profileCount; k += 1) {
        const source = (endpoint * ringSize + k) * 3;
        positions.push(positions[source], positions[source + 1], positions[source + 2]);
        uvs.push(profile[k][0] / BAND_WIDTH + 0.5, profile[k][1] / BAND_THICKNESS + 0.5);
      }
      for (let k = 0; k < profileCount; k += 1) {
        const a = first + k;
        const b = first + (k + 1) % profileCount;
        if (endpoint === 0) indices.push(centerIndex, b, a);
        else indices.push(centerIndex, a, b);
      }
    }

    let minimumY = Infinity;
    for (let j = 1; j < positions.length; j += 3) minimumY = Math.min(minimumY, positions[j]);
    for (let j = 1; j < positions.length; j += 3) positions[j] += 0.018 - minimumY;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    smoothSeam(geometry);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    restBox.union(geometry.boundingBox);
    const tint = 0.96 + 0.035 * (0.5 + 0.5 * Math.cos(ribIndex * 1.83));
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(tint, tint * 0.995, tint * 0.985),
      map: woodTexture,
      bumpMap: woodTexture,
      bumpScale: 0.009,
      roughness: 0.73,
      metalness: 0
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `Bent walnut rib ${String(ribIndex + 1).padStart(2, "0")}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    ribs.push({ mesh, base: geometry.attributes.position.array.slice() });
  }

  const stats = {
    ribCount: RIB_COUNT,
    vertexCount: ribs.reduce((sum, rib) => sum + rib.base.length / 3, 0),
    triangleCount: ribs.reduce((sum, rib) => sum + rib.mesh.geometry.index.count / 3, 0),
    ribThickness: BAND_THICKNESS,
    restGap: RIB_SPACING - BAND_THICKNESS,
    restBounds: boxSummary(restBox),
    bounds: boxSummary(restBox),
    deformation: { x: 0, y: 0, maxDisplacement: 0 }
  };

  function smoothSeam(geometry) {
    const normals = geometry.attributes.normal;
    const seamNormal = new THREE.Vector3();
    const otherNormal = new THREE.Vector3();
    for (let j = 0; j <= PATH_SEGMENTS; j += 1) {
      const first = j * (profileCount + 1);
      const last = first + profileCount;
      seamNormal.fromBufferAttribute(normals, first);
      otherNormal.fromBufferAttribute(normals, last);
      seamNormal.add(otherNormal).normalize();
      normals.setXYZ(first, seamNormal.x, seamNormal.y, seamNormal.z);
      normals.setXYZ(last, seamNormal.x, seamNormal.y, seamNormal.z);
    }
    normals.needsUpdate = true;
  }

  function boxSummary(box) {
    box.getSize(size);
    return { min: box.min.toArray(), max: box.max.toArray(), size: size.toArray() };
  }

  function deform(x = 0, y = 0) {
    x = Math.max(-1, Math.min(1, Number.isFinite(x) ? x : 0));
    y = Math.max(-1, Math.min(1, Number.isFinite(y) ? y : 0));
    if (x === previousX && y === previousY) return stats.deformation;
    previousX = x;
    previousY = y;
    currentBox.makeEmpty();
    let maximumDistanceSquared = 0;
    for (const { mesh, base } of ribs) {
      const attribute = mesh.geometry.attributes.position;
      const target = attribute.array;
      for (let i = 0; i < base.length; i += 3) {
        const bx = base[i];
        const by = base[i + 1];
        const bz = base[i + 2];
        // One continuous field deforms all ribs. It is invertible at each
        // height: fan stays positive, shear stays bounded, and y is monotone.
        // Consequently the separated ribs remain separated at full input.
        const h = Math.max(0, Math.min(1, (by - 0.18) / 2.75));
        const influence = h * h * (3 - 2 * h);
        const angle = (x * 0.34 + y * 0.09) * influence;
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        const fx = bx + x * 0.12 * bz * influence;
        const fz = bz * (1 + y * 0.22 * influence);
        target[i] = c * fx - s * fz + x * 0.50 * influence;
        target[i + 1] = by + y * 0.24 * influence;
        target[i + 2] = s * fx + c * fz;
        const dx = target[i] - bx;
        const dy = target[i + 1] - by;
        const dz = target[i + 2] - bz;
        maximumDistanceSquared = Math.max(maximumDistanceSquared, dx * dx + dy * dy + dz * dz);
      }
      attribute.needsUpdate = true;
      mesh.geometry.computeVertexNormals();
      smoothSeam(mesh.geometry);
      mesh.geometry.computeBoundingBox();
      mesh.geometry.computeBoundingSphere();
      currentBox.union(mesh.geometry.boundingBox);
    }
    stats.bounds = boxSummary(currentBox);
    stats.deformation = { x, y, maxDisplacement: Math.sqrt(maximumDistanceSquared) };
    return stats.deformation;
  }

  function dispose() {
    for (const { mesh } of ribs) {
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    group.clear();
    // The caller owns woodTexture and can share it with other scene objects.
  }

  return { group, deform, dispose, stats };
}

/**
 * An authored residential interior in metres. Detail is built at furniture scale;
 * the existing scroll controller owns progress, while this module owns only art.
 */
export function createInteriorStory(THREE, woodTexture, assets) {
  const group = new THREE.Group();
  group.name = "WIN DESIGN · walnut residence";
  const resources = new Set();
  const actors = [];
  const lights = [];
  const cache = new Map();
  const smooth = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
  let seed = 391;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

  // Small, deterministic surface maps: the walnut colour is the existing photograph.
  // These maps add microstructure, never substitute a photograph for the 3D scene.
  function surface(kind, size = 512) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    const pixels = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      let v;
      if (kind === "stone") {
        const wave = x * 0.026 + y * 0.011 + Math.sin(y * 0.018) * 1.7 + Math.sin(x * 0.008) * 2;
        const vein = Math.pow(Math.abs(Math.sin(wave)), 36);
        v = 218 - vein * 68 + (random() - 0.5) * 12 + Math.sin(y * 0.17) * 3;
        pixels.data[i] = v; pixels.data[i + 1] = v - 8; pixels.data[i + 2] = v - 19;
      } else {
        v = kind === "fabric" ? 170 + Math.sin(x * Math.PI / 2) * Math.sin(y * Math.PI / 2) * 24 + random() * 30
          : 196 + (random() - 0.5) * 34;
        pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = v;
      }
      pixels.data[i + 3] = 255;
    }
    ctx.putImageData(pixels, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 4;
    resources.add(texture);
    return texture;
  }
  const stoneMap = surface("stone");
  stoneMap.colorSpace = THREE.SRGBColorSpace;
  const plasterMap = surface("plaster", 256);
  plasterMap.repeat.set(5, 5);
  const fabricMap = surface("fabric", 256);
  fabricMap.repeat.set(7, 7);
  const walnut = woodTexture.clone();
  walnut.rotation = 0;
  walnut.repeat.set(0.65, 1.3);
  walnut.needsUpdate = true;
  resources.add(walnut);
  const flooring = woodTexture.clone();
  flooring.rotation = Math.PI / 2;
  flooring.repeat.set(0.25, 1.4);
  flooring.needsUpdate = true;
  resources.add(flooring);
  function material(options, physical = false) {
    const m = physical ? new THREE.MeshPhysicalMaterial(options) : new THREE.MeshStandardMaterial(options);
    resources.add(m);
    return m;
  }
  const plaster = material({ color: 0xd8d0c4, bumpMap: plasterMap, bumpScale: 0.014, roughnessMap: plasterMap, roughness: 0.96 });
  const wood = material({ color: 0xc4a58a, map: walnut, bumpMap: walnut, bumpScale: 0.012, roughnessMap: walnut, roughness: 0.78 });
  const oak = material({ color: 0xc6ae91, map: flooring, bumpMap: flooring, bumpScale: 0.008, roughness: 0.6 });
  const recess = material({ color: 0x302720, roughness: 0.9 });
  const stone = material({ color: 0xe6dccb, map: stoneMap, bumpMap: stoneMap, bumpScale: 0.009, roughness: 0.39 });
  const linen = material({ color: 0xcfc3ae, bumpMap: fabricMap, bumpScale: 0.018, roughness: 0.98 });
  const cushion = material({ color: 0x786657, bumpMap: fabricMap, bumpScale: 0.013, roughness: 1 });
  const bronze = material({ color: 0x806443, metalness: 0.88, roughness: 0.28 });
  const black = material({ color: 0x171b1b, metalness: 0.5, roughness: 0.3 });
  const glass = material({ color: 0xcedace, transmission: 0.82, thickness: 0.085, ior: 1.5, roughness: 0.1, metalness: 0, transparent: true, opacity: 0.82 }, true);
  const screen = material({ color: 0x151c1c, metalness: 0.18, roughness: 0.19, clearcoat: 0.85, clearcoatRoughness: 0.13 }, true);
  const rug = material({ color: 0xb5a996, bumpMap: fabricMap, bumpScale: 0.02, roughness: 1 });
  const ceramic = material({ color: 0x58493a, roughness: 0.58, bumpMap: plasterMap, bumpScale: 0.008 });
  const warm = material({ color: 0xffe3ac, emissive: 0xffb866, emissiveIntensity: 2.1, roughness: 0.4 });
  const daylight = material({ color: 0xe0e9e5, emissive: 0xbacbc8, emissiveIntensity: 0.48, roughness: 1 });

  if (assets) {
    for (const [mat, maps] of [[wood, assets.wood], [stone, assets.stone], [oak, assets.floor]]) {
      mat.map = maps[0]; mat.normalMap = maps[1]; mat.roughnessMap = maps[2];
      mat.bumpMap = null;
      mat.normalScale = new THREE.Vector2(0.3, 0.3);
      mat.color.set(0xffffff);
      maps.forEach(t => resources.add(t));
    }
    wood.color.set(0xabb7b3);
    wood.roughness = 0.82;
    wood.onBeforeCompile = shader => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor, 0.56, 0.88);');
    };
    stone.color.set(0xe0d4bd);
    oak.color.set(0xc5bba8);
    assets.floor.forEach(t => { t.repeat.set(0.085, 2.4); });
    assets.wood.forEach(t => { t.repeat.set(0.35, 1.0); });
    screen.roughness = 0.36;
    screen.clearcoat = 0.2;
  }

  // True rounded solid: project subdivided vertices onto a rounded cuboid.
  // Shared geometry keeps the repeated joinery details inexpensive.
  function roundedGeometry(w, h, d, r) {
    r = Math.min(r, w / 2, h / 2, d / 2);
    const key = [w, h, d, r].join(":");
    if (cache.has(key)) return cache.get(key);
    const segments = r > 0.025 ? 10 : 4;
    const geometry = new THREE.BoxGeometry(1, 1, 1, segments, segments, segments);
    const a = geometry.attributes.position;
    const inner = new THREE.Vector3(w / 2 - r, h / 2 - r, d / 2 - r);
    const v = new THREE.Vector3(), q = new THREE.Vector3(), n = new THREE.Vector3();
    for (let i = 0; i < a.count; i++) {
      v.fromBufferAttribute(a, i);
      const core = 0.5 - 1 / segments;
      q.set(Math.max(-core, Math.min(core, v.x)), Math.max(-core, Math.min(core, v.y)), Math.max(-core, Math.min(core, v.z)));
      n.copy(v).sub(q).normalize();
      v.set(q.x / core * inner.x, q.y / core * inner.y, q.z / core * inner.z).addScaledVector(n, r);
      a.setXYZ(i, v.x, v.y, v.z);
      geometry.attributes.normal.setXYZ(i, n.x, n.y, n.z);
    }
    cache.set(key, geometry);
    resources.add(geometry);
    return geometry;
  }
  function actor(mesh, pos, start, end, offset = [0, 0.25, 0], rotation = 0) {
    mesh.position.set(...pos);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    actors.push({ mesh, base: mesh.position.clone(), rotation, start, end, offset: new THREE.Vector3(...offset) });
    return mesh;
  }
  function box(name, size, pos, mat, start = 0.15, end = 0.35, r = 0.012, offset) {
    const mesh = new THREE.Mesh(roundedGeometry(...size, r), mat);
    mesh.name = name;
    return actor(mesh, pos, start, end, offset);
  }
  function lathe(name, points, pos, mat, start = 0.58, end = 0.72) {
    const geo = new THREE.LatheGeometry(points.map(p => new THREE.Vector2(...p)), 40);
    resources.add(geo);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = name;
    return actor(mesh, pos, start, end, [0, 0.28, 0]);
  }
  function tube(name, points, radius, mat, start = 0.6, end = 0.74) {
    const path = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    const geo = new THREE.TubeGeometry(path, 48, radius, 8, false);
    resources.add(geo);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = name;
    return actor(mesh, [0, 0, 0], start, end);
  }

  // Background: built architecture, shadow gaps, plaster reveals and a side window.
  box("Subfloor", [8, 0.15, 7], [0, -0.1, 0.7], recess, 0, 0.18);
  for (let i = 0; i < 24; i++) {
    box("Individual timber floorboard", [0.326, 0.045, 7], [-3.83 + i * 0.333, -0.005, 0.7], oak, 0.12 + i * 0.002, 0.32 + i * 0.002, 0.003, [0, -0.18, 0]);
  }
  box("Limewash rear wall", [8, 3.8, 0.16], [0, 1.88, -2.72], plaster, 0.15, 0.34, 0.009, [0, 0, -0.45]);
  box("Right wall return", [0.16, 3.8, 6.8], [4, 1.88, 0.6], plaster, 0.17, 0.35, 0.009, [0.5, 0, 0]);
  box("Ceiling", [8, 0.14, 7], [0, 3.85, 0.7], plaster, 0.23, 0.36, 0.01, [0, 0.6, 0]);
  box("Rear shadow skirting", [7.95, 0.035, 0.045], [0, 0.045, -2.6], recess);
  box("Right shadow skirting", [0.045, 0.035, 6.8], [3.89, 0.045, 0.6], recess);
  box("Window daylight", [0.025, 3.35, 6.6], [-4.04, 1.84, 0.65], daylight).castShadow = false;
  for (let i = 0; i < 5; i++) {
    box("Bronze window mullion", [0.065, 3.65, 0.038], [-3.88, 1.83, -2.5 + i * 1.65], bronze, 0.19, 0.35, 0.006);
  }
  box("Window head", [0.09, 0.065, 6.7], [-3.88, 3.61, 0.8], bronze);
  box("Window sill", [0.15, 0.045, 6.7], [-3.88, 0.12, 0.8], stone);
  // Folded linen curtains are continuous curved surfaces, not vertical boxes.
  for (const centerZ of [-2.1, 3.25]) {
    const geo = new THREE.PlaneGeometry(1.05, 3.5, 56, 12);
    const a = geo.attributes.position;
    for (let i = 0; i < a.count; i++) a.setZ(i, Math.sin(a.getX(i) * 34) * 0.075 + Math.sin(a.getY(i) * 1.5) * 0.015);
    geo.computeVertexNormals(); resources.add(geo);
    const mat = linen.clone(); mat.side = THREE.DoubleSide; resources.add(mat);
    const curtain = actor(new THREE.Mesh(geo, mat), [-3.73, 1.88, centerZ], 0.58, 0.73);
    curtain.rotation.y = Math.PI / 2;
  }

  // Middle ground: a full-height walnut wall, stone inset and floating joinery.
  box("Cabinet recessed backing", [7.5, 3.3, 0.16], [0, 1.85, -2.51], recess, 0.32, 0.42);
  for (let i = 0; i < 4; i++) {
    box("Tall walnut door with 4mm reveal", [0.596, 3.17, 0.055], [-3.28 + i * 0.6, 1.86, -2.33], wood, 0.35 + i * 0.022, 0.48 + i * 0.018, 0.006, [-0.22, 0, 0.55]);
  }
  box("Stone TV feature panel", [3.48, 2.6, 0.1], [0.6, 1.97, -2.28], stone, 0.52, 0.66, 0.012, [0, 0.12, 0.4]);
  box("Television fine bronze edge", [2.37, 1.35, 0.06], [0.55, 2.06, -2.17], black, 0.59, 0.72, 0.024);
  box("Television reflective screen", [2.32, 1.30, 0.012], [0.55, 2.06, -2.128], screen, 0.6, 0.73, 0.018);
  box("Floating console carcass", [5.45, 0.43, 0.61], [-0.35, 0.53, -2.02], recess, 0.36, 0.47);
  for (let i = 0; i < 6; i++) {
    box("Console drawer with mitred edge", [0.897, 0.405, 0.046], [-2.605 + i * 0.905, 0.54, -1.689], wood, 0.39 + i * 0.013, 0.51 + i * 0.008, 0.006, [0, 0, 0.55]);
  }
  box("Continuous stone console top", [5.53, 0.037, 0.66], [-0.35, 0.766, -2.025], stone, 0.54, 0.66, 0.008);
  box("Console underside LED", [5.26, 0.012, 0.018], [-0.35, 0.309, -1.77], warm, 0.74, 0.88, 0.003);
  for (const x of [2.48, 3.55]) box("Display cabinet gable", [0.035, 3.2, 0.42], [x, 1.85, -2.21], wood, 0.38, 0.53);
  for (let i = 0; i < 5; i++) {
    const y = 0.3 + i * 0.76;
    box("Display shelf solid edge", [1.03, 0.035, 0.43], [3.01, y, -2.2], wood, 0.39 + i * 0.015, 0.54, 0.006);
    box("Recessed shelf light", [0.92, 0.012, 0.015], [3.01, y - 0.022, -2.04], warm, 0.73, 0.86, 0.002);
    if (i > 0) {
      const light = new THREE.PointLight(0xffcf91, 0, 1.4, 2);
      light.position.set(3.01, y - 0.09, -2.01); group.add(light); lights.push({light, intensity: 1.0});
    }
  }
  box("Smoked glass display door", [1.005, 3.1, 0.022], [3.015, 1.85, -1.956], glass, 0.6, 0.72, 0.004);
  box("Display door bronze pull", [0.015, 0.34, 0.025], [3.47, 1.59, -1.929], bronze, 0.63, 0.74, 0.004);
  box("Architectural ceiling cove", [7.4, 0.09, 0.24], [0, 3.57, -2.4], plaster, 0.23, 0.36);
  box("Concealed ceiling LED", [7.25, 0.015, 0.025], [0, 3.65, -2.37], warm, 0.72, 0.87, 0.004);

  // Foreground: upholstered seating with separate cushions, seams and low plinth.
  box("Wool area rug", [4.55, 0.025, 3.12], [-0.25, 0.028, 0.86], rug, 0.55, 0.65, 0.012);
  if (assets?.sofa) {
    const sofa = assets.sofa;
    const bounds = new THREE.Box3().setFromObject(sofa);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const scale = 1.32 / size.x;
    const pivot = new THREE.Group();
    sofa.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
    sofa.scale.setScalar(scale);
    pivot.add(sofa);
    // Along the window, facing into the room: table and joinery remain visible.
    pivot.rotation.y = Math.PI / 3;
    actor(pivot, [-2.05, 0.055, 0.25], 0.55, 0.72, [0, 0.38, 0]);
    pivot.name = "Modern glTF lounge chair · Poly Haven";
    const second = pivot.clone(true);
    second.rotation.y = Math.PI / 3 + 0.13;
    actor(second, [-2.02, 0.055, 1.85], 0.58, 0.74, [0, 0.38, 0]);
    sofa.traverse(node => {
      if (!node.isMesh) return;
      node.castShadow = node.receiveShadow = true;
      resources.add(node.geometry);
      for (const mat of Array.isArray(node.material) ? node.material : [node.material]) {
        resources.add(mat);
        for (const value of Object.values(mat)) if (value?.isTexture) resources.add(value);
      }
    });
  }

  lathe("Travertine coffee table pedestal", [[0,0],[0.29,0],[0.3,0.05],[0.27,0.34],[0.34,0.38],[0,0.38]], [-0.35,0.05,0.42], stone,0.57,0.69);
  const top = lathe("Bullnose oval travertine table", [[0,0],[0.71,0],[0.75,0.014],[0.76,0.034],[0.75,0.054],[0.71,0.067],[0,0.067]], [-0.35,0.43,0.42], stone,0.59,0.7);
  top.scale.x = 1.3;
  lathe("Bronze side table", [[0,0],[0.24,0],[0.25,0.035],[0.055,0.05],[0.055,0.53],[0.29,0.53],[0.3,0.55],[0.29,0.568],[0,0.568]], [2.05,0.04,1.55], bronze);
  lathe("Hand thrown stoneware", [[0,0],[0.11,0],[0.15,0.08],[0.17,0.22],[0.11,0.32],[0.065,0.36],[0.065,0.38],[0.052,0.38],[0.052,0.35]], [-0.63,0.5,0.39], ceramic);
  box("Linen covered book", [0.36,0.043,0.26], [0.16,0.52,0.49], linen,0.64,0.74,0.009);
  lathe("Display vessel", [[0,0],[0.12,0],[0.15,0.1],[0.1,0.29],[0.06,0.35],[0.05,0.35]], [3.08,1.86,-2.17], ceramic);
  for(let i=0;i<4;i++) box("Bound art book", [0.065,0.28+i*0.018,0.19], [2.76+i*0.077,1.19,-2.15], i%2 ? linen : cushion,0.62,0.73,0.003);
  lathe("Floor lamp weighted base", [[0,0],[0.22,0],[0.24,0.03],[0.22,0.06],[0,0.06]], [2.65,0.04,0.65], bronze);
  tube("Sculpted floor lamp stem", [[2.65,0.08,0.65],[2.65,1.5,0.65],[2.5,1.95,0.65],[2.1,2.02,0.65]], 0.014, bronze);
  lathe("Spun bronze shade", [[0.025,0.2],[0.16,0.19],[0.31,0.08],[0.32,0.02],[0.3,0.01],[0.04,0.17]], [2.08,1.82,0.65], bronze);
  lathe("Lamp diffuser", [[0,0],[0.29,0],[0.29,0.018],[0,0.018]], [2.08,1.845,0.65], warm);
  const lampLight = new THREE.PointLight(0xffd19a, 0, 3.5, 2);
  lampLight.position.set(2.08,1.8,0.65); group.add(lampLight); lights.push({light:lampLight,intensity:3});
  // Foreground glazing catches the window reflection and moves faster than the wall.
  box("Foreground bronze reveal", [0.045,3.8,0.11], [3.7,1.9,3.55], bronze,0.18,0.35);
  box("Foreground clear partition", [0.02,3.6,1.25], [3.66,1.9,2.9], glass,0.6,0.73,0.005);

  // Soft occlusion beneath the furniture augments the single real shadow map.
  const contactCanvas = document.createElement('canvas');
  contactCanvas.width = contactCanvas.height = 128;
  const contactContext = contactCanvas.getContext('2d');
  const falloff = contactContext.createRadialGradient(64,64,5,64,64,64);
  falloff.addColorStop(0,'rgba(33,24,17,0.38)');
  falloff.addColorStop(0.5,'rgba(33,24,17,0.19)');
  falloff.addColorStop(1,'rgba(33,24,17,0)');
  contactContext.fillStyle = falloff; contactContext.fillRect(0,0,128,128);
  const contactTexture = new THREE.CanvasTexture(contactCanvas); resources.add(contactTexture);
  const contactMat = new THREE.MeshBasicMaterial({map:contactTexture, transparent:true, depthWrite:false});
  resources.add(contactMat);
  for(const [x,z,w,d] of [[-2.05,0.25,1.9,1.7],[-2.02,1.85,1.9,1.7],[-0.35,0.42,1.65,1.4],[2.05,1.55,0.8,0.8]]) {
    const geo = new THREE.PlaneGeometry(w,d); resources.add(geo);
    const shadow = actor(new THREE.Mesh(geo,contactMat),[x,0.047,z],0.58,0.73,[0,0,0]);
    shadow.rotation.x = -Math.PI/2; shadow.castShadow = shadow.receiveShadow = false;
  }

  for (const a of actors) {
    a.finalScale = a.mesh.scale.clone();
    a.finalRotation = a.mesh.rotation.clone();
  }
  const planGeo = new THREE.BufferGeometry().setFromPoints([
    [-4,0,-2.7],[4,0,-2.7], [4,0,-2.7],[4,0,4.1], [4,0,4.1],[-4,0,4.1], [-4,0,4.1],[-4,0,-2.7],
    [-4,0,-2.7],[-4,3.8,-2.7], [-4,3.8,-2.7],[4,3.8,-2.7], [4,3.8,-2.7],[4,0,-2.7]
  ].map(p=>new THREE.Vector3(...p)));
  const planMat = new THREE.LineBasicMaterial({color:0x78644b, transparent:true, opacity:0.6});
  const plan = new THREE.LineSegments(planGeo,planMat);
  resources.add(planGeo); resources.add(planMat); group.add(plan);
  function setProgress(p) {
    p = Math.max(0,Math.min(1,Number.isFinite(p)?p:0));
    for(const a of actors) {
      const t = smooth((p-a.start)/(a.end-a.start));
      a.mesh.visible = t > 0.001;
      a.mesh.position.copy(a.base).addScaledVector(a.offset,1-t);
      a.mesh.scale.copy(a.finalScale).multiplyScalar(Math.max(0.001,t));
      a.mesh.rotation.copy(a.finalRotation);
      if(a.start >= 0.35 && a.start < 0.55) a.mesh.rotation.y += (1-t)*0.09;
    }
    const finish = smooth((p-0.72)/0.16);
    planMat.opacity = 0.6 * (1-smooth((p-0.15)/0.2));
    plan.visible = p < 0.35;
    warm.emissiveIntensity = 0.08+finish*2.2;
    wood.roughness = 0.92-finish*0.2;
    stone.roughness = 0.74-finish*0.35;
    for(const {light,intensity} of lights) light.intensity = intensity*finish;
    return {progress:p,finish};
  }
  function dispose() { for(const item of resources) item.dispose(); group.clear(); }
  setProgress(0);
  return {group,setProgress,dispose,actors};
}
