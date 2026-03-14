import * as THREE from "three";

/**
 * Splits a single BufferGeometry into separate geometries,
 * one per connected component (island of connected triangles).
 * Each tooth in the mesh is a disconnected island, so this
 * effectively separates individual teeth.
 */
export function splitIntoIslands(geometry: THREE.BufferGeometry): THREE.BufferGeometry[] {
  const index = geometry.index;
  if (!index) return [geometry];

  const positions = geometry.getAttribute("position");
  const normals = geometry.getAttribute("normal");
  const vertexCount = positions.count;
  const triCount = index.count / 3;

  // Union-Find to group vertices that share a triangle
  const parent = new Int32Array(vertexCount);
  const rank = new Int32Array(vertexCount);
  for (let i = 0; i < vertexCount; i++) parent[i] = i;

  function find(x: number): number {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  }

  function union(a: number, b: number) {
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return;
    if (rank[ra] < rank[rb]) {
      parent[ra] = rb;
    } else if (rank[ra] > rank[rb]) {
      parent[rb] = ra;
    } else {
      parent[rb] = ra;
      rank[ra]++;
    }
  }

  // Union all vertices in each triangle
  const indices = index.array;
  for (let i = 0; i < triCount; i++) {
    const a = indices[i * 3];
    const b = indices[i * 3 + 1];
    const c = indices[i * 3 + 2];
    union(a, b);
    union(b, c);
  }

  // Group triangles by their root
  const groups = new Map<number, number[]>();
  for (let i = 0; i < triCount; i++) {
    const root = find(indices[i * 3]);
    let list = groups.get(root);
    if (!list) {
      list = [];
      groups.set(root, list);
    }
    list.push(i);
  }

  // Build a separate geometry for each island
  const results: THREE.BufferGeometry[] = [];

  for (const triangles of groups.values()) {
    // Collect unique vertices used by this island
    const vertexMap = new Map<number, number>();
    let nextIdx = 0;

    const newIndices: number[] = [];
    for (const tri of triangles) {
      for (let j = 0; j < 3; j++) {
        const oldIdx = indices[tri * 3 + j];
        if (!vertexMap.has(oldIdx)) {
          vertexMap.set(oldIdx, nextIdx++);
        }
        newIndices.push(vertexMap.get(oldIdx)!);
      }
    }

    const newPositions = new Float32Array(vertexMap.size * 3);
    const newNormals = normals ? new Float32Array(vertexMap.size * 3) : null;

    for (const [oldIdx, newIdx] of vertexMap) {
      newPositions[newIdx * 3] = positions.getX(oldIdx);
      newPositions[newIdx * 3 + 1] = positions.getY(oldIdx);
      newPositions[newIdx * 3 + 2] = positions.getZ(oldIdx);
      if (newNormals && normals) {
        newNormals[newIdx * 3] = normals.getX(oldIdx);
        newNormals[newIdx * 3 + 1] = normals.getY(oldIdx);
        newNormals[newIdx * 3 + 2] = normals.getZ(oldIdx);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(newPositions, 3));
    if (newNormals) {
      geo.setAttribute("normal", new THREE.BufferAttribute(newNormals, 3));
    }
    geo.setIndex(new THREE.BufferAttribute(new Uint32Array(newIndices), 1));
    geo.computeBoundingBox();

    results.push(geo);
  }

  // Sort by bounding box center X so the order is spatially consistent (left to right)
  results.sort((a, b) => {
    const ca = new THREE.Vector3();
    const cb = new THREE.Vector3();
    a.boundingBox!.getCenter(ca);
    b.boundingBox!.getCenter(cb);
    return ca.x - cb.x;
  });

  return results;
}
