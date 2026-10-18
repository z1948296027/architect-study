(function () {
  const STORAGE_KEY = "architect-essay-v1";
  const TAGS = ["高并发", "测试", "AI", "架构风格", "数据库"];
  const TAG_CLASS = { "高并发": "t-perf", "测试": "t-test", "AI": "t-ai", "架构风格": "t-arch", "数据库": "t-db" };
  let tab = "recent";
  let tagFilter = "all";
  let skimMode = false;
  let saved = load();

  function load() {
    try {
      return { checks: {}, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
    } catch (_) {
      return { checks: {} };
    }
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)); } catch (_) { /* 无痕模式等情况下忽略 */ }
  }

  const root = () => document.getElementById("essayView");
  const fill = (text) => text.replace(/【\s*([^】]*?)\s*】/g, '<mark class="fill">$1</mark>');
  const charCount = (text) => text.replace(/[【】\s]/g, "").length;
  const tagChip = (tag) => `<span class="essay-tag ${TAG_CLASS[tag] || ""}">${tag}</span>`;

  function bodyText() {
    return ESSAY_DATA.sample.body.map((section) => section.paras.map((p) => (typeof p === "string" ? p : "")).join("")).join("");
  }

  function firstSentence(text) {
    const index = text.indexOf("。");
    return index > -1 && index < text.length - 1 ? `${text.slice(0, index + 1)}<span class="skim-more">……</span>` : text;
  }

  function renderTabs() {
    const items = [["recent", "近两年真题"], ["sample", "范文：高并发"], ["history", "历年题目"]];
    return `<div class="course-tabs essay-tabs" role="tablist">
      ${items.map(([id, label]) => `<button class="${tab === id ? "active" : ""}" data-essay-tab="${id}">${label}</button>`).join("")}
    </div>`;
  }

  function renderRecent() {
    const plan = ESSAY_DATA.plan.map((item) => `
      <article class="plan-row">
        <span class="plan-rank">${item.rank}</span>
        <div>
          <h3>${item.name} ${tagChip(item.tag)}</h3>
          <p class="plan-hits">${item.hits}</p>
          <p>${item.why}</p>
        </div>
      </article>
    `).join("");

    const exams = ESSAY_DATA.recent.map((exam) => {
      const topics = exam.topics.filter((topic) => tagFilter === "all" || topic.tags.includes(tagFilter));
      if (!topics.length) return "";
      return `
        <section class="exam-block">
          <header><h2>${exam.exam}</h2><span>${exam.note}</span></header>
          <div class="topic-grid">
            ${topics.map((topic) => `
              <article class="topic-card ${topic.sample ? "has-sample" : ""}">
                <div class="topic-top"><span class="topic-no">${topic.no}</span><span class="topic-tags">${topic.tags.map(tagChip).join("")}</span></div>
                <h3>${topic.title}</h3>
                ${topic.asks ? `<ul>${topic.asks.map((ask) => `<li>${ask}</li>`).join("")}</ul>` : ""}
                ${topic.sample ? `<button class="secondary-button topic-sample" data-essay-tab="sample"><i data-lucide="file-pen-line"></i>看范文</button>` : ""}
              </article>
            `).join("")}
          </div>
        </section>
      `;
    }).join("");

    return `
      <div class="summary-strip"><strong>出题规律</strong><p>论文是 4 选 1。最近三次考试里，高并发和测试每次都考，AI 连续两次出现。每题第 1 问都是“概述项目和你的职责”，所以准备 1 到 2 个项目素材，能套进三四类题就够了。</p></div>
      <div class="section-head"><div><h2>建议准备顺序</h2><p>先做最稳的保底题，再追新趋势</p></div></div>
      <div class="plan-list">${plan}</div>
      <div class="section-head"><div><h2>近两年真题</h2><p>均为考生回忆版，措辞可能和原题有出入</p></div></div>
      <div class="filter-bar">
        <button class="${tagFilter === "all" ? "active" : ""}" data-essay-tag="all">全部</button>
        ${TAGS.map((tag) => `<button class="${tagFilter === tag ? "active" : ""}" data-essay-tag="${tag}">${tag}</button>`).join("")}
      </div>
      ${exams || `<div class="search-empty">这个分类下没有题目</div>`}
    `;
  }

  function renderSample() {
    const sample = ESSAY_DATA.sample;
    const done = sample.checklist.filter((_, index) => saved.checks[index]).length;
    const outlineWords = sample.outline.reduce((sum, part) => sum + part.words, 0);
    const body = sample.body.map((section) => `
      <h2>${section.h}</h2>
      ${section.paras.map((p) => (typeof p === "string"
        ? `<p>${skimMode ? fill(firstSentence(p)) : fill(p)}</p>`
        : `<h3>${p.sub}</h3>`)).join("")}
    `).join("");

    return `
      <header class="essay-head">
        <div>
          <span class="eyebrow">${sample.source} · ${sample.project}</span>
          <h1>${sample.title}</h1>
          <div class="course-meta">
            <span><i data-lucide="align-left"></i>摘要 ${charCount(sample.abstract)} 字</span>
            <span><i data-lucide="file-text"></i>正文 ${charCount(bodyText())} 字</span>
            <span><i data-lucide="highlighter"></i><mark class="fill">黄色</mark>是要换成你自己的数据</span>
          </div>
        </div>
      </header>

      <div class="summary-strip"><strong>题目要求</strong><p>${sample.asks.map((ask, index) => `${index + 1}. ${ask}`).join("<br>")}</p></div>

      <section class="essay-abstract">
        <h2>摘要</h2>
        <p>${fill(sample.abstract)}</p>
        <small>固定顺序：项目和规模 → 你的角色 → 一句点题 → 按题目六个方面逐条落地（缓存、异步、限流降级、数据库优化、服务拆分、水平扩容）→ 用四个性能问题说明综合运用 → 用数字说明效果。每条都要有项目动作和代价。</small>
      </section>

      <details class="essay-outline">
        <summary><i data-lucide="list-tree"></i>正文提纲（合计约 ${outlineWords} 字）</summary>
        <ol>
          ${sample.outline.map((part) => `
            <li><strong>${part.h}</strong><em>约 ${part.words} 字</em>
              <ul>${part.points.map((point) => `<li>${point}</li>`).join("")}</ul>
            </li>
          `).join("")}
        </ol>
      </details>

      <div class="essay-toolbar">
        <h2>正文</h2>
        <button class="secondary-button ${skimMode ? "on" : ""}" data-essay-skim><i data-lucide="${skimMode ? "eye" : "eye-off"}"></i>${skimMode ? "显示全文" : "只看每段首句"}</button>
      </div>
      <article class="essay-paper ${skimMode ? "skim" : ""}">${body}</article>

      <section class="essay-checklist">
        <div class="section-head"><div><h2>需要自己补充的素材</h2><p>已准备 ${done} / ${sample.checklist.length} 项，勾选只保存在这个浏览器里</p></div></div>
        ${sample.checklist.map((item, index) => `
          <label class="check-row"><input type="checkbox" data-essay-check="${index}" ${saved.checks[index] ? "checked" : ""}><span>${item}</span></label>
        `).join("")}
      </section>

      <section class="comparison-section">
        <h2>换题复用</h2>
        <p class="page-subtitle">项目背景、摘要开头和结尾都不用改，只换理论部分和实践部分的侧重点。</p>
        <div class="comparison-wrap">
          <table class="comparison-table">
            <thead><tr><th>题目</th><th>理论部分换成</th><th>实践部分侧重</th></tr></thead>
            <tbody>${sample.reuse.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody>
          </table>
        </div>
      </section>
    `;
  }

  function renderHistory() {
    return `
      <div class="summary-strip"><strong>资料来源</strong><p>2009–2022 年来自资料包里的真题 PDF；2023 年和 2024 年是回忆版，只有关键词或题目大意。反复出现的主题：可靠性、企业集成、架构风格与评估、微服务和 SOA。</p></div>
      <div class="comparison-wrap">
        <table class="comparison-table history-table">
          <thead><tr><th>年份</th><th>试题一</th><th>试题二</th><th>试题三</th><th>试题四</th></tr></thead>
          <tbody>${ESSAY_DATA.history.map(([year, a, b, c, d, note]) => `
            <tr><td><strong>${year}</strong>${note ? `<small>${note}</small>` : ""}</td><td>${a}</td><td>${b}</td><td>${c}</td><td>${d}</td></tr>
          `).join("")}</tbody>
        </table>
      </div>
    `;
  }

  function render() {
    const view = root();
    if (!view) return;
    const content = tab === "sample" ? renderSample() : tab === "history" ? renderHistory() : renderRecent();
    view.innerHTML = `
      <h1 class="page-title">论文备考</h1>
      <p class="page-subtitle">4 选 1 · 摘要不超过 400 字 · 正文 2000–3000 字</p>
      ${renderTabs()}
      ${content}
    `;
    if (window.lucide) window.lucide.createIcons();
  }

  document.addEventListener("click", (event) => {
    if (!event.target.closest("#essayView")) return;
    const tabButton = event.target.closest("[data-essay-tab]");
    if (tabButton) {
      tab = tabButton.dataset.essayTab;
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const tagButton = event.target.closest("[data-essay-tag]");
    if (tagButton) {
      tagFilter = tagButton.dataset.essayTag;
      render();
      return;
    }
    if (event.target.closest("[data-essay-skim]")) {
      skimMode = !skimMode;
      render();
    }
  });

  document.addEventListener("change", (event) => {
    const box = event.target.closest("[data-essay-check]");
    if (!box) return;
    saved.checks[box.dataset.essayCheck] = box.checked;
    save();
    render();
  });

  window.renderEssayView = render;
})();
