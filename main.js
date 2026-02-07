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
    shelvesCount: 3,

    // View State
    view: '3d',
    wireframe: false
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

    if (state.view === '3d') {
        generate3D(state);
    } else {
        generate2D(state);
    }

    // Update Cut List (Always)
    const cutList = calculate(state);
    renderTable(cutList);

    // UI Text
    document.getElementById('spaces-count').innerText = state.shelvesCount + 1;
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

// Bind Toggles
document.querySelectorAll('.toggle-opt').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const val = e.target.dataset.roof;
        if (val) {
            state.roofType = val;
            document.querySelectorAll('.toggle-opt').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            update();
        }
    });
});

// View Toggles
const btn2D = document.getElementById('view-2d');
const btn3D = document.getElementById('view-3d');
// Wireframe button removed by user request

btn2D.addEventListener('click', () => {
    state.view = '2d';
    btn2D.classList.add('active');
    btn3D.classList.remove('active');

    // Switch Containers
    canvasContainer.style.display = 'none';
    schematicContainer.style.display = 'block';

    document.querySelector('.viz-header h2').innerText = 'VISTA FRONTAL (ESQUEMÁTICA)';
    update();
});

btn3D.addEventListener('click', () => {
    state.view = '3d';
    btn3D.classList.add('active');
    btn2D.classList.remove('active');

    // Switch Containers
    canvasContainer.style.display = 'block';
    schematicContainer.style.display = 'none';

    document.querySelector('.viz-header h2').innerText = 'Visualización 3D';
    update();
    // Trigger 3D resize in case container size changed (though display:none usually needs it)
    generate3D(state);
});

// Window Resize Handling for 2D
window.addEventListener('resize', () => {
    if (state.view === '2d') generate2D(state);
});

// Initial Render
update();
