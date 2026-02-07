import { init as init3D, updateViewMode, setWireframe, generate as generate3D } from './src/components/Cabinet3D.js';
import { init as init2D, generate as generate2D } from './src/components/Cabinet2D.js';
import { calculate, renderTable } from './src/components/CutList.js';
// We need to manage state globally or in a module.
// Let's create a simple state manager in InputPanel or here.
// For simplicity, let's adapt InputPanel to be the state source? No, let's keep Main as controller.

const state = {
    height: 1800,
    width: 900,
    depth: 500,
    thickness: 18,
    hasBacking: true,
    roofType: 'between',
    hasKickplate: true,
    kickplateHeight: 100,
    kickplateHeight: 100,
    shelvesCount: 3,

    // Distribution
    distType: 'horizontal', // 'horizontal' or 'vertical'
    dividersCount: 1,
    subCols: [], // Array of counts per space
    subShelves: [], // Array of counts per column

    // View State
    view: '2d', // Default to 2d
    view: '3d',
    wireframe: false,

    // Doors
    hasDoors: false,
    hingeType: 'lateral',
    doorCount: 2
};

// --- DOM References ---
const canvasContainer = document.getElementById('canvas-container');
const schematicContainer = document.getElementById('schematic-container');

// --- Init Views ---
init3D(canvasContainer);
init2D(schematicContainer);

// --- Event Listeners (Controller Logic) ---
function update() {
    // We update logic based on active view to save resources?
    // Or just update both usually is fine for simple app.

    if (state.view === '2d') {
        generate2D(state);
    } else if (state.view === '3d') {
        generate3D(state);
    } else {
        // Both
        generate2D(state);
        generate3D(state);
    }

    // Update Cut List (Always)
    const cutList = calculate(state);
    renderTable(cutList);

    // UI Text
    // UI Text
    document.getElementById('spaces-count').innerText = state.shelvesCount + 1;
    document.getElementById('cols-count').innerText = state.dividersCount + 1;

    // Toggle Config Visibility
    document.getElementById('dist-horizontal').style.display = (state.distType === 'horizontal') ? 'block' : 'none';
    document.getElementById('dist-vertical').style.display = (state.distType === 'vertical') ? 'block' : 'none';

    renderSubDivInputs();
}


// Bind Inputs
function bindInput(id, key, parser = parseInt) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', (e) => {
        state[key] = parser(e.target.value);
        update();
    });
}

function bindCheckbox(id, key) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', (e) => {
        state[key] = e.target.checked;
        update();
    });
}

// Bind all standard inputs
bindInput('height', 'height');
bindInput('width', 'width');
bindInput('depth', 'depth');
bindInput('thickness', 'thickness');
bindInput('shelves-count', 'shelvesCount');
bindInput('kickplate-height', 'kickplateHeight');

bindCheckbox('has-backing', 'hasBacking');
bindCheckbox('has-kickplate', 'hasKickplate');

// Door bindings
bindCheckbox('has-doors', 'hasDoors');
bindInput('hinge-type', 'hingeType', (v) => v); // String parser
bindInput('door-count', 'doorCount');

// Toggle Door Config Visibility
document.getElementById('has-doors').addEventListener('change', (e) => {
    const config = document.getElementById('doors-config');
    config.style.display = e.target.checked ? 'block' : 'none';
});

// Bind Door Count Buttons (since stepUp/Down don't trigger input event automatically)
document.querySelectorAll('.btn-qty').forEach(btn => {
    btn.addEventListener('click', () => {
        const input = document.getElementById('door-count');
        // The onclick in HTML happens first, updating the value.
        // We just need to sync state.
        state.doorCount = parseInt(input.value);
        update();
    });
});

// Bind Toggles
document.querySelectorAll('.toggle-opt').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Roof Toggle
        if (e.target.dataset.roof) {
            state.roofType = e.target.dataset.roof;
            // Only deactivate roof toggles
            e.target.parentElement.querySelectorAll('.toggle-opt').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            update();
        }
        // Distribution Toggle
        if (e.target.dataset.dist) {
            state.distType = e.target.dataset.dist;
            e.target.parentElement.querySelectorAll('.toggle-opt').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            update();
        }
    });
});

