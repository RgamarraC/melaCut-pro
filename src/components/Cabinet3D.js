import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Configuration & State ---
let scene, camera, renderer, controls;
let containerEl;
let cabinetGroup;
let labelsContainer; // HTML Overlay for dimensions
let isWireframe = false;
let currentView = '3d';
let currentCabinetState = null; // Store state for redraws

// --- Materials ---
const matMelamine = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.2,
    metalness: 0.1,
});

const matInvisible = new THREE.MeshBasicMaterial({
    visible: false
});

const matEdges3D = new THREE.LineBasicMaterial({
    color: 0x000000,
    linewidth: 1,
    transparent: true,
    opacity: 0.2
});

const matEdges2D = new THREE.LineBasicMaterial({
    color: 0x3b82f6, // Royal Blue
    linewidth: 2
});

const matSchematicFill = new THREE.MeshBasicMaterial({
    color: 0xeff6ff, // Very light blue
    side: THREE.FrontSide
});


export function init(container) {
    containerEl = container;

    // Create Labels Overlay
    labelsContainer = document.createElement('div');
    labelsContainer.style.position = 'absolute';
    labelsContainer.style.top = '0';
    labelsContainer.style.left = '0';
    labelsContainer.style.width = '100%';
    labelsContainer.style.height = '100%';
    labelsContainer.style.pointerEvents = 'none'; // Passthrough
    labelsContainer.style.overflow = 'hidden';
    containerEl.appendChild(labelsContainer);

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf9fafb);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Initial Camera
    const aspect = container.clientWidth / container.clientHeight;
    camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 5000);
    camera.position.set(2000, 1500, 2000);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 100;
    controls.maxDistance = 6000;
    controls.target.set(0, 900, 0);

    setupLights();

    cabinetGroup = new THREE.Group();
    scene.add(cabinetGroup);

    // Resize
    const resizeObserver = new ResizeObserver(() => {
        handleResize();
        if (currentView === '2d') updateDimensions();
    });
    resizeObserver.observe(container);

    animate();
}

function setupLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
    mainLight.position.set(1000, 2000, 1000);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    scene.add(mainLight);
    const fillLight = new THREE.DirectionalLight(0xeef2ff, 0.4);
    fillLight.position.set(-1000, 500, -1000);
    scene.add(fillLight);
}

function handleResize() {
    if (!renderer || !camera) return;
    const w = containerEl.clientWidth;
    const h = containerEl.clientHeight;
    const aspect = w / h;

    if (camera.isPerspectiveCamera) {
        camera.aspect = aspect;
    } else {
        const frustumSize = 2200;
        camera.left = -frustumSize * aspect / 2;
        camera.right = frustumSize * aspect / 2;
        camera.top = frustumSize / 2;
        camera.bottom = -frustumSize / 2;
    }

    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);

    // Update labels position if moving (mostly for 2D zoom/pan)
    if (currentView === '2d') {
        // Debounce or just update? Update is fine for simple DOM
        updateDimensions();
    }
}

// --- Dimensions System ---

function createLabel(text, x, y, className = 'dim-label') {
    const div = document.createElement('div');
    div.innerText = text;
    div.className = className;
    div.style.position = 'absolute';
    // Coordinates are screen based (0,0 top left)
    div.style.left = `${x}px`;
    div.style.top = `${y}px`;
    div.style.transform = 'translate(-50%, -50%)'; // Center pivot
    labelsContainer.appendChild(div);
    return div;
}

function updateDimensions() {
    if (!currentCabinetState) return;
    labelsContainer.innerHTML = ''; // Clear layout

    const { width: W, height: H, hasKickplate } = currentCabinetState;

    // Helper to project 3D point to Screen
    function toScreen(x, y, z) {
        const vec = new THREE.Vector3(x, y, z);
        vec.project(camera);
        const cx = (vec.x * .5 + .5) * containerEl.clientWidth;
        const cy = (-vec.y * .5 + .5) * containerEl.clientHeight;
        return { x: cx, y: cy };
    }

    // 1. Total Height Label (Left)
    const topP = toScreen(-W / 2, H, 0);
    const botP = toScreen(-W / 2, 0, 0);
    const midY = (topP.y + botP.y) / 2;

    // Draw vertical line logic could be CSS borders, but let's stick to text for simplicity
    createLabel(`${H}mm`, topP.x - 40, midY, 'dim-label height-label');

    // 2. Width Label (Top) (Optional, user ref showed height)
    // createLabel(`${W}mm`, toScreen(0, H, 0).x, topP.y - 20, 'dim-label width-label');

    // 3. Kickplate (Zócalo)
    if (hasKickplate) {
        const kpP = toScreen(0, currentCabinetState.kickplateHeight / 2, 0);
        createLabel("Zócalo", kpP.x, kpP.y, 'dim-label zocalo-label');
    }
}


// --- View Logic ---

