
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
        const internalH = (roofType === 'over' ? H - T : H) - (hasKickplate ? KH : 0) - T;
        const bH = internalH + 15; // + groove
        const bW = floorW + 15;
        list.push({ name: 'Fondo (MDF)', w: bW, l: bH, q: 1, mat: 'MDF 3mm' });
    }

    // 6. Distribution (Repisas u Divisiones)
    let sD = hasBacking ? D - 20 : D;
    if (state.hasDoors && state.hingeType === 'internal') {
        sD = sD - T - 2; // Recess for door
    }

    const intH = H - (hasKickplate ? KH : 0) - (2 * T); // Internal Height

    if (state.distType === 'vertical') {
        // Vertical Mode (Main: Vertical Dividers)
        const dCount = parseInt(state.dividersCount);
        if (dCount > 0) {
            list.push({ name: 'División Vertical', w: sD, l: intH, q: dCount, mat: 'Melamine' });

            // Sub-divisions: Shelves per column
            const subShelves = state.subShelves || [];
            let totalSubShelves = 0;
            // Iterate columns (dCount + 1 spaces)
            for (let i = 0; i <= dCount; i++) {
                totalSubShelves += (subShelves[i] || 0);
            }

            if (totalSubShelves > 0) {
                const colSpace = (floorW - (dCount * T)) / (dCount + 1);
                list.push({ name: 'Repisa Secundaria', w: sD, l: colSpace, q: totalSubShelves, mat: 'Melamine' });
            }
        }
    } else {
        // Horizontal Mode (Main: Shelves)
        const sCount = parseInt(shelvesCount);
        if (sCount > 0) {
            list.push({ name: 'Repisas', w: sD, l: floorW, q: sCount, mat: 'Melamine' });

            // Sub-divisions: Verticals per row
            const subCols = state.subCols || [];
            let totalSubCols = 0;
            // Iterate rows (sCount + 1 spaces)
            for (let i = 0; i <= sCount; i++) {
                totalSubCols += (subCols[i] || 0);
            }

            if (totalSubCols > 0) {
                const rowSpace = (intH - (sCount * T)) / (sCount + 1);
                list.push({ name: 'División Secundaria', w: sD, l: rowSpace, q: totalSubCols, mat: 'Melamine' });
            }
        }
    }

    // 7. Doors (Puertas)
    if (state.hasDoors && state.doorCount > 0) {
        let dW, dH;
        const gap = 3; // 3mm gap standard
        const N = parseInt(state.doorCount);

        // Opening Height calculation:
        const internalH = H - (hasKickplate ? KH : 0) - (2 * T);
        const internalW = W - (2 * T);

        if (state.hingeType === 'internal') {
            dH = internalH - gap;
            dW = (internalW / N) - gap;
        } else {
            // Lateral or Central (Overlay)
            dH = (H - (hasKickplate ? KH : 0)) - gap;

            if (state.hingeType === 'lateral') {
                dW = (W / N) - gap;
            } else {
                // Central / Half Overlay
                dW = ((W - (T / 2) * 2) / N) - gap;
            }
        }

        list.push({ name: `Puerta (${state.hingeType})`, w: dW, l: dH, q: N, mat: 'Melamine' });
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
