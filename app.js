(function () {
  const STORAGE_KEY = "architect-fast-study-v2";
  const SIDEBAR_KEY = "architect-sidebar-collapsed";
  const today = new Date().toISOString().slice(0, 10);
  const defaultState = { mastered: {}, quiz: {}, review: {}, lastCourse: 9, activeDays: [] };
  let state = loadState();
  let currentCourse = state.lastCourse || 9;
  let activeTab = "deep";
  let activeFilter = "all";
  let reviewQueue = [];
  let reviewIndex = 0;

  const el = (id) => document.getElementById(id);

  function loadState() {
    try {
      return { ...defaultState, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
    } catch (_) {
      return { ...defaultState };
    }
  }

  function saveState() {
    if (!state.activeDays.includes(today)) state.activeDays.push(today);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    updateStats();
  }

  function iconRefresh() {
    if (window.lucide) window.lucide.createIcons();
  }

  function courseById(id) {
    return COURSES.find((course) => course.id === Number(id));
  }

  function conceptKey(courseId, conceptIndex) {
    return `${courseId}-${conceptIndex}`;
  }

  function coursePercent(course) {
    const mastered = course.points.filter((_, index) => state.mastered[conceptKey(course.id, index)]).length;
    return Math.round((mastered / course.points.length) * 100);
  }

  function completedCourses() {
    return COURSES.filter((course) => coursePercent(course) === 100).length;
  }

  function masteredCount() {
    return Object.values(state.mastered).filter(Boolean).length;
  }

  function totalConcepts() {
    return COURSES.reduce((sum, course) => sum + course.points.length, 0);
  }

  function detailCount(course) {
    return course.details ? course.details.sections.reduce((sum, section) => sum + section.items.length, 0) : 0;
  }

  function totalDetails() {
    return COURSES.reduce((sum, course) => sum + detailCount(course), 0);
  }

  function dueCount() {
    return Object.values(state.review).filter((item) => item && item.due <= today).length;
  }

  function streak() {
    const days = [...new Set(state.activeDays)].sort().reverse();
    if (!days.length) return 0;
    let count = 0;
    const cursor = new Date();
    for (const day of days) {
      const expected = cursor.toISOString().slice(0, 10);
      if (day === expected) {
        count += 1;
        cursor.setDate(cursor.getDate() - 1);
      } else if (count === 0) {
        cursor.setDate(cursor.getDate() - 1);
        if (day === cursor.toISOString().slice(0, 10)) {
          count += 1;
          cursor.setDate(cursor.getDate() - 1);
        } else break;
      } else break;
    }
    return count;
  }

  function updateStats() {
    el("masteredCount").textContent = masteredCount();
    el("streakCount").textContent = streak();
    el("reviewCount").textContent = dueCount();
    el("courseProgressLabel").textContent = `${completedCourses()} / ${COURSES.length}`;
    renderCourseNav();
  }

  function priorityLabel(priority) {
    return priority === "core" ? "核心" : priority === "important" ? "重点" : "基础";
  }

  function renderCourseNav() {
    el("courseNav").innerHTML = COURSES.map((course) => `
      <button data-course="${course.id}" class="${currentCourse === course.id ? "active" : ""}">
        <span class="hour">${String(course.id).padStart(2, "0")}</span>
        <span class="title">${course.title}</span>
        <span class="done-dot ${coursePercent(course) === 100 ? "done" : ""}"></span>
      </button>
    `).join("");
  }

  function courseCard(course) {
    const percent = coursePercent(course);
    return `
      <button class="course-card" data-course="${course.id}">
        <span class="course-card-top">
          <span class="hour-pill">第 ${course.id} 小时</span>
          <span class="card-badges">
            ${course.details ? `<span class="detail-badge">逐页精炼</span>` : ""}
            <span class="priority ${course.priority}">${priorityLabel(course.priority)}</span>
          </span>
        </span>
        <h3>${course.title}</h3>
        <p>${course.summary}</p>
        <span class="course-card-foot">
          <span>${course.details ? `${detailCount(course)} 条教材精炼` : `${course.points.length} 个知识点`}</span>
          <span class="mini-progress"><i style="width:${percent}%"></i></span>
          <span>${percent}%</span>
        </span>
      </button>
    `;
  }

  function renderDashboard() {
    const course = courseById(currentCourse) || COURSES[0];
    const overall = Math.round((masteredCount() / totalConcepts()) * 100);
    const recommended = COURSES.filter((item) => item.priority === "core" && coursePercent(item) < 100).slice(0, 6);
    el("dashboardView").innerHTML = `
      <div class="dashboard-head">
        <section class="continue-panel">
          <div>
            <span class="eyebrow">继续学习 · 第 ${course.id} 小时</span>
            <h1>${course.title}</h1>
            <p>${course.summary}</p>
          </div>
          <div class="continue-actions">
            <button class="primary-button" data-course="${course.id}"><i data-lucide="play"></i>进入课时</button>
            <button class="secondary-button" data-view="review"><i data-lucide="brain"></i>复习 ${dueCount()} 项</button>
          </div>
        </section>
        <aside class="progress-panel">
          <div class="progress-ring" style="--progress:${overall}%">
            <div><strong>${overall}%</strong><span>总掌握度</span></div>
          </div>
          <div class="progress-meta">
            <div><strong>${masteredCount()}</strong><span>已掌握知识点</span></div>
            <div><strong>${completedCourses()}</strong><span>已完成课时</span></div>
          </div>
        </aside>
      </div>

      <div class="section-head">
        <div><h2>先攻核心</h2><p>同时覆盖选择、案例与论文的高密度章节</p></div>
      </div>
      <div class="course-grid">${recommended.map(courseCard).join("")}</div>

      <div class="section-head">
        <div><h2>快速回忆</h2><p>从已学知识中抽取概念</p></div>
        <button class="secondary-button" data-view="review"><i data-lucide="refresh-cw"></i>开始复习</button>
      </div>
    `;
    iconRefresh();
  }

  function renderCourses() {
    const filtered = activeFilter === "all" ? COURSES : COURSES.filter((course) => course.priority === activeFilter);
    el("coursesView").innerHTML = `
      <h1 class="page-title">全部知识课时</h1>
      <p class="page-subtitle">${COURSES.length} 个课时，已完成 ${totalDetails()} 条教材精炼</p>
      <div class="filter-bar">
        <button class="${activeFilter === "all" ? "active" : ""}" data-filter="all">全部</button>
        <button class="${activeFilter === "core" ? "active" : ""}" data-filter="core">核心</button>
        <button class="${activeFilter === "important" ? "active" : ""}" data-filter="important">重点</button>
        <button class="${activeFilter === "basic" ? "active" : ""}" data-filter="basic">基础</button>
      </div>
      <div class="course-grid">${filtered.map(courseCard).join("")}</div>
    `;
  }

  function renderCourse(id) {
    const course = courseById(id);
    if (!course) return;
    if (course.details && activeTab === "essentials") activeTab = "deep";
    if (!course.details && activeTab === "deep") activeTab = "essentials";
    currentCourse = course.id;
    state.lastCourse = course.id;
    saveState();
    const tabContent = activeTab === "essentials" ? renderConcepts(course)
      : activeTab === "deep" ? renderDeepDive(course)
      : activeTab === "traps" ? renderTraps(course)
      : renderQuiz(course);

    el("courseView").innerHTML = `
      <header class="course-header">
        <div class="course-number">${course.id}</div>
        <div class="course-header-main">
          <h1>${course.title}</h1>
          <div class="course-meta">
            <span><i data-lucide="file-text"></i>PDF ${course.pages}</span>
            <span><i data-lucide="layers-3"></i>${course.details ? `${detailCount(course)} 条教材精炼` : `${course.points.length} 个知识点`}</span>
            <span><i data-lucide="circle-gauge"></i>${coursePercent(course)}% 掌握</span>
            ${course.details ? `<span class="deep-complete"><i data-lucide="scan-text"></i>逐页精炼完成</span>` : ""}
          </div>
        </div>
        <button class="secondary-button" id="markCourseDone"><i data-lucide="check-check"></i>全部掌握</button>
      </header>
      <div class="course-tabs" role="tablist">
        ${course.details ? "" : `<button class="${activeTab === "essentials" ? "active" : ""}" data-tab="essentials">章节概览</button>`}
        ${course.details ? `<button class="${activeTab === "deep" ? "active" : ""}" data-tab="deep">教材精炼</button>` : ""}
        <button class="${activeTab === "traps" ? "active" : ""}" data-tab="traps">易错辨析</button>
        <button class="${activeTab === "quiz" ? "active" : ""}" data-tab="quiz">即时小测</button>
      </div>
      ${tabContent}
    `;
    showView("course", false);
    renderCourseNav();
    iconRefresh();
  }

  function renderConcepts(course) {
    return `
      <div class="summary-strip"><strong>30 秒看懂</strong><p>${course.summary}</p></div>
      <div class="concept-list">
        ${course.points.map((point, index) => {
          const key = conceptKey(course.id, index);
          return `
            <article class="concept-card">
              <div class="concept-term">${point.term}<small>${point.tag || "核心概念"}</small></div>
              <div class="concept-body">${point.text}${point.cue ? `<span class="cue">判断词：${point.cue}</span>` : ""}</div>
              <button class="master-button ${state.mastered[key] ? "mastered" : ""}" data-master="${key}" aria-label="${state.mastered[key] ? "取消掌握" : "标记掌握"}" title="${state.mastered[key] ? "取消掌握" : "标记掌握"}">
                <i data-lucide="check"></i>
              </button>
            </article>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderDeepDive(course) {
    const details = course.details;
    if (!details) return renderConcepts(course);
    return `
      <div class="coverage-strip">
        <i data-lucide="scan-text"></i>
        <div><strong>本阶段覆盖</strong><p>${details.coverage}</p></div>
      </div>
      <div class="deep-stack">
        ${details.sections.map((section) => `
          <section class="deep-section">
            <header>
              <div><h2>${section.title}</h2><p>${section.intro}</p></div>
              <span>${section.pages}</span>
            </header>
            <div class="detail-list">
              ${section.items.map(([label, text]) => `
                <article class="detail-row">
                  <h3>${label}</h3>
                  <p>${text}</p>
                </article>
              `).join("")}
            </div>
          </section>
        `).join("")}
      </div>
      ${details.tables.map((table) => `
        <section class="comparison-section">
          <h2>${table.title}</h2>
          <div class="comparison-wrap">
            <table class="comparison-table">
              <thead><tr>${table.headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead>
              <tbody>${table.rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody>
            </table>
          </div>
        </section>
      `).join("")}
      <section class="case-section">
        <h2>案例化理解</h2>
        <div class="case-list">
          ${details.cases.map((item) => `
            <article class="case-block">
              <div class="case-label"><i data-lucide="messages-square"></i>${item.title}</div>
              <p class="case-prompt">${item.prompt}</p>
              <p class="case-analysis"><strong>判断：</strong>${item.analysis}</p>
            </article>
          `).join("")}
        </div>
      </section>
    `;
  }

  function renderTraps(course) {
    return `
      <div class="summary-strip"><strong>辨析原则</strong><p>先找题干中的动作、作用对象和约束条件，再匹配术语；不要只凭熟悉的关键词作答。</p></div>
      <div class="trap-list">
        ${course.traps.map((trap) => `
          <article class="trap-card">
            <h3><i data-lucide="triangle-alert"></i>${trap.title}</h3>
            <p>${trap.text}</p>
          </article>
        `).join("")}
      </div>
    `;
  }

  function renderQuiz(course) {
    const textbookCount = course.quiz.filter((item) => item.source === "教材原题").length;
    const drillCount = course.quiz.length - textbookCount;
    if (!course.quiz.length) {
      return `
        <div class="empty-state quiz-empty">
          <i data-lucide="book-open-check"></i>
          <h2>本课时没有独立小测</h2>
          <p>题目已按原题型保留在教材精炼中，没有把案例或论文改造成选择题。</p>
        </div>
      `;
    }
    return `
      <div class="summary-strip"><strong>即时小测</strong><p>${textbookCount} 道教材原题 · ${drillCount} 道强化题。选择题可直接判分；案例与论文先主动回忆，再展开参考要点。</p></div>
      <div class="quiz-list">
        ${course.quiz.map((quiz, quizIndex) => quiz.kind === "open" ? `
          <article class="quiz-card open-quiz-card">
            <div class="quiz-heading">
              <span class="quiz-source textbook">${quiz.source || "教材原题"}</span>
              <h3>${quizIndex + 1}. ${quiz.q}</h3>
            </div>
            <details class="open-answer">
              <summary><i data-lucide="eye"></i>查看参考要点</summary>
              <p>${quiz.answerText}</p>
            </details>
          </article>
        ` : `
          <article class="quiz-card" data-quiz-card="${course.id}-${quizIndex}">
            <div class="quiz-heading">
              <span class="quiz-source ${quiz.source === "教材原题" ? "textbook" : "drill"}">${quiz.source || "强化题"}</span>
              <h3>${quizIndex + 1}. ${quiz.q}</h3>
            </div>
            <div class="quiz-options">
              ${quiz.options.map((option, optionIndex) => `<button class="quiz-option" data-quiz="${course.id}-${quizIndex}" data-option="${optionIndex}">${String.fromCharCode(65 + optionIndex)}. ${option}</button>`).join("")}
            </div>
            <p class="quiz-explain">${quiz.why}</p>
          </article>
        `).join("")}
      </div>
    `;
  }

  function prepareReviewQueue() {
    const due = [];
    Object.entries(state.review).forEach(([key, item]) => {
      if (!item || item.due > today) return;
      const [courseId, pointIndex] = key.split("-").map(Number);
      const course = courseById(courseId);
      if (course && course.points[pointIndex]) due.push({ key, course, point: course.points[pointIndex] });
    });
    if (!due.length) {
      COURSES.filter((course) => coursePercent(course) > 0).forEach((course) => {
        course.points.forEach((point, index) => {
          if (state.mastered[conceptKey(course.id, index)]) due.push({ key: conceptKey(course.id, index), course, point });
        });
      });
    }
    reviewQueue = due.sort(() => Math.random() - .5);
    reviewIndex = 0;
  }

  function renderReview() {
    prepareReviewQueue();
    if (!reviewQueue.length) {
      el("reviewView").innerHTML = `
        <div class="empty-state">
          <i data-lucide="sparkles"></i>
          <h2>还没有复习内容</h2>
          <p>先进入任意课时，掌握几个知识点。</p>
          <button class="primary-button" data-course="9"><i data-lucide="play"></i>从架构基础开始</button>
        </div>
      `;
      iconRefresh();
      return;
    }
    renderReviewCard();
  }

  function renderReviewCard() {
    const item = reviewQueue[reviewIndex];
    if (!item) {
      el("reviewView").innerHTML = `
        <div class="empty-state">
          <i data-lucide="badge-check"></i>
          <h2>本轮复习完成</h2>
          <p>本轮共完成 ${reviewQueue.length} 个知识点。</p>
          <button class="secondary-button" data-view="dashboard"><i data-lucide="gauge"></i>返回速学</button>
        </div>
      `;
      iconRefresh();
      return;
    }
    el("reviewView").innerHTML = `
      <div class="review-shell">
        <div class="review-top">
          <div><h1>主动回忆</h1><p>第 ${reviewIndex + 1} / ${reviewQueue.length} 项</p></div>
          <button class="icon-button" data-course="${item.course.id}" aria-label="打开所属课时" title="打开所属课时"><i data-lucide="external-link"></i></button>
        </div>
        <article class="review-card">
          <span class="review-course">第 ${item.course.id} 小时 · ${item.course.title}</span>
          <h2>${item.point.term}</h2>
          <p class="review-answer" id="reviewAnswer">${item.point.text}</p>
          <div class="review-actions" id="revealActions">
            <button class="primary-button" id="revealAnswer"><i data-lucide="eye"></i>显示答案</button>
          </div>
        </article>
        <div class="rating-actions" id="ratingActions">
          <button data-rating="again">忘记了 · 1 天</button>
          <button data-rating="hard">模糊 · 3 天</button>
          <button data-rating="good">记得 · 7 天</button>
        </div>
      </div>
    `;
    iconRefresh();
  }

  function rateReview(rating) {
    const item = reviewQueue[reviewIndex];
    const days = rating === "again" ? 1 : rating === "hard" ? 3 : 7;
    const due = new Date();
    due.setDate(due.getDate() + days);
    state.review[item.key] = { due: due.toISOString().slice(0, 10), rating };
    if (rating === "good") state.mastered[item.key] = true;
    saveState();
    reviewIndex += 1;
    renderReviewCard();
  }

  function showView(name, rerender = true) {
    document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
    const target = el(`${name}View`);
    if (target) target.classList.add("active");
    document.querySelectorAll("[data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === name));
    if (rerender) {
      if (name === "dashboard") renderDashboard();
      if (name === "courses") renderCourses();
      if (name === "review") renderReview();
      if (name === "essay" && window.renderEssayView) window.renderEssayView();
    }
    closeSidebar();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function answerQuiz(button) {
    const [courseId, quizIndex] = button.dataset.quiz.split("-").map(Number);
    const course = courseById(courseId);
    const quiz = course.quiz[quizIndex];
    const selected = Number(button.dataset.option);
    const card = button.closest(".quiz-card");
    card.querySelectorAll(".quiz-option").forEach((option, index) => {
      option.disabled = true;
      if (index === quiz.answer) option.classList.add("correct");
      if (index === selected && index !== quiz.answer) option.classList.add("wrong");
    });
    card.querySelector(".quiz-explain").classList.add("show");
    const key = `${courseId}-q${quizIndex}`;
    state.quiz[key] = selected === quiz.answer;
    if (selected !== quiz.answer) {
      const reviewKey = conceptKey(courseId, quiz.point || 0);
      state.review[reviewKey] = { due: today, rating: "again" };
      toast("已加入复习队列");
    } else {
      toast("回答正确");
    }
    saveState();
  }

  function toggleMaster(key) {
    state.mastered[key] = !state.mastered[key];
    if (state.mastered[key]) {
      const due = new Date();
      due.setDate(due.getDate() + 1);
      state.review[key] = { due: due.toISOString().slice(0, 10), rating: "new" };
      toast("已掌握，明天复习");
    } else {
      delete state.review[key];
      toast("已取消掌握");
    }
    saveState();
    renderCourse(currentCourse);
  }

  function markCourseDone() {
    const course = courseById(currentCourse);
    course.points.forEach((_, index) => {
      const key = conceptKey(course.id, index);
      state.mastered[key] = true;
      const due = new Date();
      due.setDate(due.getDate() + 1);
      state.review[key] = { due: due.toISOString().slice(0, 10), rating: "new" };
    });
    saveState();
    renderCourse(currentCourse);
    toast("本课时已全部掌握");
  }

  function search(query) {
    const box = el("searchResults");
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      box.hidden = true;
      box.innerHTML = "";
      return;
    }
    const deepResults = [];
    const essentialResults = [];
    COURSES.forEach((course) => {
      if (`${course.title} ${course.summary}`.toLowerCase().includes(normalized)) {
        essentialResults.push({ course, title: course.title, text: course.summary, tab: "essentials" });
      }
      course.points.forEach((point) => {
        if (`${point.term} ${point.text} ${point.cue || ""}`.toLowerCase().includes(normalized)) {
          essentialResults.push({ course, title: point.term, text: point.text, tab: "essentials" });
        }
      });
      if (course.details) {
        course.details.sections.forEach((section) => {
          section.items.forEach(([term, detail]) => {
            if (`${section.title} ${term} ${detail}`.toLowerCase().includes(normalized)) {
              deepResults.push({ course, title: term, text: detail, tab: "deep" });
            }
          });
        });
        course.details.cases.forEach((item) => {
          if (`${item.title} ${item.prompt} ${item.analysis}`.toLowerCase().includes(normalized)) {
            deepResults.push({ course, title: item.title, text: item.analysis, tab: "deep" });
          }
        });
      }
    });
    const results = [...deepResults, ...essentialResults];
    box.innerHTML = results.length ? results.slice(0, 12).map((result) => `
      <button class="search-result" data-course="${result.course.id}" data-open-tab="${result.tab}">
        <small>第 ${result.course.id} 小时 · ${result.course.title}</small>
        <strong>${result.title}</strong>
        <span>${result.text}</span>
      </button>
    `).join("") : `<div class="search-empty">没有找到“${query.replace(/[<>]/g, "")}”</div>`;
    box.hidden = false;
  }

  let toastTimer;
  function toast(message) {
    const node = el("toast");
    node.textContent = message;
    node.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove("show"), 1800);
  }

  function setSidebarCollapsed(collapsed, persist = true) {
    const shell = document.querySelector(".app-shell");
    const button = el("sidebarToggle");
    if (!shell || !button) return;
    shell.classList.toggle("sidebar-collapsed", collapsed);
    const label = collapsed ? "展开侧边栏" : "收起侧边栏";
    button.setAttribute("aria-expanded", String(!collapsed));
    button.setAttribute("aria-label", label);
    button.title = label;
    button.innerHTML = `<i data-lucide="${collapsed ? "chevrons-right" : "chevrons-left"}"></i>`;
    iconRefresh();
    if (persist) {
      try { localStorage.setItem(SIDEBAR_KEY, collapsed ? "1" : "0"); } catch (_) { /* 忽略无痕模式等写入失败 */ }
    }
  }

  function openSidebar() {
    el("sidebar").classList.add("open");
    el("sidebarScrim").classList.add("show");
  }

  function closeSidebar() {
    el("sidebar").classList.remove("open");
    el("sidebarScrim").classList.remove("show");
  }

  document.addEventListener("click", (event) => {
    const courseButton = event.target.closest("[data-course]");
    if (courseButton) {
      const selectedCourse = courseById(courseButton.dataset.course);
      activeTab = courseButton.dataset.openTab || (selectedCourse?.details ? "deep" : "essentials");
      el("searchResults").hidden = true;
      renderCourse(courseButton.dataset.course);
      return;
    }
    const viewButton = event.target.closest("[data-view]");
    if (viewButton) {
      showView(viewButton.dataset.view);
      return;
    }
    const tabButton = event.target.closest("[data-tab]");
    if (tabButton) {
      activeTab = tabButton.dataset.tab;
      renderCourse(currentCourse);
      return;
    }
    const filterButton = event.target.closest("[data-filter]");
    if (filterButton) {
      activeFilter = filterButton.dataset.filter;
      renderCourses();
      return;
    }
    const masterButton = event.target.closest("[data-master]");
    if (masterButton) {
      toggleMaster(masterButton.dataset.master);
      return;
    }
    const quizButton = event.target.closest("[data-quiz]");
    if (quizButton) {
      answerQuiz(quizButton);
      return;
    }
    const ratingButton = event.target.closest("[data-rating]");
    if (ratingButton) {
      rateReview(ratingButton.dataset.rating);
      return;
    }
    if (event.target.closest("#markCourseDone")) markCourseDone();
    if (event.target.closest("#revealAnswer")) {
      el("reviewAnswer").classList.add("show");
      el("revealActions").style.display = "none";
      el("ratingActions").classList.add("show");
    }
    if (!event.target.closest(".search-wrap")) el("searchResults").hidden = true;
  });

  el("globalSearch").addEventListener("input", (event) => search(event.target.value));
  el("openSidebar").addEventListener("click", openSidebar);
  el("closeSidebar").addEventListener("click", closeSidebar);
  el("sidebarScrim").addEventListener("click", closeSidebar);
  el("sidebarToggle").addEventListener("click", () => {
    setSidebarCollapsed(!document.querySelector(".app-shell").classList.contains("sidebar-collapsed"));
  });

  setSidebarCollapsed(localStorage.getItem(SIDEBAR_KEY) === "1", false);
  renderCourseNav();
  renderDashboard();
  updateStats();
  iconRefresh();
})();