export function updateViewMode(mode) {
    currentView = mode;
    const w = containerEl.clientWidth;
    const h = containerEl.clientHeight;
    const aspect = w / h;

    if (mode === '2d') {
        const frustumSize = 2200;
        camera = new THREE.OrthographicCamera(
            frustumSize * aspect / -2,
            frustumSize * aspect / 2,
            frustumSize / 2,
            frustumSize / -2,
            1,
            5000
        );
        camera.position.set(0, 900, 2000);
        camera.lookAt(0, 900, 0);

        controls.object = camera;
        controls.enableRotate = false;
        controls.reset();

        scene.background = new THREE.Color(0xffffff);
        labelsContainer.style.display = 'block';

    } else {
        camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 5000);
        camera.position.set(2000, 1500, 2000);
        camera.lookAt(0, 900, 0);

        controls.object = camera;
        controls.enableRotate = true;

        scene.background = new THREE.Color(0xf9fafb);
        labelsContainer.style.display = 'none'; // Hide labels in 3D
    }

    updateMaterialVisibility();
}

export function setWireframe(enabled) {
    isWireframe = enabled;
    updateMaterialVisibility();
}

function updateMaterialVisibility() {
    cabinetGroup.traverse((child) => {
        if (child.isMesh) {
            // FIX: Don't set child.visible = false, change material instead!
            if (currentView === '2d') {
                // In 2D, we want to hide the "Solid" but keep "Edges" visible
                // Child edges are children of mesh.
                // If we default to Invisible Material, edges still show usually? No, object handles visibility.
                // We must swap material or set visible = true but opacity 0.

                // Use Schematic Fill for 2D? (Light blue)
                child.material = matSchematicFill;
                child.visible = true;
            } else {
                // 3D Mode
                if (isWireframe) {
                    child.material = matInvisible; // Hide faces
                } else {
                    child.material = child.userData.originalMat || matMelamine;
                }
                child.visible = true;
            }
        }

        if (child.isLineSegments) { // Edges
            if (currentView === '2d') {
                child.material = matEdges2D;
                child.visible = true;
            } else {
                if (isWireframe) {
                    child.material = matEdges3D;
                    child.material.opacity = 1;
                    child.material.color.setHex(0x000000);
                } else {
                    child.material = matEdges3D;
                    child.material.opacity = 0.2;
                }
                child.visible = true;
            }
        }
    });
}

function createBoard(w, h, d, x, y, z, mat = matMelamine) {
    const geometry = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.originalMat = mat; // Store for restore

    const edgesGeo = new THREE.EdgesGeometry(geometry);
    const edges = new THREE.LineSegments(edgesGeo, matEdges3D.clone());
    mesh.add(edges);

    return mesh;
}

export function generate(state) {
    currentCabinetState = state;
    cabinetGroup.clear();

    const { width: W, height: H, depth: D, thickness: T, hasKickplate, kickplateHeight: KH, roofType, shelvesCount, hasBacking } = state;
    const add = (w, h, d, x, y, z, mat) => {
        const mesh = createBoard(w, h, d, x, y, z, mat);
        cabinetGroup.add(mesh);
    };

    // 1. Sides
    const sideH = (roofType === 'over') ? H - T : H;
    add(T, sideH, D, -W / 2 + T / 2, sideH / 2, 0);
    add(T, sideH, D, W / 2 - T / 2, sideH / 2, 0);

    // 2. Roof
    const roofW = (roofType === 'over') ? W : W - 2 * T;
    const roofY = H - T / 2;
    add(roofW, T, D, 0, roofY, 0);

    // 3. Floor
    const floorY = hasKickplate ? KH + T / 2 : T / 2;
    const floorW = W - 2 * T;
    add(floorW, T, D, 0, floorY, 0);

    // 4. Kickplate
    if (hasKickplate) {
        add(floorW, KH, T, 0, KH / 2, D / 2 - T / 2 - 20);
        // Back kickplate hidden in 2D typically if full opacity, but here wireframe style helps
        add(floorW, KH, T, 0, KH / 2, -D / 2 + T / 2);
    }

    // 5. Backing
    if (hasBacking) {
        const internalH = (roofType === 'over' ? H - T : H) - (hasKickplate ? KH : 0) - T;
        // Don't draw backing in 2D? Reference is schematic. Let's keep it but it might overlap.
        // Usually backing is distinct material.
        const mat = matMelamine.clone(); // Placeholder
        add(floorW + 15, internalH + 15, 3, 0, floorY + internalH / 2, -D / 2 + T, mat); // Backing mat
    }

    // 6. Shelves
    if (shelvesCount > 0) {
        const topY = roofY - T / 2;
        const botY = floorY + T / 2;
        const clearH = topY - botY;
        const space = (clearH - (shelvesCount * T)) / (shelvesCount + 1);
        const sD = hasBacking ? D - 20 : D;

        for (let i = 1; i <= shelvesCount; i++) {
            const y = botY + (space * i) + (T * (i - 1)) + T / 2;
            add(floorW, T, sD, 0, y, hasBacking ? 10 : 0);
        }
    }

    updateMaterialVisibility();
    if (currentView === '2d') updateDimensions();
}
