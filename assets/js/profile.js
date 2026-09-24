// ============================================================
//  プロフィールページ
//  中身は data/profile.js に書きます。このファイルは基本的に触らなくてOK
// ============================================================

(function () {
    const profile = window.PROFILE;

    function calculateAge(birthday) {
        const [y, m, d] = birthday.split("-").map(Number);
        const today = new Date();
        let age = today.getFullYear() - y;
        if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) {
            age--;
        }
        return age;
    }

    function formatBirthday(birthday) {
        const [y, m, d] = birthday.split("-").map(Number);
        return `${y}年${m}月${d}日`;
    }

    function eventHTML(event) {
        const award = event.award ? `<span class="award-badge">${escapeHTML(event.award)}</span>` : "";
        const links = (event.links || []).map(link => `
            <a href="${escapeHTML(link.url)}" class="history-link" target="_blank" rel="noopener">${escapeHTML(link.label)}</a>
        `).join("");

        return `
            <div class="history-event">
                ${event.date ? `<span class="history-date">${escapeHTML(event.date)}</span>` : ""}
                <div class="history-title">${escapeHTML(event.title)}${award}</div>
                ${event.description ? `<div class="history-description">${escapeHTML(event.description)}</div>` : ""}
                ${links}
            </div>
        `;
    }

    document.getElementById("profile").innerHTML = `
        <div class="profile-header">
            <h1 class="profile-name">${escapeHTML(profile.name)}</h1>
            <div class="profile-name-en">${escapeHTML(profile.nameEn)}</div>

            <div class="profile-info">
                <div class="profile-info-item">
                    <span class="profile-info-label">生年月日</span>
                    <span>${formatBirthday(profile.birthday)}</span>
                </div>
                <div class="profile-info-item">
                    <span class="profile-info-label">年齢</span>
                    <span>${calculateAge(profile.birthday)}歳</span>
                </div>
                <div class="profile-info-item">
                    <span class="profile-info-label">所属</span>
                    <span>${escapeHTML(profile.affiliation)}</span>
                </div>
            </div>
        </div>

        <div class="profile-section">
            <h2 class="section-title">活動歴</h2>

            <div class="history">
                ${profile.history.map(period => `
                    <div class="history-item">
                        <div class="history-year">${escapeHTML(period.year)}</div>
                        <div class="history-grade">${escapeHTML(period.label)}</div>
                        ${(period.events || []).map(eventHTML).join("")}
                    </div>
                `).join("")}
            </div>
        </div>

        <div class="social-links">
            ${(profile.social || []).map(link => `
                <a href="${escapeHTML(link.url)}" class="social-link" target="_blank" rel="noopener">${escapeHTML(link.label)}</a>
            `).join("")}
        </div>
    `;
})();
