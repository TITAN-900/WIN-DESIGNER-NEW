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
