// ============================================================
//  トップページ：作品一覧・作品詳細（モーダル）・写真の拡大表示
//  作品の中身は data/works.js に書きます。このファイルは基本的に触らなくてOK
// ============================================================

(function () {
    const works = window.WORKS || [];

    const grid = document.getElementById("worksMosaic");
    const modal = document.getElementById("workModal");
    const workDetail = document.getElementById("workDetail");
    const lightbox = document.getElementById("lightbox");
    const lightboxImage = document.getElementById("lightboxImage");

    let currentIndex = -1;          // 表示中の作品（works の何番目か）
    let galleryImages = [];         // 表示中の作品の写真（メイン画像 + gallery）
    let lightboxIndex = 0;

    function metaText(work) {
        return [work.category, work.year, work.place].filter(Boolean).join(" · ");
    }

    // ---- 一覧 ----

    grid.innerHTML = works.map((work, index) => `
        <div class="work size-${escapeHTML(work.size || "small")}" data-index="${index}">
            <div class="work-image">
                <img src="${escapeHTML(work.image)}" alt="${escapeHTML(work.title)}" loading="lazy">
                <div class="work-overlay">
                    <div class="work-title">${escapeHTML(work.title)}</div>
                    <div class="work-meta">${escapeHTML(metaText(work))}</div>
                </div>
            </div>
        </div>
    `).join("");

    grid.querySelectorAll(".work").forEach(el => {
        el.addEventListener("click", () => openWork(Number(el.dataset.index)));
    });

    // ---- すき間を埋める ----
    // CSS の dense 配置で上から詰めたあと、それでも残ったマス（主に最後の行）には
    // となりの作品（左 → 上 → 右 → 下の順に探す）を広げて入れ、一覧がきれいな長方形で終わるようにする

    // 配置（boxes）の空いたマスに、となりの作品を広げて入れる。残った穴の数を返す
    function growIntoGaps(boxes, rows, cols) {
        const cells = Array.from({ length: rows }, () => Array(cols).fill(null));
        const place = b => {
            for (let y = b.row; y < b.row + b.h; y++) {
                for (let x = b.col; x < b.col + b.w; x++) cells[y][x] = b;
            }
        };
        const isEmpty = (y0, y1, x0, x1) => {
            for (let y = y0; y <= y1; y++) {
                for (let x = x0; x <= x1; x++) {
                    if (y < 0 || x < 0 || y >= rows || x >= cols || cells[y][x]) return false;
                }
            }
            return true;
        };
        boxes.forEach(place);

        // 左 → 上 → 右 → 下 の順に、穴へ広げられる作品を探す
        const tryGrow = (y, x) => {
            const left = x > 0 ? cells[y][x - 1] : null;
            if (left && left.col + left.w === x && isEmpty(left.row, left.row + left.h - 1, x, x)) {
                left.w++; place(left); return true;
            }
            const up = y > 0 ? cells[y - 1][x] : null;
            if (up && up.row + up.h === y && isEmpty(y, y, up.col, up.col + up.w - 1)) {
                up.h++; place(up); return true;
            }
            const right = x < cols - 1 ? cells[y][x + 1] : null;
            if (right && right.col === x + 1 && isEmpty(right.row, right.row + right.h - 1, x, x)) {
                right.col--; right.w++; place(right); return true;
            }
            const down = y < rows - 1 ? cells[y + 1][x] : null;
            if (down && down.row === y + 1 && isEmpty(y, y, down.col, down.col + down.w - 1)) {
                down.row--; down.h++; place(down); return true;
            }
            return false;
        };

        let changed = true;
        while (changed) {
            changed = false;
            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    if (!cells[y][x] && tryGrow(y, x)) changed = true;
                }
            }
        }
        return cells.flat().filter(c => !c).length;
    }

    function emptyCells(boxes, rows, cols) {
        const used = new Set();
        boxes.forEach(b => {
            for (let y = b.row; y < b.row + b.h; y++) {
                for (let x = b.col; x < b.col + b.w; x++) used.add(y * cols + x);
            }
        });
        const holes = [];
        for (let i = 0; i < rows * cols; i++) if (!used.has(i)) holes.push({ row: Math.floor(i / cols), col: i % cols });
        return holes;
    }

    const cloneBoxes = boxes => boxes.map(b => ({ ...b }));

    function fillGaps() {
        const items = [...grid.querySelectorAll(".work")];
        items.forEach(el => { el.style.gridColumn = ""; el.style.gridRow = ""; });

        const style = getComputedStyle(grid);
        const cols = style.gridTemplateColumns.split(" ").length;
        const colGap = parseFloat(style.columnGap) || 0;
        const rowGap = parseFloat(style.rowGap) || 0;
        const rowHeight = parseFloat(style.gridAutoRows);
        const area = grid.getBoundingClientRect();
        const colWidth = (area.width - colGap * (cols - 1)) / cols;
        if (!items.length || !cols || !rowHeight || !colWidth) return;

        // CSS が決めた配置を「何行目・何列目から、何マス分」に読み取る
        const initial = items.map((el, i) => {
            const r = el.getBoundingClientRect();
            return {
                i,
                col: Math.round((r.left - area.left) / (colWidth + colGap)),
                row: Math.round((r.top - area.top) / (rowHeight + rowGap)),
                w: Math.round((r.width + colGap) / (colWidth + colGap)),
                h: Math.round((r.height + rowGap) / (rowHeight + rowGap))
            };
        });
        const rows = Math.max(...initial.map(b => b.row + b.h));

        let current = cloneBoxes(initial);   // 広げる前の配置
        let best = cloneBoxes(current);       // 広げたあとの配置
        let bestHoles = growIntoGaps(best, rows, cols);

        // 広げるだけで埋まらない穴があるときは、1×1 の作品を穴へ移してみて、
        // 穴が減るなら採用する（減らなくなるまで繰り返す）
        let improved = true;
        while (bestHoles > 0 && improved) {
            improved = false;
            search:
            for (const hole of emptyCells(best, rows, cols)) {
                for (const small of current.filter(b => b.w === 1 && b.h === 1)) {
                    const moved = cloneBoxes(current);
                    moved[small.i].row = hole.row;
                    moved[small.i].col = hole.col;
                    const trial = cloneBoxes(moved);
                    const holesLeft = growIntoGaps(trial, rows, cols);
                    if (holesLeft < bestHoles) {
                        current = moved;
                        best = trial;
                        bestHoles = holesLeft;
                        improved = true;
                        break search;
                    }
                }
            }
        }

        best.forEach(b => {
            items[b.i].style.gridColumn = `${b.col + 1} / span ${b.w}`;
            items[b.i].style.gridRow = `${b.row + 1} / span ${b.h}`;
        });
    }
    fillGaps();

    let resizeTimer;
    window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(fillGaps, 150);
    });

    // ---- 作品詳細 ----

    function openWork(index) {
        currentIndex = index;
        const work = works[index];
        const gallery = work.gallery || [];
        galleryImages = [work.image, ...gallery];

        const galleryHTML = gallery.length ? `
            <div class="work-gallery">
                ${gallery.map((src, i) => `
                    <div class="gallery-item" data-index="${i + 1}">
                        <img src="${escapeHTML(src)}" alt="${escapeHTML(work.title)} - ${i + 1}" loading="lazy">
                    </div>
                `).join("")}
            </div>
        ` : "";

        const meta = [work.category, work.year, work.place].filter(Boolean);

        workDetail.innerHTML = `
            <img src="${escapeHTML(work.image)}" alt="${escapeHTML(work.title)}" class="work-detail-hero" data-index="0">
            <div class="work-detail-container">
                <div class="work-detail-header">
                    <h2>${escapeHTML(work.title)}</h2>
                    <div class="work-detail-meta">
                        ${meta.map(m => `<span>${escapeHTML(m)}</span>`).join("")}
                    </div>
                </div>
                <div class="work-detail-content">
                    ${galleryHTML}
                    <div class="work-detail-info">
                        <div class="work-detail-description">${escapeHTML((work.description || "").trim())}</div>
                        ${youtubeEmbedHTML(work.video, `${work.title} - YouTube`, "work-video")}
                    </div>
                </div>

                <!-- 関連ページへのリンク -->
                <div class="related-links">
                    <div class="related-links-title">もっと見る</div>
                    <div class="related-links-buttons">
                        <a href="philosophy.html" class="related-link-btn">思想について</a>
                        <a href="experiments.html" class="related-link-btn">実験ノート</a>
                        <a href="profile.html" class="related-link-btn">プロフィール</a>
                    </div>
                </div>
            </div>
        `;

        // メイン画像・追加写真をクリックすると拡大表示
        workDetail.querySelectorAll(".work-detail-hero, .gallery-item").forEach(el => {
            el.addEventListener("click", () => openLightbox(Number(el.dataset.index)));
        });

        modal.classList.add("active");
        modal.scrollTop = 0;
        document.body.style.overflow = "hidden";
    }

    function closeWork() {
        modal.classList.remove("active");
        document.body.style.overflow = "";
    }

    // 前後の作品は、画面に並んでいる順（上から・左から）で移動する
    // （すき間を詰める配置のため、data/works.js の順と少し変わることがある）
    function visualOrder() {
        return [...grid.querySelectorAll(".work")]
            .map(el => ({ index: Number(el.dataset.index), rect: el.getBoundingClientRect() }))
            .sort((a, b) => (a.rect.top - b.rect.top) || (a.rect.left - b.rect.left))
            .map(item => item.index);
    }

    function showWork(step) {
        const order = visualOrder();
        const pos = order.indexOf(currentIndex);
        openWork(order[(pos + step + order.length) % order.length]);
    }

    document.getElementById("modalClose").addEventListener("click", closeWork);
    document.getElementById("prevWork").addEventListener("click", () => showWork(-1));
    document.getElementById("nextWork").addEventListener("click", () => showWork(1));
    modal.addEventListener("click", e => {
        if (e.target === modal) closeWork();
    });

    // ---- 写真の拡大表示 ----

    function openLightbox(index) {
        lightboxIndex = index;
        lightboxImage.src = galleryImages[index];
        lightbox.classList.add("active");
    }

    function closeLightbox() {
        lightbox.classList.remove("active");
    }

    function showImage(step) {
        lightboxIndex = (lightboxIndex + step + galleryImages.length) % galleryImages.length;
        lightboxImage.src = galleryImages[lightboxIndex];
    }

    document.getElementById("lightboxClose").addEventListener("click", closeLightbox);
    document.getElementById("lightboxPrev").addEventListener("click", () => showImage(-1));
    document.getElementById("lightboxNext").addEventListener("click", () => showImage(1));
    lightbox.addEventListener("click", e => {
        if (e.target === lightbox) closeLightbox();
    });

    // ---- キーボード操作 ----

    document.addEventListener("keydown", e => {
        if (lightbox.classList.contains("active")) {
            if (e.key === "Escape") closeLightbox();
            else if (e.key === "ArrowLeft") showImage(-1);
            else if (e.key === "ArrowRight") showImage(1);
        } else if (modal.classList.contains("active")) {
            if (e.key === "Escape") closeWork();
            else if (e.key === "ArrowLeft") showWork(-1);
            else if (e.key === "ArrowRight") showWork(1);
        }
    });
})();
