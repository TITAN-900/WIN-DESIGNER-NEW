(function () {
  const data = window.WIN_DESIGN_DATA || { site: {}, projects: [] };
  const { site, projects } = data;
  const body = document.body;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function text(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function attr(value) {
    return text(value);
  }

  function projectUrl(slug) {
    return `project.html?project=${encodeURIComponent(slug)}`;
  }

  function whatsappUrl(message) {
    return `${site.whatsappBase}?text=${encodeURIComponent(message)}`;
  }

  function imageMarkup(image, loading = "lazy", extra = "") {
    if (!image) return "";
    const decoding = loading === "eager" ? "sync" : "async";
    return `<img src="${attr(image.src)}" alt="${attr(image.alt)}" width="${attr(image.width)}" height="${attr(image.height)}" loading="${loading}" decoding="${decoding}"${extra}>`;
  }

  function lightboxButton(image, group, index, loading = "lazy") {
    return `
      <button class="gallery-button" type="button" data-reveal data-lightbox-group="${attr(group)}" data-lightbox-index="${index}" data-lightbox-src="${attr(image.src)}" data-lightbox-alt="${attr(image.alt)}">
        ${imageMarkup(image, loading)}
      </button>
    `;
  }

  function setYear() {
    $$(".js-year").forEach((node) => {
      node.textContent = String(new Date().getFullYear());
    });
  }

  function initNavigation() {
    const nav = $(".site-nav");
    const menuToggle = $(".menu-toggle");
    const navLinks = $$(".nav-links a");
    const hero = $(".hero, .project-hero");

    menuToggle?.addEventListener("click", () => {
      const isOpen = body.classList.toggle("menu-open");
      menuToggle.setAttribute("aria-expanded", String(isOpen));
    });

    navLinks.forEach((link) => {
      link.addEventListener("click", () => {
        body.classList.remove("menu-open");
        menuToggle?.setAttribute("aria-expanded", "false");
      });
    });

    if (nav && hero && "IntersectionObserver" in window) {
      const navObserver = new IntersectionObserver((entries) => {
        nav.classList.toggle("is-solid", entries[0].intersectionRatio < 0.82);
      }, { threshold: [0, 0.82, 1] });
      navObserver.observe(hero);
    } else {
      nav?.classList.add("is-solid");
    }

    const sections = $$("[data-nav-section]");
    if (!sections.length || !("IntersectionObserver" in window)) return;

    const sectionObserver = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;

      navLinks.forEach((link) => {
        link.classList.toggle("is-active", link.getAttribute("href") === `#${visible.target.id}`);
      });
    }, { rootMargin: "-35% 0px -50% 0px", threshold: [0.12, 0.45, 0.75] });

    sections.forEach((section) => sectionObserver.observe(section));
  }

  function initReveal() {
    const revealItems = $$("[data-reveal]");
    if (!("IntersectionObserver" in window)) {
      revealItems.forEach((item) => item.classList.add("is-visible"));
      return;
    }

    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.14 });

    revealItems.forEach((item) => {
      const rect = item.getBoundingClientRect();
      const startsInView = rect.top < window.innerHeight * 0.95 && rect.bottom > 0;
      if (startsInView) {
        item.classList.add("is-visible");
        return;
      }

      item.classList.add("reveal-ready");
      revealObserver.observe(item);
    });
  }

  function renderHome() {
    const heroImage = $("#heroImage");
    if (heroImage && site.hero) {
      heroImage.src = site.hero.src;
      heroImage.alt = site.hero.alt;
      heroImage.width = site.hero.width;
      heroImage.height = site.hero.height;
    }

    const list = $("#projectSections");
    if (list) {
      list.innerHTML = projects.map((project, index) => {
        const group = `home-${project.slug}`;
        const gallery = project.gallery.slice(0, 3).map((image, imageIndex) =>
          lightboxButton(image, group, imageIndex, index < 2 ? "eager" : "lazy")
        ).join("");
        const meta = [project.type, project.location, project.year].filter(Boolean).join(" / ");

        return `
          <article class="project-story${index % 2 ? " is-reverse" : ""}" id="${attr(project.slug)}" data-reveal>
            <a class="project-cover" href="${projectUrl(project.slug)}" aria-label="View ${attr(project.title)} project">
              ${imageMarkup(project.cover, index === 0 ? "eager" : "lazy", index === 0 ? ' fetchpriority="high"' : "")}
            </a>
            <div class="project-story-copy">
              <p class="project-meta">${text(meta)}</p>
              <h3><a href="${projectUrl(project.slug)}">${text(project.title)}</a></h3>
              <p>${text(project.intro)}</p>
              <a class="inline-link" href="${projectUrl(project.slug)}">View project</a>
              <div class="story-gallery" aria-label="${attr(project.title)} preview gallery">
                ${gallery}
              </div>
            </div>
          </article>
        `;
      }).join("");
    }

    renderTransformationPreview();
  }

  function renderTransformationPreview() {
    const target = $("#transformationPreview");
    if (!target) return;

    const project = projects.find((item) => item.beforeAfter && item.beforeAfter.length);
    if (!project) {
      target.innerHTML = `<p class="empty-note">Before and after images will appear here once verified project pairs are available.</p>`;
      return;
    }

    const pair = project.beforeAfter[0];
    target.innerHTML = `
      <div class="compare-grid">
        <figure class="compare-figure" data-reveal>
          <div class="compare-media">${lightboxButton(pair.before, "home-transformations", 0)}</div>
          <figcaption class="compare-label">
            <strong>Before</strong>
            <span>Renovation stage</span>
          </figcaption>
        </figure>
        <figure class="compare-figure" data-reveal style="--delay: 90ms;">
          <div class="compare-media">${lightboxButton(pair.after, "home-transformations", 1)}</div>
          <figcaption class="compare-label">
            <strong>After</strong>
            <span>Finished interior</span>
          </figcaption>
        </figure>
      </div>
    `;
  }

  function currentProject() {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("project");
    return projects.find((project) => project.slug === slug) || projects[0];
  }

  function renderProjectPage() {
    const page = $(".project-page");
    if (!page) return;

    const project = currentProject();
    const title = `${site.name} | ${project.title}`;
    document.title = title;
    updateMeta("description", `${project.title}. ${project.intro}`);
    updateMeta("og:title", title);
    updateMeta("og:description", project.intro);
    updateMeta("og:image", project.cover.src);

    $("#projectHeroImage").outerHTML = imageMarkup(project.cover, "eager", ' fetchpriority="high" class="project-hero-image" id="projectHeroImage"');
    $("#projectTitle").textContent = project.title;
    $("#projectType").textContent = project.type;
    $("#projectIntro").textContent = project.intro;
    $("#projectDescription").textContent = project.description;
    $("#projectFactType").textContent = project.type;
    $("#projectFactImages").textContent = `${project.gallery.length} images`;

    const gallery = $("#projectGallery");
    if (gallery) {
      gallery.innerHTML = project.gallery.map((image, index) =>
        lightboxButton(image, `project-${project.slug}`, index)
      ).join("");
    }

    const beforeAfterSection = $("#projectBeforeAfter");
    const beforeAfterGrid = $("#projectBeforeAfterGrid");
    if (beforeAfterSection && beforeAfterGrid) {
      if (!project.beforeAfter.length) {
        beforeAfterSection.hidden = true;
      } else {
        beforeAfterSection.hidden = false;
        beforeAfterGrid.innerHTML = project.beforeAfter.map((pair, index) => `
          <div class="compare-grid" data-reveal>
            <figure class="compare-figure">
              <div class="compare-media">${lightboxButton(pair.before, `before-after-${project.slug}-${index}`, 0)}</div>
              <figcaption class="compare-label">
                <strong>Before</strong>
                <span>Renovation stage</span>
              </figcaption>
            </figure>
            <figure class="compare-figure">
              <div class="compare-media">${lightboxButton(pair.after, `before-after-${project.slug}-${index}`, 1)}</div>
              <figcaption class="compare-label">
                <strong>After</strong>
                <span>Finished interior</span>
              </figcaption>
            </figure>
          </div>
        `).join("");
      }
    }

    const projectSelect = $("#projectSelect");
    if (projectSelect) {
      projectSelect.value = project.title;
    }
  }

  function updateMeta(name, content) {
    const selector = name.startsWith("og:")
      ? `meta[property="${name}"]`
      : `meta[name="${name}"]`;
    const node = $(selector);
    if (node) node.setAttribute("content", content);
  }

  function initContactForms() {
    $$(".contact-form").forEach((form) => {
      const status = $(".form-status", form);
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const name = String(formData.get("name") || "").trim();
        const phone = String(formData.get("phone") || "").trim();
        const projectType = String(formData.get("projectType") || "").trim();
        const message = String(formData.get("message") || "").trim();

        if (!name || !phone) {
          if (status) status.textContent = "Please add your name and phone number.";
          return;
        }

        const lines = [
          `Hi WIN DESIGN, I would like to discuss my interior project.`,
          `Name: ${name}`,
          `Phone: ${phone}`,
          projectType ? `Project: ${projectType}` : "",
          message ? `Message: ${message}` : ""
        ].filter(Boolean);

        if (status) status.textContent = "Opening WhatsApp with your project details.";
        window.open(whatsappUrl(lines.join("\n")), "_blank", "noopener");
      });
    });
  }

  function initLightbox() {
    const lightbox = $("#lightbox");
    if (!lightbox) return;

    const image = $("#lightboxImage", lightbox);
    const caption = $("#lightboxCaption", lightbox);
    const close = $("[data-lightbox-close]", lightbox);
    const prev = $("[data-lightbox-prev]", lightbox);
    const next = $("[data-lightbox-next]", lightbox);
    let items = [];
    let index = 0;
    let lastFocus = null;

    function setImage(nextIndex) {
      if (!items.length) return;
      index = (nextIndex + items.length) % items.length;
      const item = items[index];
      image.src = item.src;
      image.alt = item.alt;
      caption.textContent = item.alt;
    }

    function open(trigger) {
      const group = trigger.dataset.lightboxGroup;
      items = $$("[data-lightbox-group]").filter((node) => node.dataset.lightboxGroup === group).map((node) => ({
        src: node.dataset.lightboxSrc,
        alt: node.dataset.lightboxAlt
      }));
      index = Number(trigger.dataset.lightboxIndex || 0);
      lastFocus = document.activeElement;
      setImage(index);
      lightbox.classList.add("is-open");
      lightbox.setAttribute("aria-hidden", "false");
      body.classList.add("lightbox-open");
      close.focus();
    }

    function closeLightbox() {
      lightbox.classList.remove("is-open");
      lightbox.setAttribute("aria-hidden", "true");
      body.classList.remove("lightbox-open");
      lastFocus?.focus?.();
    }

    document.addEventListener("click", (event) => {
      const trigger = event.target.closest("[data-lightbox-src]");
      if (!trigger) return;
      open(trigger);
    });

    close.addEventListener("click", closeLightbox);
    prev.addEventListener("click", () => setImage(index - 1));
    next.addEventListener("click", () => setImage(index + 1));
    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) closeLightbox();
    });

    document.addEventListener("keydown", (event) => {
      if (!lightbox.classList.contains("is-open")) return;
      if (event.key === "Escape") closeLightbox();
      if (event.key === "ArrowLeft") setImage(index - 1);
      if (event.key === "ArrowRight") setImage(index + 1);
    });
  }

  function boot() {
    setYear();
    renderHome();
    renderProjectPage();
    initNavigation();
    initContactForms();
    initLightbox();
    initReveal();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
