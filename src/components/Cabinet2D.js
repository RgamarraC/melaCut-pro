
let containerEl;
let svg;

export function init(container) {
    containerEl = container;
    containerEl.innerHTML = '';

    // Create SVG Element
    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.style.display = 'block';

    // Add definitions for markers if needed
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
    marker.setAttribute("id", "arrow");
    marker.setAttribute("viewBox", "0 0 10 10");
    marker.setAttribute("refX", "5");
    marker.setAttribute("refY", "5");
    marker.setAttribute("markerWidth", "6");
    marker.setAttribute("markerHeight", "6");
    marker.setAttribute("orient", "auto-start-reverse");

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
    path.setAttribute("fill", "#6b7280");

    marker.appendChild(path);
    defs.appendChild(marker);
    svg.appendChild(defs);

    containerEl.appendChild(svg);
}

// Helpers
function createRect(x, y, w, h, fill = "none", stroke = "#2563eb", strokeWidth = "2") {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", x);
    rect.setAttribute("y", y);
    rect.setAttribute("width", w);
    rect.setAttribute("height", h);
    rect.setAttribute("fill", fill);
    rect.setAttribute("stroke", stroke);
    rect.setAttribute("stroke-width", strokeWidth);
    // Sharp edges
    rect.setAttribute("shape-rendering", "crispEdges");
    return rect;
}

function createText(text, x, y, anchor = "middle", fill = "#374151") {
    const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t.setAttribute("x", x);
    t.setAttribute("y", y);
    t.setAttribute("text-anchor", anchor);
    t.setAttribute("fill", fill);
    t.setAttribute("font-size", "14px");
    t.setAttribute("font-family", "Inter, sans-serif");
    t.setAttribute("font-weight", "600");
    t.textContent = text;
    return t;
}

function createLine(x1, y1, x2, y2, color = "#9ca3af") {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x1);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x2);
    line.setAttribute("y2", y2);
    line.setAttribute("stroke", color);
    line.setAttribute("stroke-width", "1");
    return line;
}