bindInput('dividers-count', 'dividersCount');

// Dynamic Sub-Inputs Logic
function renderSubDivInputs() {
    const hContainer = document.getElementById('sub-cols-container');
    const vContainer = document.getElementById('sub-shelves-container');

    if (!hContainer || !vContainer) return;

    if (state.distType === 'horizontal') {
        const spaces = state.shelvesCount + 1;
        syncInputs(hContainer, spaces, state.subCols, 'subCol');
        vContainer.innerHTML = '';
    } else {
        const spaces = state.dividersCount + 1;
        syncInputs(vContainer, spaces, state.subShelves, 'subShelf');
        hContainer.innerHTML = '';
    }
}

function syncInputs(container, count, dataArray, type) {
    // Ensure dataArray has correct length
    while (dataArray.length < count) dataArray.push(0);
    while (dataArray.length > count) dataArray.pop();

    // Check DOM
    const inputs = container.querySelectorAll('input');
    if (inputs.length === count) return; // Matches.

    // Re-build
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const div = document.createElement('div');
        const label = document.createElement('label');
        // Label logic
        let text = '';
        if (type === 'subCol') text = `Espacio ${i + 1}`;
        else text = `Columna ${i + 1}`;

        label.innerText = text;
        label.style.fontSize = '0.8rem';
        label.style.display = 'block';

        const input = document.createElement('input');
        input.type = 'number';
        input.min = 0;
        input.max = 5;
        input.value = dataArray[i];
        input.style.width = '100%';
        input.style.padding = '4px';

        input.addEventListener('input', (e) => {
            dataArray[i] = parseInt(e.target.value) || 0;
            update();
        });

        div.appendChild(label);
        div.appendChild(input);
        container.appendChild(div);
    }
}

// View Toggles
const btn2D = document.getElementById('view-2d');
const btn3D = document.getElementById('view-3d');
const btnBoth = document.getElementById('view-both');
const wrapper = document.querySelector('.canvas-wrapper');

function setView(mode) {
    state.view = mode;

    // UI Buttons
    [btn2D, btn3D, btnBoth].forEach(b => b.classList.remove('active'));
    if (mode === '2d') btn2D.classList.add('active');
    else if (mode === '3d') btn3D.classList.add('active');
    else btnBoth.classList.add('active');

    // Layout
    if (mode === 'both') {
        wrapper.style.display = 'flex';

        canvasContainer.style.display = 'block';
        canvasContainer.style.width = '50%';

        schematicContainer.style.display = 'block';
        schematicContainer.style.width = '50%';
        // Add border separator? Optional.
        schematicContainer.style.borderRight = '1px solid #e5e7eb';

        document.querySelector('.viz-header h2').innerText = 'Vista Combinada';
    } else if (mode === '2d') {
        wrapper.style.display = 'block';
        canvasContainer.style.display = 'none';
        canvasContainer.style.width = '100%';

        schematicContainer.style.display = 'block';
        schematicContainer.style.width = '100%';
        schematicContainer.style.borderRight = 'none';

        document.querySelector('.viz-header h2').innerText = 'Vista Frontal (Esquemática)';
    } else {
        wrapper.style.display = 'block';
        canvasContainer.style.display = 'block';
        canvasContainer.style.width = '100%';

        schematicContainer.style.display = 'none';
        schematicContainer.style.width = '100%';

        document.querySelector('.viz-header h2').innerText = 'Visualización 3D';
    }

    update();
    // Force regeneration to handle resize
    if (mode === 'both' || mode === '3d') generate3D(state);
    if (mode === 'both' || mode === '2d') generate2D(state);
}

btn2D.addEventListener('click', () => setView('2d'));
btn3D.addEventListener('click', () => setView('3d'));
btnBoth.addEventListener('click', () => setView('both'));

// Window Resize Handling
window.addEventListener('resize', () => {
    if (state.view !== '3d') generate2D(state);
});

// Initial Render (Force 2D)
setView('2d');
