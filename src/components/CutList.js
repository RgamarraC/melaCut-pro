
// Logic to generate cut list
export function calculate(state) {
    const list = [];
    const { width: W, height: H, depth: D, thickness: T, hasKickplate, kickplateHeight: KH, hasBacking, roofType, shelvesCount } = state;

    // 1. Laterales (Sides)
    const sideH = (roofType === 'over') ? H - T : H;
    list.push({ name: 'Lateral', w: D, l: sideH, q: 2, mat: 'Melamine' });

    // 2. Techo (Roof)
    const roofW = (roofType === 'over') ? W : W - (2 * T);
    list.push({ name: 'Techo', w: D, l: roofW, q: 1, mat: 'Melamine' });

    // 3. Piso (Floor)
    const floorW = W - (2 * T);
    list.push({ name: 'Piso', w: D, l: floorW, q: 1, mat: 'Melamine' });

    // 4. Zócalos (Kickplate)
    if (hasKickplate) {
        list.push({ name: 'Zócalo Frontal/Trasero', w: KH, l: floorW, q: 2, mat: 'Melamine' });
    }

    // 5. Backing (Fondo)
    if (hasBacking) {
        // Simple approx calculation
        const internalH = (roofType === 'over' ? H - T : H) - (hasKickplate ? KH : 0) - T;
        const bH = internalH + 15; // + groove
        const bW = floorW + 15;
        list.push({ name: 'Fondo (MDF)', w: bW, l: bH, q: 1, mat: 'MDF 3mm' });
    }

    // 6. Shelves (Repisas)
    const sCount = parseInt(shelvesCount);
    if (sCount > 0) {
        // Shelf width = inside width
        // Shelf depth = inside depth (minus backing gap usually 20mm)
        const sD = hasBacking ? D - 20 : D;
        list.push({ name: 'Repisas', w: sD, l: floorW, q: sCount, mat: 'Melamine' });
    }

    return list;
}

export function renderTable(list) {
    const tbody = document.querySelector('#cut-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    let total = 0;

    list.forEach(item => {
        total += item.q;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span style="font-weight:600">${item.name}</span></td>
            <td>${item.q}</td>
            <td>${Math.round(item.l)}</td>
            <td>${Math.round(item.w)}</td>
            <td><span class="badge-${item.mat.includes('MDF') ? 'mdf' : 'mel'}">${item.mat}</span></td>
        `;
        tbody.appendChild(tr);
    });

    const countEl = document.getElementById('total-pieces');
    if (countEl) countEl.innerText = total + " Piezas";
}
