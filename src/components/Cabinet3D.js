
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;
// Materials
let matMelamine, matKickplate, matMDF, matDoor;
let group; // Cabinet Group
let isWireframe = false;

export function init(container) {
    // 1. Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    // 2. Camera
    camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 5000);
    camera.position.set(2000, 2000, 2500);

    // 3. Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // 5. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(1000, 2000, 1000);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // 6. Materials
    // White Melamine
    matMelamine = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0.1 });
    // Grey Kickplate
    matKickplate = new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.8 });
    // MDF Backing (Brownish)
    matMDF = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.9 });
    // Door (Semi-transparent Blueish for visualization)
    matDoor = new THREE.MeshStandardMaterial({
        color: 0xaaddff,
        transparent: true,
        opacity: 0.4,
        roughness: 0.2,
        side: THREE.DoubleSide
    });

    // 7. Group
    group = new THREE.Group();
    scene.add(group);

    // 8. Animation Loop
    animate();

    // Resize Observer
    const obs = new ResizeObserver(() => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });
    obs.observe(container);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

export function updateViewMode(mode) {
    // Helper if needed unique logic per view
}

export function setWireframe(bool) {
    isWireframe = bool;
    if (group) {
        group.children.forEach(mesh => {
            if (mesh.material) mesh.material.wireframe = isWireframe;
        });
    }
}

// Helper to add Box
function add(w, h, d, x, y, z, mat = matMelamine) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat.clone()); // Clone to allow individual wireframe toggles potentially
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Edges for definition
    const edges = new THREE.EdgesGeometry(geo);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xcccccc }));
    mesh.add(line);

    group.add(mesh);
    return mesh;
}

