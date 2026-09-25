// ============================================================
//  管理ページ（admin.html）
//  GitHub の API で data/*.js と写真を読み書きし、保存すると1回のコミットとして反映します
//  トークンはこのブラウザの中にだけ保存され、GitHub 以外には送られません
// ============================================================

(function () {
    const STORAGE_KEY = "portfolio-admin";
    const API = "https://api.github.com";

    const FILES = {
        works:       { path: "data/works.js",       global: "WORKS" },
        profile:     { path: "data/profile.js",     global: "PROFILE" },
        experiments: { path: "data/experiments.js", global: "EXPERIMENTS" },
        philosophy:  { path: "data/philosophy.js",  global: "PHILOSOPHY" }
    };

    const SIZES = [
        { value: "small", label: "small（1×1）" },
        { value: "tall",  label: "tall（縦長 1×2）" },
        { value: "big",   label: "big（2×2）" },
        { value: "hero",  label: "hero（2×3・いちばん大きい）" }
    ];

    const MAX_IMAGE_SIZE = 2000;   // アップロードする写真の長辺(px)
    const JPEG_QUALITY = 0.85;

    const state = {
        cfg: loadConfig(),
        connected: false,
        branch: "",
        baseCommit: "",        // 読み込んだ時点のコミット
        fileSha: {},           // 読み込んだ時点の各ファイルの blob sha
        treePaths: new Set(),  // リポジトリにあるファイル一覧
        headers: {},           // data ファイル先頭のコメント
        original: {},          // 読み込んだ時点の data ファイルの中身
        data: {},              // 編集中のデータ
        pending: new Map(),    // まだ保存していない写真 path -> base64
        previews: new Map(),   // 写真のプレビュー path -> objectURL
        tab: "works",
        selectedWork: 0,
        saving: false,
        message: null
    };

    const main = document.getElementById("main");
    const tabs = document.getElementById("tabs");
    const saveBar = document.getElementById("saveBar");
    const saveStatus = document.getElementById("saveStatus");
    const saveButton = document.getElementById("saveButton");
    const commitMessage = document.getElementById("commitMessage");
    const toastEl = document.getElementById("toast");

    // ------------------------------------------------------------
    //  設定の保存（このブラウザの localStorage）
    // ------------------------------------------------------------

    function guessRepo() {
        const host = location.hostname;
        if (host.endsWith(".github.io")) {
            const owner = host.split(".")[0];
            const first = location.pathname.split("/").filter(Boolean)[0];
            const repo = first && !first.includes(".") ? first : host;
            return `${owner}/${repo}`;
        }
        return "ren-atomo/portfolio";
    }

    function loadConfig() {
        const cfg = { repo: guessRepo(), branch: "", token: "", remember: true };
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
            if (saved) Object.assign(cfg, saved, { remember: true });
        } catch (e) { /* 保存できない環境では毎回入力 */ }
        return cfg;
    }

    function storeConfig() {
        try {
            if (state.cfg.remember) {
                const { repo, branch, token } = state.cfg;
                localStorage.setItem(STORAGE_KEY, JSON.stringify({ repo, branch, token }));
            } else {
                localStorage.removeItem(STORAGE_KEY);
            }
        } catch (e) { /* 無視 */ }
    }

    // ------------------------------------------------------------
    //  GitHub API
    // ------------------------------------------------------------

    class ApiError extends Error {
        constructor(status, message) {
            super(message);
            this.status = status;
        }
    }

    async function gh(path, { method = "GET", body } = {}) {
        let res;
        try {
            res = await fetch(`${API}/repos/${state.cfg.repo}${path}`, {
                method,
                headers: {
                    "Authorization": `Bearer ${state.cfg.token}`,
                    "Accept": "application/vnd.github+json",
                    "X-GitHub-Api-Version": "2022-11-28",
                    ...(body ? { "Content-Type": "application/json" } : {})
                },
                body: body ? JSON.stringify(body) : undefined
            });
        } catch (e) {
            throw new ApiError(0, "GitHub に接続できませんでした。ネットワークを確認してください。");
        }
        if (!res.ok) {
            let detail = "";
            try { detail = (await res.json()).message || ""; } catch (e) { /* 本文なし */ }
            throw new ApiError(res.status, detail);
        }
        return res.status === 204 ? null : res.json();
    }

    function explainError(err) {
        if (!(err instanceof ApiError)) return err.message || String(err);
        switch (err.status) {
            case 0:   return err.message;
            case 401: return "トークンが正しくないか、期限が切れています。接続設定で入れ直してください。";
            case 403: return "トークンに書き込みの権限がありません。\nContents を「Read and write」にしたトークンを作り直してください。";
            case 404: return "リポジトリかブランチが見つかりません。\nリポジトリ名・ブランチ名と、トークンがこのリポジトリを対象にしているかを確認してください。";
            case 409:
            case 422: return "保存の途中で、別の場所からリポジトリが更新されました。\n「再読み込み」してから、もう一度変更してください。";
            default:  return `GitHub からエラーが返りました（${err.status}）。${err.message}`;
        }
    }

    function decodeBase64Text(b64) {
        const bin = atob(b64.replace(/\n/g, ""));
        return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
    }

    // ------------------------------------------------------------
    //  data ファイルの読み書き
    // ------------------------------------------------------------

    function parseDataFile(text, globalName) {
        const match = text.match(new RegExp(`^window\\.${globalName}\\s*=`, "m"));
        if (!match) throw new Error(`window.${globalName} が見つかりません`);
        const sandbox = {};
        new Function("window", text)(sandbox);
        return { header: text.slice(0, match.index), data: sandbox[globalName] };
    }

    const INDENT = "    ";

    function stringLiteral(value) {
        if (value.includes("\n")) {
            return "`" + value.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${") + "`";
        }
        return JSON.stringify(value);
    }

    function keyLiteral(key) {
        return /^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key);
    }

    function isSimple(value) {
        return value === null || typeof value !== "object";
    }

    // JavaScript として読める形で、人が読みやすく書き出す
    function toSource(value, depth = 0) {
        if (typeof value === "string") return stringLiteral(value);
        if (isSimple(value)) return JSON.stringify(value);

        const pad = INDENT.repeat(depth + 1);
        const end = INDENT.repeat(depth);

        if (Array.isArray(value)) {
            if (value.length === 0) return "[]";
            if (value.every(isSimple)) {
                const inline = "[" + value.map(v => toSource(v)).join(", ") + "]";
                if (inline.length <= 90 && !inline.includes("\n")) return inline;
            }
            return "[\n" + value.map(v => pad + toSource(v, depth + 1)).join(",\n") + "\n" + end + "]";
        }

        const keys = Object.keys(value).filter(k => value[k] !== undefined);
        if (keys.length === 0) return "{}";
        // リンク（label と url だけ）は1行にまとめる
        if (keys.every(k => k === "label" || k === "url")) {
            return "{ " + keys.map(k => `${keyLiteral(k)}: ${toSource(value[k])}`).join(", ") + " }";
        }
        return "{\n" + keys.map(k => `${pad}${keyLiteral(k)}: ${toSource(value[k], depth + 1)}`).join(",\n") + "\n" + end + "}";
    }

    // 書き出す前に、項目の順番をそろえて空の任意項目を落とす
    const str = v => (v == null ? "" : String(v));

    const CLEAN = {
        works: works => works.map(w => ({
            id: str(w.id).trim(),
            title: str(w.title),
            category: str(w.category),
            year: str(w.year),
            place: str(w.place),
            size: str(w.size) || "small",
            image: str(w.image).trim(),
            gallery: (w.gallery || []).map(g => str(g).trim()).filter(Boolean),
            video: str(w.video).trim(),
            description: str(w.description)
        })),

        profile: p => ({
            name: str(p.name),
            nameEn: str(p.nameEn),
            birthday: str(p.birthday),
            affiliation: str(p.affiliation),
            social: (p.social || []).map(cleanLink).filter(l => l.url),
            history: (p.history || []).map(period => ({
                year: str(period.year),
                label: str(period.label),
                events: (period.events || []).map(ev => {
                    const out = {};
                    if (str(ev.date)) out.date = str(ev.date);
                    out.title = str(ev.title);
                    if (str(ev.award)) out.award = str(ev.award);
                    if (str(ev.description)) out.description = str(ev.description);
                    const links = (ev.links || []).map(cleanLink).filter(l => l.url);
                    if (links.length) out.links = links;
                    return out;
                })
            }))
        }),

        experiments: list => list.map(e => ({
            date: str(e.date),
            title: str(e.title),
            tags: (e.tags || []).map(t => str(t).trim()).filter(Boolean),
            description: str(e.description),
            video: str(e.video).trim()
        })),

        philosophy: p => ({
            title: str(p.title),
            sections: (p.sections || []).map(sec => ({
                heading: str(sec.heading),
                emphasis: Boolean(sec.emphasis),
                body: str(sec.body)
            }))
        })
    };

    function cleanLink(l) {
        return { label: str(l.label) || str(l.url), url: str(l.url).trim() };
    }

    function serialize(key) {
        const { global } = FILES[key];
        return `${state.headers[key]}window.${global} = ${toSource(CLEAN[key](state.data[key]))};\n`;
    }

    // ------------------------------------------------------------
    //  読み込み
    // ------------------------------------------------------------

    async function connect() {
        state.message = null;
        main.replaceChildren(el("p", { class: "empty", text: "読み込み中…" }));

        const repoInfo = await gh("");
        const branch = state.cfg.branch.trim() || repoInfo.default_branch;
        const ref = await gh(`/git/ref/heads/${branch}`);
        const commit = await gh(`/git/commits/${ref.object.sha}`);
        const tree = await gh(`/git/trees/${commit.tree.sha}?recursive=1`);
        const shaByPath = Object.fromEntries(tree.tree.map(t => [t.path, t.sha]));

        const loaded = {};
        for (const [key, file] of Object.entries(FILES)) {
            const sha = shaByPath[file.path];
            if (!sha) {
                throw new Error(`「${branch}」ブランチに ${file.path} がありません。\nサイトの新しい構成がまだこのブランチに入っていない可能性があります。`);
            }
            const blob = await gh(`/git/blobs/${sha}`);
            const text = decodeBase64Text(blob.content);
            loaded[key] = { sha, text, ...parseDataFile(text, file.global) };
        }

        state.branch = branch;
        state.baseCommit = ref.object.sha;
        state.treePaths = new Set(tree.tree.filter(t => t.type === "blob").map(t => t.path));
        for (const [key, file] of Object.entries(FILES)) {
            state.fileSha[file.path] = loaded[key].sha;
            state.headers[key] = loaded[key].header;
            state.data[key] = loaded[key].data;
            state.original[key] = loaded[key].text;
        }
        state.pending.clear();
        state.selectedWork = 0;
        state.connected = true;
        storeConfig();
    }

    async function tryConnect() {
        try {
            await connect();
            if (state.tab === "settings") state.tab = "works";
        } catch (err) {
            state.connected = false;
            state.tab = "settings";
            state.message = { error: true, text: explainError(err) };
        }
        render();
    }

    // ------------------------------------------------------------
    //  保存
    // ------------------------------------------------------------

    function changedFiles() {
        return Object.keys(FILES)
            .map(key => ({ key, path: FILES[key].path, text: serialize(key) }))
            .filter(f => f.text !== state.original[f.key]);
    }

    function referencedPaths() {
        const set = new Set();
        for (const w of state.data.works || []) {
            if (w.image) set.add(w.image.trim());
            for (const g of w.gallery || []) set.add(String(g).trim());
        }
        return set;
    }

    function pendingImages() {
        const used = referencedPaths();
        return [...state.pending.keys()].filter(p => used.has(p));
    }

    function validate() {
        const errors = [];
        const ids = new Set();
        state.data.works.forEach((w, i) => {
            const label = w.title || `${i + 1}番目の作品`;
            if (!str(w.title).trim()) errors.push(`${i + 1}番目の作品：作品名が空です`);
            if (!/^[a-z0-9][a-z0-9-]*$/i.test(str(w.id).trim())) errors.push(`${label}：id は半角英数字とハイフンで入れてください`);
            else if (ids.has(w.id.trim())) errors.push(`${label}：id「${w.id}」がほかの作品と重なっています`);
            ids.add(str(w.id).trim());
            if (!str(w.image).trim()) errors.push(`${label}：メイン画像がありません`);
        });
        if (!/^\d{4}-\d{2}-\d{2}$/.test(str(state.data.profile.birthday))) {
            errors.push("プロフィール：生年月日を入れてください");
        }
        return errors;
    }

    async function save() {
        const files = changedFiles();
        const images = pendingImages();
        if (!files.length && !images.length) return;

        const errors = validate();
        if (errors.length) {
            showToast("保存できません\n" + errors.join("\n"), true);
            return;
        }

        state.saving = true;
        updateSaveBar();

        try {
            const ref = await gh(`/git/ref/heads/${state.branch}`);
            const head = ref.object.sha;
            const headCommit = await gh(`/git/commits/${head}`);

            // 読み込んだあとに別の場所で同じファイルが更新されていたら、上書きしない
            if (head !== state.baseCommit) {
                const tree = await gh(`/git/trees/${headCommit.tree.sha}?recursive=1`);
                const shaByPath = Object.fromEntries(tree.tree.map(t => [t.path, t.sha]));
                const conflicts = files.filter(f => shaByPath[f.path] !== state.fileSha[f.path]);
                if (conflicts.length) {
                    throw new Error(`${conflicts.map(f => f.path).join("、")} が別の場所で更新されています。\n今の変更をメモしてから「再読み込み」してください。`);
                }
            }

            const entries = [];
            for (const f of files) {
                const blob = await gh("/git/blobs", { method: "POST", body: { content: f.text, encoding: "utf-8" } });
                entries.push({ path: f.path, mode: "100644", type: "blob", sha: blob.sha });
            }
            for (const path of images) {
                const blob = await gh("/git/blobs", { method: "POST", body: { content: state.pending.get(path), encoding: "base64" } });
                entries.push({ path, mode: "100644", type: "blob", sha: blob.sha });
            }

            const tree = await gh("/git/trees", { method: "POST", body: { base_tree: headCommit.tree.sha, tree: entries } });
            const message = commitMessage.value.trim() || defaultCommitMessage(files, images);
            const commit = await gh("/git/commits", { method: "POST", body: { message, tree: tree.sha, parents: [head] } });
            await gh(`/git/refs/heads/${state.branch}`, { method: "PATCH", body: { sha: commit.sha } });

            state.baseCommit = commit.sha;
            for (const e of entries) {
                state.fileSha[e.path] = e.sha;
                state.treePaths.add(e.path);
            }
            for (const f of files) state.original[f.key] = f.text;
            for (const path of images) state.pending.delete(path);
            commitMessage.value = "";
            showToast("保存しました。サイトに反映されるまで1〜2分かかります。");
        } catch (err) {
            showToast(explainError(err), true);
        } finally {
            state.saving = false;
            updateSaveBar();
        }
    }

    function defaultCommitMessage(files, images) {
        const names = { works: "作品", profile: "プロフィール", experiments: "実験ノート", philosophy: "思想" };
        const parts = files.map(f => names[f.key]);
        if (images.length) parts.push(`写真${images.length}枚`);
        return `${parts.join("・")}を更新（管理ページから）`;
    }

    // ------------------------------------------------------------
    //  写真
    // ------------------------------------------------------------

    async function resizeImage(file) {
        let bitmap;
        try {
            bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
        } catch (e) {
            throw new Error(`「${file.name}」を読み込めませんでした。JPEG か PNG にしてから選んでください。`);
        }
        const scale = Math.min(1, MAX_IMAGE_SIZE / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close?.();
        return new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
    }

    function blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result).split(",")[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    function nextImagePath(workId) {
        const dir = `images/works/${workId}/`;
        const used = [...state.treePaths, ...state.pending.keys(), ...referencedPaths()];
        let max = 0;
        for (const p of used) {
            if (!p.startsWith(dir)) continue;
            const m = p.slice(dir.length).match(/^(\d+)\.\w+$/);
            if (m) max = Math.max(max, Number(m[1]));
        }
        return `${dir}${max + 1}.jpg`;
    }

    async function addImages(work, fileList) {
        const id = str(work.id).trim();
        if (!/^[a-z0-9][a-z0-9-]*$/i.test(id)) {
            showToast("先に id を半角英数字で入れてください（写真の保存先フォルダ名になります）", true);
            return [];
        }
        const paths = [];
        for (const file of fileList) {
            try {
                const blob = await resizeImage(file);
                const path = nextImagePath(id);
                state.pending.set(path, await blobToBase64(blob));
                state.previews.set(path, URL.createObjectURL(blob));
                paths.push(path);
            } catch (err) {
                showToast(err.message, true);
            }
        }
        return paths;
    }

    function imageSrc(path) {
        if (!path) return "";
        return state.previews.get(path) || path;
    }

    // ------------------------------------------------------------
    //  画面を組み立てる道具
    // ------------------------------------------------------------

    function el(tag, props = {}, ...children) {
        const node = document.createElement(tag);
        for (const [key, value] of Object.entries(props)) {
            if (value == null || value === false) continue;
            if (key === "class") node.className = value;
            else if (key === "text") node.textContent = value;
            else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
            else if (key in node && typeof value !== "string") node[key] = value;
            else node.setAttribute(key, value === true ? "" : value);
        }
        for (const child of children.flat()) {
            if (child == null || child === false) continue;
            node.append(child instanceof Node ? child : document.createTextNode(child));
        }
        return node;
    }

    let fieldCount = 0;

    // obj[key] と入力欄をつなぐ
    function field(label, obj, key, opts = {}) {
        const id = `f${++fieldCount}`;
        let input;
        if (opts.options) {
            input = el("select", { id }, opts.options.map(o => el("option", { value: o.value, text: o.label })));
        } else if (opts.multiline) {
            input = el("textarea", { id, rows: opts.rows || 4 });
        } else {
            input = el("input", { id, type: opts.type || "text", placeholder: opts.placeholder });
        }
        input.value = opts.format ? opts.format(obj[key]) : (obj[key] ?? "");
        input.addEventListener(opts.options ? "change" : "input", () => {
            obj[key] = opts.parse ? opts.parse(input.value) : input.value;
            opts.onInput?.(input.value);
            updateSaveBar();
        });
        return el("div", { class: "field" },
            el("label", { for: id, text: label }),
            input,
            opts.hint && el("div", { class: "hint", text: opts.hint })
        );
    }

    function moveItem(list, index, step) {
        const to = index + step;
        if (to < 0 || to >= list.length) return false;
        [list[index], list[to]] = [list[to], list[index]];
        return true;
    }

    function orderButtons(list, index, onDone, { remove, removeConfirm } = {}) {
        return [
            el("button", { type: "button", class: "icon-btn", title: "上へ", text: "↑", disabled: index === 0,
                onclick: () => { moveItem(list, index, -1); onDone(); } }),
            el("button", { type: "button", class: "icon-btn", title: "下へ", text: "↓", disabled: index === list.length - 1,
                onclick: () => { moveItem(list, index, 1); onDone(); } }),
            remove !== false && el("button", { type: "button", class: "icon-btn remove", title: "削除", text: "×",
                onclick: () => {
                    if (removeConfirm && !confirm(removeConfirm)) return;
                    list.splice(index, 1);
                    onDone();
                } })
        ];
    }

    function linkListEditor(list, addLabel) {
        const wrap = el("div");
        const draw = () => {
            wrap.replaceChildren(
                ...list.map((link, i) => el("div", { class: "inline-list-item" },
                    el("input", { type: "text", value: link.label || "", placeholder: "表示する文字",
                        oninput: e => { link.label = e.target.value; updateSaveBar(); } }),
                    el("input", { type: "url", value: link.url || "", placeholder: "https://...",
                        oninput: e => { link.url = e.target.value; updateSaveBar(); } }),
                    el("button", { type: "button", class: "icon-btn remove", title: "削除", text: "×",
                        onclick: () => { list.splice(i, 1); draw(); updateSaveBar(); } })
                )),
                el("button", { type: "button", class: "btn btn-small", text: `+ ${addLabel}`,
                    onclick: () => { list.push({ label: "", url: "" }); draw(); } })
            );
        };
        draw();
        return wrap;
    }

    function fileButton(label, multiple, onFiles) {
        const input = el("input", { type: "file", accept: "image/*", multiple });
        input.addEventListener("change", async () => {
            const files = [...input.files];
            input.value = "";
            if (files.length) await onFiles(files);
        });
        return el("span", { class: "btn btn-small file-button" }, label, input);
    }

    // ------------------------------------------------------------
    //  作品タブ
    // ------------------------------------------------------------

    function renderWorks() {
        const works = state.data.works;
        if (state.selectedWork >= works.length) state.selectedWork = Math.max(0, works.length - 1);

        const listItems = el("ul", { class: "works-list-items" });
        const drawList = () => {
            listItems.replaceChildren(...works.map((w, i) => el("li", {
                class: "works-list-item" + (i === state.selectedWork ? " selected" : ""),
                onclick: () => { state.selectedWork = i; render(); }
            },
                w.image ? el("img", { src: imageSrc(w.image), alt: "", loading: "lazy" }) : el("div", { class: "thumb-empty" }),
                el("span", { class: "name", text: w.title || "（無題）" }),
                el("span", { class: "order", onclick: e => e.stopPropagation() },
                    el("button", { type: "button", class: "icon-btn", text: "▲", title: "前へ", disabled: i === 0,
                        onclick: () => { moveItem(works, i, -1); if (state.selectedWork === i) state.selectedWork--; else if (state.selectedWork === i - 1) state.selectedWork++; render(); } }),
                    el("button", { type: "button", class: "icon-btn", text: "▼", title: "後ろへ", disabled: i === works.length - 1,
                        onclick: () => { moveItem(works, i, 1); if (state.selectedWork === i) state.selectedWork++; else if (state.selectedWork === i + 1) state.selectedWork--; render(); } })
                )
            )));
        };
        drawList();

        const list = el("div", { class: "works-list" },
            el("h2", { class: "section-heading", text: "作品" }),
            el("p", { class: "hint", text: "上から順にトップページに並びます", style: "font-size:12px;color:#888;margin:-10px 0 10px" }),
            listItems,
            el("button", { type: "button", class: "btn", text: "+ 作品を追加", onclick: () => {
                works.unshift({ id: "", title: "", category: "", year: String(new Date().getFullYear()), place: "",
                    size: "small", image: "", gallery: [], video: "", description: "" });
                state.selectedWork = 0;
                render();
            } })
        );

        const editor = works.length ? workEditor(works[state.selectedWork], drawList) : el("p", { class: "empty", text: "作品がありません。「+ 作品を追加」から作れます。" });
        return el("div", { class: "works-layout" }, list, el("div", {}, editor));
    }

    function workEditor(work, refreshList) {
        const works = state.data.works;
        work.gallery = work.gallery || [];

        const mainPreview = el("img", { class: "image-preview", src: imageSrc(work.image), alt: "" });
        const imageInput = el("input", { type: "text", value: work.image || "", placeholder: "images/works/... か https://..." });
        imageInput.addEventListener("input", () => {
            work.image = imageInput.value;
            mainPreview.src = imageSrc(work.image.trim());
            refreshList();
            updateSaveBar();
        });

        const galleryGrid = el("div", { class: "gallery-grid" });
        const drawGallery = () => {
            galleryGrid.replaceChildren(...work.gallery.map((path, i) => el("div", { class: "gallery-cell" },
                el("img", { src: imageSrc(path), alt: "", loading: "lazy", title: path }),
                el("div", { class: "gallery-actions" },
                    el("button", { type: "button", class: "icon-btn", text: "←", title: "前へ", disabled: i === 0,
                        onclick: () => { moveItem(work.gallery, i, -1); drawGallery(); updateSaveBar(); } }),
                    el("button", { type: "button", class: "icon-btn", text: "→", title: "後ろへ", disabled: i === work.gallery.length - 1,
                        onclick: () => { moveItem(work.gallery, i, 1); drawGallery(); updateSaveBar(); } }),
                    el("button", { type: "button", class: "icon-btn remove", text: "×", title: "この作品から外す",
                        onclick: () => { work.gallery.splice(i, 1); drawGallery(); updateSaveBar(); } })
                )
            )));
            if (!work.gallery.length) galleryGrid.append(el("p", { class: "empty", text: "追加の写真はありません" }));
        };
        drawGallery();

        const heading = el("h2", { class: "section-heading", text: work.title || "新しい作品" });

        return el("div", {},
            heading,

            field("作品名", work, "title", { onInput: () => {
                heading.textContent = work.title || "新しい作品";
                refreshList();
            } }),
            el("div", { class: "row" },
                field("id（写真フォルダ名にも使います）", work, "id", { placeholder: "例: hamon", hint: "半角英数字とハイフン" }),
                field("種別", work, "category", { placeholder: "picture / cg / event / vj" }),
                field("年", work, "year", { placeholder: "2026" }),
                field("場所", work, "place", { placeholder: "なければ空欄" })
            ),
            field("トップでの大きさ", work, "size", { options: SIZES, hint: "並び順と大きさの組み合わせで、すき間ができることがあります。保存後にトップで確認してください。" }),

            el("h3", { class: "sub-heading", text: "メイン画像" }),
            el("div", { class: "image-field" },
                mainPreview,
                el("div", { class: "image-controls" },
                    el("div", { class: "field" }, imageInput),
                    fileButton("写真を選ぶ", false, async files => {
                        const [path] = await addImages(work, files);
                        if (!path) return;
                        work.image = path;
                        imageInput.value = path;
                        mainPreview.src = imageSrc(path);
                        refreshList();
                        updateSaveBar();
                    }),
                    el("p", { class: "hint", style: "font-size:12px;color:#888;margin-top:8px",
                        text: `選んだ写真は長辺${MAX_IMAGE_SIZE}pxに縮小して保存されます` })
                )
            ),

            el("h3", { class: "sub-heading", text: "追加の写真（作品ページに並びます）" }),
            galleryGrid,
            fileButton("+ 写真を追加（複数選べます）", true, async files => {
                const paths = await addImages(work, files);
                work.gallery.push(...paths);
                drawGallery();
                updateSaveBar();
            }),

            el("h3", { class: "sub-heading", text: "動画と説明" }),
            field("YouTube の URL", work, "video", { type: "url", placeholder: "https://www.youtube.com/watch?v=...（なければ空欄）" }),
            field("説明文", work, "description", { multiline: true, rows: 16 }),

            el("div", { class: "danger-zone" },
                el("button", { type: "button", class: "btn btn-danger btn-small", text: "この作品を削除", onclick: () => {
                    if (!confirm(`「${work.title || "無題"}」を削除します。よろしいですか？\n（保存するまではサイトに反映されません）`)) return;
                    works.splice(works.indexOf(work), 1);
                    render();
                } })
            )
        );
    }

    // ------------------------------------------------------------
    //  プロフィールタブ
    // ------------------------------------------------------------

    function renderProfile() {
        const p = state.data.profile;
        p.social = p.social || [];
        p.history = p.history || [];

        return el("div", { style: "max-width: 820px" },
            el("h2", { class: "section-heading", text: "基本情報" }),
            el("div", { class: "row" },
                field("名前", p, "name"),
                field("名前（英語）", p, "nameEn")
            ),
            el("div", { class: "row" },
                field("生年月日（年齢は自動で計算）", p, "birthday", { type: "date" }),
                field("所属", p, "affiliation")
            ),

            el("h3", { class: "sub-heading", text: "SNS" }),
            linkListEditor(p.social, "SNSを追加"),

            el("h2", { class: "section-heading", text: "活動歴", style: "margin-top: 48px" }),
            p.history.map((period, i) => periodEditor(p.history, period, i)),
            el("button", { type: "button", class: "btn", text: "+ 時期を追加（例: 大学1年）", onclick: () => {
                p.history.push({ year: String(new Date().getFullYear()), label: "", events: [] });
                render();
            } })
        );
    }

    function periodEditor(history, period, index) {
        period.events = period.events || [];
        return el("div", { class: "card" },
            el("div", { class: "card-head" },
                el("span", { class: "card-title", text: `${period.label || "（見出しなし）"}　${period.year || ""}` }),
                orderButtons(history, index, () => { render(); updateSaveBar(); },
                    { removeConfirm: `「${period.label || "この時期"}」を出来事ごと削除します。よろしいですか？` })
            ),
            el("div", { class: "row" },
                field("年の表記", period, "year", { placeholder: "2026" }),
                field("見出し", period, "label", { placeholder: "大学1年" })
            ),
            period.events.map((ev, j) => eventEditor(period.events, ev, j)),
            el("button", { type: "button", class: "btn btn-small", text: "+ 出来事を追加", onclick: () => {
                period.events.push({ date: "", title: "", description: "", links: [] });
                render();
            } })
        );
    }

    function eventEditor(events, ev, index) {
        ev.links = ev.links || [];
        return el("div", { class: "card card-soft" },
            el("div", { class: "card-head" },
                el("span", { class: "card-title", text: ev.title || "（新しい出来事）" }),
                orderButtons(events, index, () => { render(); updateSaveBar(); },
                    { removeConfirm: `「${ev.title || "この出来事"}」を削除します。よろしいですか？` })
            ),
            el("div", { class: "row" },
                field("日付", ev, "date", { placeholder: "2026.09.24" }),
                field("受賞バッジ（任意）", ev, "award", { placeholder: "〇〇賞 受賞" })
            ),
            field("タイトル", ev, "title"),
            field("説明（改行もそのまま出ます）", ev, "description", { multiline: true, rows: 3 }),
            el("div", { class: "field" }, el("label", { text: "リンク" }), linkListEditor(ev.links, "リンクを追加"))
        );
    }

    // ------------------------------------------------------------
    //  実験タブ
    // ------------------------------------------------------------

    function renderExperiments() {
        const list = state.data.experiments;
        return el("div", { style: "max-width: 820px" },
            el("h2", { class: "section-heading", text: "実験ノート" }),
            el("p", { class: "empty", text: "上から順に表示されます。新しいものは上に追加されます。", style: "padding-top:0" }),
            el("button", { type: "button", class: "btn", text: "+ 実験を追加", style: "margin-bottom: 20px", onclick: () => {
                const d = new Date();
                const date = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
                list.unshift({ date, title: "", tags: [], description: "", video: "" });
                render();
            } }),
            list.map((entry, i) => el("div", { class: "card" },
                el("div", { class: "card-head" },
                    el("span", { class: "card-title", text: `${entry.date}　${entry.title || "（新しい実験）"}` }),
                    orderButtons(list, i, () => { render(); updateSaveBar(); },
                        { removeConfirm: `「${entry.title || "この実験"}」を削除します。よろしいですか？` })
                ),
                el("div", { class: "row" },
                    field("日付", entry, "date", { placeholder: "2026.09.24" }),
                    field("タイトル", entry, "title")
                ),
                field("タグ（カンマ区切り）", entry, "tags", {
                    placeholder: "TouchDesigner, 3D",
                    format: tags => (tags || []).join(", "),
                    parse: v => v.split(/[,、]/).map(t => t.trim()).filter(Boolean)
                }),
                field("説明", entry, "description", { multiline: true, rows: 2 }),
                field("YouTube の URL", entry, "video", { type: "url", placeholder: "https://www.youtube.com/watch?v=..." })
            ))
        );
    }

    // ------------------------------------------------------------
    //  思想タブ
    // ------------------------------------------------------------

    function renderPhilosophy() {
        const p = state.data.philosophy;
        p.sections = p.sections || [];

        return el("div", { style: "max-width: 820px" },
            el("h2", { class: "section-heading", text: "思想" }),
            field("ページの見出し", p, "title"),
            el("div", { class: "message" },
                "本文の書き方：空行で段落を分けます。段落の中の改行はそのまま改行になります。\n",
                "「・」で始まる行だけの段落は箇条書き、「>」で始まる行だけの段落は引用（グレーの枠）になります。"
            ),
            p.sections.map((sec, i) => el("div", { class: "card" },
                el("div", { class: "card-head" },
                    el("span", { class: "card-title", text: sec.heading || "（見出しなしの節）" }),
                    orderButtons(p.sections, i, () => { render(); updateSaveBar(); },
                        { removeConfirm: `「${sec.heading || "この節"}」を削除します。よろしいですか？` })
                ),
                field("見出し（なくてもよい）", sec, "heading"),
                el("label", { class: "checkbox" },
                    el("input", { type: "checkbox", checked: Boolean(sec.emphasis), onchange: e => {
                        sec.emphasis = e.target.checked;
                        updateSaveBar();
                    } }),
                    "この節の段落を太字で表示する"
                ),
                field("本文", sec, "body", { multiline: true, rows: Math.min(24, Math.max(6, String(sec.body || "").split("\n").length + 2)) })
            )),
            el("button", { type: "button", class: "btn", text: "+ 節を追加", onclick: () => {
                p.sections.push({ heading: "", emphasis: false, body: "" });
                render();
            } })
        );
    }

    // ------------------------------------------------------------
    //  接続設定タブ
    // ------------------------------------------------------------

    function renderSettings() {
        const cfg = state.cfg;
        const tokenUrl = "https://github.com/settings/personal-access-tokens/new";

        return el("div", { class: "connect" },
            el("h2", { class: "section-heading", text: "GitHub との接続" }),
            state.message && el("div", { class: "message" + (state.message.error ? " error" : ""), text: state.message.text }),
            state.connected && el("div", { class: "message", text: `接続中：${cfg.repo}（${state.branch} ブランチ）` }),

            el("p", { text: "このページは GitHub のリポジトリを直接書き換えます。最初に一度だけ、書き込み用のトークンを作って入れてください。" }),
            el("ol", {},
                el("li", {}, el("a", { href: tokenUrl, target: "_blank", rel: "noopener", text: "GitHub のトークン作成ページ" }), " を開く（Fine-grained token）"),
                el("li", {}, "Repository access で ", el("strong", { text: "Only select repositories" }), " を選び、", el("code", { text: cfg.repo.split("/")[1] || "portfolio" }), " だけを選ぶ"),
                el("li", {}, "Permissions の Repository permissions で ", el("strong", { text: "Contents" }), " を ", el("strong", { text: "Read and write" }), " にする"),
                el("li", {}, "作成されたトークン（github_pat_ で始まる文字列）をコピーして、下に貼る")
            ),

            field("リポジトリ（持ち主/名前）", cfg, "repo", { placeholder: "ren-atomo/portfolio" }),
            field("ブランチ", cfg, "branch", { placeholder: "空欄なら既定のブランチ（main）", hint: "GitHub Pages で公開しているブランチを指定します" }),
            field("トークン", cfg, "token", { type: "password", placeholder: "github_pat_..." }),
            el("label", { class: "checkbox" },
                el("input", { type: "checkbox", checked: cfg.remember, onchange: e => { cfg.remember = e.target.checked; } }),
                "このブラウザにトークンを保存する（自分の端末のときだけ）"
            ),

            el("div", { style: "display:flex;gap:12px;flex-wrap:wrap" },
                el("button", { type: "button", class: "btn btn-primary", text: state.connected ? "再読み込み" : "接続する", onclick: () => {
                    if (!cfg.repo.trim() || !cfg.token.trim()) { showToast("リポジトリとトークンを入れてください", true); return; }
                    if (isDirty() && !confirm("保存していない変更は消えます。再読み込みしますか？")) return;
                    cfg.repo = cfg.repo.trim();
                    cfg.token = cfg.token.trim();
                    tryConnect();
                } }),
                el("button", { type: "button", class: "btn btn-danger", text: "このブラウザからトークンを消す", onclick: () => {
                    if (!confirm("保存したトークンを消して、接続を切ります。よろしいですか？")) return;
                    cfg.token = "";
                    cfg.remember = false;
                    storeConfig();
                    cfg.remember = true;
                    state.connected = false;
                    state.message = { text: "トークンを消しました。" };
                    render();
                } })
            )
        );
    }

    // ------------------------------------------------------------
    //  全体の描画
    // ------------------------------------------------------------

    function isDirty() {
        return state.connected && (changedFiles().length > 0 || pendingImages().length > 0);
    }

    function updateSaveBar() {
        saveBar.hidden = !state.connected;
        if (!state.connected) return;
        const dirty = isDirty();
        saveStatus.textContent = state.saving ? "保存中…" : dirty ? "保存していない変更があります" : "変更はすべて保存済みです";
        saveStatus.classList.toggle("dirty", dirty && !state.saving);
        saveButton.disabled = !dirty || state.saving;
    }

    function render() {
        tabs.hidden = !state.connected;
        if (!state.connected) state.tab = "settings";
        tabs.querySelectorAll("button").forEach(b => b.classList.toggle("active", b.dataset.tab === state.tab));

        const views = { works: renderWorks, profile: renderProfile, experiments: renderExperiments, philosophy: renderPhilosophy, settings: renderSettings };
        main.replaceChildren(views[state.tab]());
        updateSaveBar();
    }

    let toastTimer;
    function showToast(text, isError = false) {
        toastEl.textContent = text;
        toastEl.classList.toggle("error", isError);
        toastEl.hidden = false;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => { toastEl.hidden = true; }, isError ? 8000 : 4000);
    }

    tabs.addEventListener("click", e => {
        const tab = e.target.closest("button")?.dataset.tab;
        if (!tab) return;
        state.tab = tab;
        render();
        window.scrollTo(0, 0);
    });

    saveButton.addEventListener("click", save);

    window.addEventListener("beforeunload", e => {
        if (isDirty()) {
            e.preventDefault();
            e.returnValue = "";
        }
    });

    // 公開用に data ファイルの書き出しを外から試せるようにしておく（確認用）
    window.__portfolioAdmin = { parseDataFile, toSource, CLEAN };

    if (state.cfg.token) tryConnect();
    else render();
})();