export function generate(state) {
    if (!svg) return;

    // Clear previous content (keep defs)
    const defs = svg.querySelector('defs');
    svg.innerHTML = '';
    if (defs) svg.appendChild(defs);

    const { width: W, height: H, thickness: T, hasKickplate, kickplateHeight: KH, shelvesCount, roofType } = state;

    // Auto-Scale Logic
    // Container size
    const cw = containerEl.clientWidth;
    const ch = containerEl.clientHeight;
    const padding = 60; // Space for labels

    // Calculate Scale
    // We need to fit W x H into (cw-pad) x (ch-pad)
    const scaleX = (cw - padding * 2) / W;
    const scaleY = (ch - padding * 2) / H;
    const scale = Math.min(scaleX, scaleY);

    // Center it
    const drawW = W * scale;
    const drawH = H * scale;
    const startX = (cw - drawW) / 2;
    const startY = (ch - drawH) / 2;

    // Group for the drawing
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");

    // -- Drawing Logic (Frontal View) --

    // 1. Sides
    // Left
    const sideH = (roofType === 'over') ? H - T : H;
    g.appendChild(createRect(startX, startY + (H - sideH) * scale, T * scale, sideH * scale, "#eff6ff"));
    // Right
    g.appendChild(createRect(startX + (W - T) * scale, startY + (H - sideH) * scale, T * scale, sideH * scale, "#eff6ff"));

    // 2. Roof
    const roofY = startY;
    const roofW = (roofType === 'over') ? W : W - 2 * T;
    const roofX = (roofType === 'over') ? startX : startX + T * scale;
    g.appendChild(createRect(roofX, roofY, roofW * scale, T * scale, "#eff6ff"));

    // 3. Floor
    const floorY = (hasKickplate) ? startY + (H - KH - T) * scale : startY + (H - T) * scale;
    const floorW = W - 2 * T;
    g.appendChild(createRect(startX + T * scale, floorY, floorW * scale, T * scale, "#eff6ff"));

    // 4. Kickplate
    if (hasKickplate) {
        // Front kickplate
        const kpY = startY + (H - KH) * scale;
        g.appendChild(createRect(startX + T * scale, kpY, floorW * scale, KH * scale, "#f3f4f6", "#9ca3af", "1"));

        // Label
        g.appendChild(createText("Zócalo", startX + W / 2 * scale, kpY + KH / 2 * scale + 5));
    }

    // 5. Internal Distribution
    const distType = state.distType || 'horizontal';

    // Limits (Y relative to top H)
    const topYPos = T;
    const botYPos = hasKickplate ? H - KH - T : H - T;
    const clearH = botYPos - topYPos;
    const clearW = floorW; // W - 2T

    if (distType === 'vertical') {
        const dCount = parseInt(state.dividersCount || 0);
        const subShelves = state.subShelves || [];

        const space = (clearW - (dCount * T)) / (dCount + 1);

        if (dCount > 0) {
            // Draw Verticals
            for (let i = 1; i <= dCount; i++) {
                const xPos = T + (space * i) + (T * (i - 1));
                g.appendChild(createRect(
                    startX + xPos * scale,
                    startY + topYPos * scale,
                    T * scale,
                    clearH * scale,
                    "#eff6ff"
                ));
            }
        }

        // Draw Sub-Shelves (Iterate Columns 0..dCount)
        for (let c = 0; c <= dCount; c++) {
            const count = subShelves[c] || 0;
            if (count > 0) {
                const colX = T + c * (space + T);
                const subSpace = (clearH - (count * T)) / (count + 1);

                for (let s = 1; s <= count; s++) {
                    const yPos = topYPos + (subSpace * s) + (T * (s - 1));
                    g.appendChild(createRect(
                        startX + colX * scale,
                        startY + yPos * scale,
                        space * scale,
                        T * scale,
                        "#eff6ff",
                        "#60a5fa",
                        "1"
                    ));
                }
            }
        }

    } else {
        // Horizontal (Shelves)
        const sCount = parseInt(shelvesCount || 0);
        const subCols = state.subCols || [];

        const space = (clearH - (sCount * T)) / (sCount + 1);

        if (sCount > 0) {
            // Draw Shelves
            for (let i = 1; i <= sCount; i++) {
                const yPos = topYPos + (space * i) + (T * (i - 1));
                g.appendChild(createRect(
                    startX + T * scale,
                    startY + yPos * scale,
                    clearW * scale,
                    T * scale,
                    "#eff6ff"
                ));
            }
        }

        // Draw Sub-Verticals (Iterate Rows 0..sCount)
        for (let r = 0; r <= sCount; r++) {
            const count = subCols[r] || 0;
            if (count > 0) {
                const rowY = topYPos + r * (space + T);
                const subSpace = (clearW - (count * T)) / (count + 1);

                for (let v = 1; v <= count; v++) {
                    const xPos = T + (subSpace * v) + (T * (v - 1));
                    g.appendChild(createRect(
                        startX + xPos * scale,
                        startY + rowY * scale,
                        T * scale,
                        space * scale,
                        "#eff6ff",
                        "#60a5fa",
                        "1"
                    ));
                }
            }
        }
    }

    svg.appendChild(g);

    // -- Dimensions --

    // Height Dimension (Left)
    const lineX = startX - 20;
    const topDimY = startY;
    const botDimY = startY + drawH;

    // Main line
    svg.appendChild(createLine(lineX, topDimY, lineX, botDimY));
    // Ticks
    svg.appendChild(createLine(lineX - 5, topDimY, lineX + 5, topDimY));
    svg.appendChild(createLine(lineX - 5, botDimY, lineX + 5, botDimY));
    // Text
    const hText = createText(`${H}mm`, lineX - 10, startY + drawH / 2, "end");
    svg.appendChild(hText);

    // Width Dimension (Top)
    const lineY = startY - 20;
    const leftDimX = startX;
    const rightDimX = startX + drawW;

    svg.appendChild(createLine(leftDimX, lineY, rightDimX, lineY));
    svg.appendChild(createLine(leftDimX, lineY - 5, leftDimX, lineY + 5));
    svg.appendChild(createLine(rightDimX, lineY - 5, rightDimX, lineY + 5));

    const wText = createText(`${W}mm`, startX + drawW / 2, lineY - 10, "middle");
    svg.appendChild(wText);
}