export function generate(state) {
    if (!group) return;

    // Clear
    while (group.children.length > 0) {
        group.remove(group.children[0]);
    }

    const { width: W, height: H, depth: D, thickness: T, hasKickplate, kickplateHeight: KH, hasBacking, roofType, shelvesCount } = state;

    // -- Generate Geometries --

    // 1. Sides
    const sideH = (roofType === 'over') ? H - T : H;
    // Left
    add(T, sideH, D, -W / 2 + T / 2, sideH / 2, 0);
    // Right
    add(T, sideH, D, W / 2 - T / 2, sideH / 2, 0);

    // 2. Roof
    const roofW = (roofType === 'over') ? W : W - 2 * T;
    const roofY = (roofType === 'over') ? H - T / 2 : H - T / 2;
    add(roofW, T, D, 0, roofY, 0);

    // 3. Floor
    const floorY = (hasKickplate) ? KH + T / 2 : T / 2;
    const floorW = W - 2 * T;
    add(floorW, T, D, 0, floorY, 0);

    // 4. Kickplate
    if (hasKickplate) {
        add(floorW, KH, T, 0, KH / 2, D / 2 - T / 2 - 20);
        // Back kickplate
        add(floorW, KH, T, 0, KH / 2, -D / 2 + T / 2);
    }

    // 5. Backing
    if (hasBacking) {
        const internalH = (roofType === 'over' ? H - T : H) - (hasKickplate ? KH : 0) - T;
        add(floorW + 15, internalH + 15, 3, 0, floorY + internalH / 2, -D / 2 + T, matMDF);
    }

    // 6. Internal Distribution (Shelves or Dividers)
    const distType = state.distType || 'horizontal';

    // Limits
    const topY = roofY - T / 2;
    const botY = floorY + T / 2;
    const clearH = topY - botY;

    // Depth handled (recess for internal doors)
    let sD = hasBacking ? D - 20 : D;
    let zPos = hasBacking ? 10 : 0;

    if (state.hasDoors && state.hingeType === 'internal') {
        const delta = T + 2;
        sD -= delta;
        zPos -= (delta / 2);
    }

    if (distType === 'vertical') {
        // Vertical Dividers
        const dCount = parseInt(state.dividersCount || 0);
        const subShelves = state.subShelves || [];

        const clearW = floorW; // W - 2T
        // Spacing
        const space = (clearW - (dCount * T)) / (dCount + 1);

        // Start X (Left inner face) -> -W/2 + T
        const startX = -W / 2 + T;

        if (dCount > 0) {
            for (let i = 1; i <= dCount; i++) {
                const x = startX + (space * i) + (T * (i - 1)) + T / 2;
                const y = botY + clearH / 2;
                add(T, clearH, sD, x, y, zPos);
            }
        }

        // Sub-Shelves
        for (let c = 0; c <= dCount; c++) {
            const count = subShelves[c] || 0;
            if (count > 0) {
                const subSpace = (clearH - (count * T)) / (count + 1);
                const colStartX = startX + c * (space + T);
                const colCenterX = colStartX + space / 2;
                for (let s = 1; s <= count; s++) {
                    const y = botY + (subSpace * s) + (T * (s - 1)) + T / 2;
                    add(space, T, sD, colCenterX, y, zPos);
                }
            }
        }

    } else {
        // Horizontal Shelves (Default)
        const sCount = parseInt(state.shelvesCount || 0);
        const subCols = state.subCols || [];

        const space = (clearH - (sCount * T)) / (sCount + 1);

        if (sCount > 0) {
            for (let i = 1; i <= sCount; i++) {
                const y = botY + (space * i) + (T * (i - 1)) + T / 2;
                add(floorW, T, sD, 0, y, zPos);
            }
        }

        // Sub-Verticals
        const clearW = floorW;
        const startX = -W / 2 + T;

        for (let r = 0; r <= sCount; r++) {
            const count = subCols[r] || 0;
            if (count > 0) {
                const subSpace = (clearW - (count * T)) / (count + 1);
                const rowStartY = botY + r * (space + T);
                const rowCenterY = rowStartY + space / 2;
                for (let v = 1; v <= count; v++) {
                    const x = startX + (subSpace * v) + (T * (v - 1)) + T / 2;
                    add(T, space, sD, x, rowCenterY, zPos);
                }
            }
        }
    }

    // 7. Doors
    if (state.hasDoors && state.doorCount > 0) {
        const gap = 3;
        const N = parseInt(state.doorCount);
        const internalW = W - 2 * T;
        // Opening Height for internal logic
        const internalH_Opening = H - (hasKickplate ? KH : 0) - 2 * T;

        // Door Dimensions Calculation (Duplicate logic from CutList for Viz)
        // Simplified Viz logic:
        let dW, dH, dY, dZ;

        // Z Position
        if (state.hingeType === 'internal') {
            dZ = D / 2 - T / 2; // Set inside face flush with front?
            // Actually Internal means flush with Frame Front edge.
            // Frame Front Z = D/2.
            // Door Z = D/2 - T/2. (Center of door thickness).
            dZ = D / 2 - T / 2;

            dH = internalH_Opening - gap;
            const widthSpace = internalW;
            dW = (widthSpace / N) - gap;
            // Center vertically between floor board top and roof board bottom
            dY = (floorY + roofY) / 2;
        } else {
            // Overlay (Lateral/Central)
            // Sits in front of cabinet.
            dZ = D / 2 + T / 2 + 2; // +2mm gap from frame

            const frontH = H - (hasKickplate ? KH : 0);
            dH = frontH - gap;
            dY = (hasKickplate ? KH : 0) + frontH / 2;

            if (state.hingeType === 'lateral') {
                dW = (W / N) - gap;
            } else {
                dW = ((W - T) / N) - gap;
            }
        }

        const startDX = -W / 2 + (W - N * (dW + gap)) / 2 + dW / 2; // Centered
        // Actually simplified positioning:
        // Internal starts at -W/2 + T + ... 

        // Let's use simplified X spacing logic for Viz
        const totalDoorW = N * dW + (N - 1) * gap;
        let cX = -totalDoorW / 2 + dW / 2;

        for (let i = 0; i < N; i++) {
            add(dW, dH, T, cX + i * (dW + gap), dY, dZ, matDoor);
        }
    }
}
