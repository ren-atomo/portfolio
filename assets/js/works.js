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

    // ---- ランダムに並べる ----
    // 作品の大きさは変えずに、ページを開くたびに並び順をランダムに決める。
    // いくつもの並びを試して、途中の行に穴ができないもの（余ったマスは一番下の行の右端だけ）を選ぶ

    // 開くたびに変わるが、同じ表示中は幅を変えても同じ並びになるよう、種を固定した乱数を使う
    const seed = Math.floor(Math.random() * 2 ** 32);
    function makeRandom(s) {
        return () => {
            s = (s + 0x6D2B79F5) | 0;
            let t = Math.imul(s ^ (s >>> 15), 1 | s);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function shuffled(list, random) {
        const out = [...list];
        for (let i = out.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [out[i], out[j]] = [out[j], out[i]];
        }
        return out;
    }

    // 上の行から、入る場所の一番左上に置いていく
    function pack(order, cols) {
        const rows = [];
        const free = (y, x, w, h) => {
            if (x + w > cols) return false;
            for (let yy = y; yy < y + h; yy++) {
                for (let xx = x; xx < x + w; xx++) if (rows[yy] && rows[yy][xx]) return false;
            }
            return true;
        };
        const placed = order.map(item => {
            const w = Math.min(item.w, cols);
            for (let y = 0; ; y++) {
                for (let x = 0; x < cols; x++) {
                    if (!free(y, x, w, item.h)) continue;
                    for (let yy = y; yy < y + item.h; yy++) {
                        rows[yy] = rows[yy] || Array(cols).fill(false);
                        for (let xx = x; xx < x + w; xx++) rows[yy][xx] = true;
                    }
                    return { ...item, w, row: y, col: x };
                }
            }
        });
        // 一番下の行より上にある空きマスの数（少ないほどよい）
        const holes = rows.slice(0, -1).flat().filter(c => !c).length;
        // 一番下の行の空きが右端にまとまっていないマスの数（少ないほどよい）
        const last = rows[rows.length - 1] || [];
        const ragged = last.filter((c, x) => !c && last.slice(x + 1).some(Boolean)).length;
        return { placed, holes, ragged, height: rows.length };
    }

    function arrange() {
        const items = [...grid.querySelectorAll(".work")];
        items.forEach(el => { el.style.gridColumn = ""; el.style.gridRow = ""; });

        const style = getComputedStyle(grid);
        const cols = style.gridTemplateColumns.split(" ").length;
        if (!items.length || !cols) return;

        // 大きさはCSS（size の指定とスマホ用の指定）から読み取る
        const span = value => {
            const m = String(value).match(/span\s+(\d+)/);
            return m ? Number(m[1]) : 1;
        };
        const list = items.map((el, i) => {
            const cs = getComputedStyle(el);
            return {
                i,
                w: Math.max(span(cs.gridColumnStart), span(cs.gridColumnEnd)),
                h: Math.max(span(cs.gridRowStart), span(cs.gridRowEnd))
            };
        });

        const random = makeRandom(seed);
        let best = null;
        for (let attempt = 0; attempt < 300; attempt++) {
            const result = pack(shuffled(list, random), cols);
            const better = !best
                || result.holes < best.holes
                || (result.holes === best.holes && result.ragged < best.ragged)
                || (result.holes === best.holes && result.ragged === best.ragged && result.height < best.height);
            if (better) best = result;
            if (best.holes === 0 && best.ragged === 0) break;
        }

        best.placed.forEach(b => {
            items[b.i].style.gridColumn = `${b.col + 1} / span ${b.w}`;
            items[b.i].style.gridRow = `${b.row + 1} / span ${b.h}`;
        });
    }

    arrange();

    // 幅が変わったら並べ直す（乱数の種は同じなので、列の数が同じなら並びも変わらない）
    let resizeTimer;
    window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(arrange, 150);
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
