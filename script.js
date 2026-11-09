/* Portfolio interactions: vanilla JavaScript, no build step. Shared by index.html and post.html. */
(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const SLUG_PATTERN = /^[a-z0-9-]+$/;
  const formatDate = (iso) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  /* ---------- Phone numbers (assembled on click, not stored as plain text in the HTML) ---------- */
  const PHONES = [
    { label: 'Vietnam (also on Line)', cc: '84', parts: ['987', '247', '499'], whatsapp: true },
    { label: 'Thailand', cc: '66', parts: ['93', '589', '3173'], whatsapp: false }
  ];

  /* ---------- Footer year ---------- */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- Mobile menu ---------- */
  const menuButton = $('#menu-button');
  const mobileMenu = $('#mobile-menu');
  if (menuButton && mobileMenu) {
    const iconOpen = $('#icon-open');
    const iconClose = $('#icon-close');
    const setMenu = (open) => {
      menuButton.setAttribute('aria-expanded', String(open));
      mobileMenu.classList.toggle('hidden', !open);
      if (iconOpen) iconOpen.classList.toggle('hidden', open);
      if (iconClose) iconClose.classList.toggle('hidden', !open);
    };
    menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
    $$('a', mobileMenu).forEach((link) => link.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') setMenu(false); });
    window.matchMedia('(min-width: 1024px)').addEventListener('change', (event) => { if (event.matches) setMenu(false); });
  }

  /* ---------- Active section highlighting ---------- */
  const navLinks = $$('.nav-link[href^="#"]');
  if (navLinks.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((link) => {
          link.setAttribute('aria-current', String(link.getAttribute('href') === `#${entry.target.id}`));
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    navLinks.map((link) => $(link.getAttribute('href'))).filter(Boolean).forEach((section) => observer.observe(section));
  }

  /* ---------- Project filters ---------- */
  const filterButtons = $$('[data-filter]');
  const cards = $$('[data-category]');
  const countEl = $('#project-count');
  if (filterButtons.length && cards.length) {
    const updateCount = (shown) => {
      if (countEl) countEl.textContent = `Showing ${shown} of ${cards.length} projects`;
    };
    updateCount(cards.length);
    filterButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const filter = button.dataset.filter;
        filterButtons.forEach((other) => other.setAttribute('aria-pressed', String(other === button)));
        let shown = 0;
        cards.forEach((card) => {
          const match = filter === 'all' || card.dataset.category === filter;
          card.classList.toggle('hidden', !match);
          if (match) shown += 1;
        });
        updateCount(shown);
      });
    });
  }
  /* ---------- Projects: carousels, details popup, fullscreen viewer ---------- */
  const IMG_THUMB = (name) => `images/web/thumb/${name}.webp`;
  const IMG_FULL = (name) => `images/web/full/${name}.webp`;
  const imagesOf = (card) => (card.dataset.images || '').split(/\s+/).filter(Boolean);
  const FULLSCREEN_ICON = '<svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';

  const makeImg = (src, alt, lazy = true) => {
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt;
    img.decoding = 'async';
    if (lazy) img.loading = 'lazy';
    return img;
  };

  /* Focus trap shared by the popup and the viewer */
  const trapFocus = (layer, event) => {
    if (event.key !== 'Tab') return;
    const focusable = $$('button, a[href], [tabindex]:not([tabindex="-1"])', layer).filter((el) => el.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  /* Fullscreen viewer */
  const viewer = $('#image-viewer');
  const viewerState = { images: [], index: 0, title: '', returnFocus: null };
  const showViewerImage = () => {
    const { images, index, title } = viewerState;
    $('#iv-img').src = IMG_FULL(images[index]);
    $('#iv-img').alt = `${title}, image ${index + 1} of ${images.length}`;
    $('#iv-count').textContent = images.length > 1 ? `${index + 1} / ${images.length}` : '';
    $('#iv-prev').classList.toggle('hidden', images.length < 2);
    $('#iv-next').classList.toggle('hidden', images.length < 2);
  };
  const openViewer = (images, index, title) => {
    if (!viewer) return;
    Object.assign(viewerState, { images, index, title, returnFocus: document.activeElement });
    showViewerImage();
    viewer.classList.remove('hidden');
    viewer.classList.add('flex');
    $('#iv-close').focus();
  };
  const closeViewer = () => {
    viewer.classList.add('hidden');
    viewer.classList.remove('flex');
    if (viewerState.returnFocus) viewerState.returnFocus.focus();
  };
  const stepViewer = (delta) => {
    const n = viewerState.images.length;
    viewerState.index = (viewerState.index + delta + n) % n;
    showViewerImage();
  };
  if (viewer) {
    $('#iv-close').addEventListener('click', closeViewer);
    $('#iv-prev').addEventListener('click', () => stepViewer(-1));
    $('#iv-next').addEventListener('click', () => stepViewer(1));
    viewer.addEventListener('click', (event) => { if (event.target === viewer) closeViewer(); });
  }

  /* Details popup */
  const modal = $('#project-modal');
  let modalReturnFocus = null;
  const openModal = (card) => {
    if (!modal) return;
    const title = $('.project-card-title', card).textContent.trim();
    const images = imagesOf(card);
    const metaSpans = $$('.project-card-head > span', card);
    $('#pm-title').textContent = title;
    $('#pm-meta').textContent = metaSpans.length > 1 ? metaSpans[metaSpans.length - 1].textContent : '';

    const gallery = $('#pm-gallery');
    gallery.replaceChildren(...images.map((name, i) => {
      const shot = document.createElement('div');
      shot.className = 'pm-shot';
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', `View image ${i + 1} full screen`);
      button.innerHTML = FULLSCREEN_ICON;
      button.addEventListener('click', () => openViewer(images, i, title));
      shot.append(makeImg(IMG_THUMB(name), `${title}, image ${i + 1} of ${images.length}`, i > 2), button);
      return shot;
    }));
    gallery.scrollLeft = 0;

    const template = $('template.project-details', card);
    $('#pm-body').replaceChildren(template ? template.content.cloneNode(true) : '');

    modalReturnFocus = document.activeElement;
    modal.classList.remove('hidden');
    modal.scrollTop = 0;
    document.body.style.overflow = 'hidden';
    $('#pm-close').focus();
  };
  const closeModal = () => {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
    if (modalReturnFocus) modalReturnFocus.focus();
  };
  if (modal) {
    $('#pm-close').addEventListener('click', closeModal);
    modal.addEventListener('click', (event) => {
      if (event.target === modal || event.target === modal.firstElementChild) closeModal();
    });
  }

  document.addEventListener('keydown', (event) => {
    const viewerOpen = viewer && !viewer.classList.contains('hidden');
    const modalOpen = modal && !modal.classList.contains('hidden');
    if (viewerOpen) {
      if (event.key === 'Escape') closeViewer();
      else if (event.key === 'ArrowLeft' && viewerState.images.length > 1) stepViewer(-1);
      else if (event.key === 'ArrowRight' && viewerState.images.length > 1) stepViewer(1);
      else trapFocus(viewer, event);
    } else if (modalOpen) {
      if (event.key === 'Escape') closeModal();
      else trapFocus(modal, event);
    }
  });

  /* Cards and carousels */
  $$('.project-group').forEach((group) => {
    const viewport = $('.carousel-viewport', group);
    const track = $('.carousel-track', group);
    const cards = $$('.project-card', track);
    const prev = $('.carousel-prev', group);
    const next = $('.carousel-next', group);
    const seeAll = $('.see-all-btn', group);
    const spacer = document.createElement('div');
    spacer.className = 'carousel-spacer';
    spacer.setAttribute('aria-hidden', 'true');
    track.appendChild(spacer);

    cards.forEach((card) => {
      const title = $('.project-card-title', card).textContent.trim();
      const images = imagesOf(card).slice(0, 2);
      if (images.length) {
        const media = document.createElement('div');
        media.className = 'project-card-media';
        images.forEach((name, i) => media.appendChild(makeImg(IMG_THUMB(name), `${title}, preview ${i + 1}`)));
        card.appendChild(media);
      }
      const readMore = document.createElement('button');
      readMore.type = 'button';
      readMore.className = 'read-more-btn';
      readMore.innerHTML = 'Read More <span aria-hidden="true">→</span>';
      readMore.setAttribute('aria-label', `Read more about ${title}`);
      readMore.addEventListener('click', () => openModal(card));
      card.appendChild(readMore);
    });

    let perView = 2;
    let step = 0;
    const gap = () => parseFloat(getComputedStyle(track).columnGap) || 24;
    const currentIndex = () => (step ? Math.round(track.scrollLeft / step) : 0);
    const maxIndex = () => Math.max(0, cards.length - perView);

    const update = () => {
      const expanded = group.classList.contains('is-expanded');
      const index = Math.min(currentIndex(), maxIndex());
      cards.forEach((card, i) => {
        const dim = !expanded && (i < index || i >= index + perView);
        card.classList.toggle('is-dim', dim);
        $('.read-more-btn', card).tabIndex = dim ? -1 : 0;
      });
      prev.disabled = index <= 0;
      next.disabled = index >= maxIndex();
    };

    const layout = () => {
      if (group.classList.contains('is-expanded')) { viewport.style.marginRight = ''; update(); return; }
      const width = group.clientWidth;
      const gutter = Math.max(0, document.documentElement.clientWidth - group.getBoundingClientRect().right);
      const wide = window.matchMedia('(min-width: 768px)').matches;
      perView = wide ? 2 : 1;
      const cardWidth = wide ? (width - gap()) / 2 : width * 0.86;
      step = cardWidth + gap();
      track.style.setProperty('--card-w', `${cardWidth}px`);
      viewport.style.marginRight = `-${gutter}px`;
      // Spacer lets the last card(s) settle flush with the content edge instead of the screen edge.
      spacer.style.width = `${Math.max(0, gutter - gap())}px`;
      update();
    };

    const goTo = (index) => {
      track.scrollTo({ left: Math.max(0, Math.min(index, maxIndex())) * step, behavior: 'smooth' });
    };
    prev.addEventListener('click', () => goTo(currentIndex() - 1));
    next.addEventListener('click', () => goTo(currentIndex() + 1));

    // Clicking a dimmed card brings it into view rather than opening it.
    cards.forEach((card, i) => {
      card.addEventListener('click', (event) => {
        if (!card.classList.contains('is-dim')) return;
        event.preventDefault();
        event.stopPropagation();
        goTo(i < currentIndex() ? i : i - perView + 1);
      }, true);
    });

    let ticking = false;
    track.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { update(); ticking = false; });
    }, { passive: true });
    window.addEventListener('resize', layout);

    seeAll.setAttribute('aria-expanded', 'false');
    seeAll.addEventListener('click', () => {
      const expanded = group.classList.toggle('is-expanded');
      seeAll.textContent = expanded ? 'Show less' : 'See All';
      seeAll.setAttribute('aria-expanded', String(expanded));
      if (!expanded) {
        track.scrollLeft = 0;
        group.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      layout();
    });

    layout();
  });
  /* ---------- Reveal phone numbers ---------- */
  const phoneButton = $('#reveal-phone');
  const phoneList = $('#phone-list');
  if (phoneButton && phoneList) {
    phoneButton.addEventListener('click', () => {
      phoneList.replaceChildren();
      PHONES.forEach((phone) => {
        const digits = phone.parts.join('');
        const item = document.createElement('li');
        item.className = 'flex flex-wrap items-center gap-x-3 gap-y-1';

        const label = document.createElement('span');
        label.className = 'text-leaf-200';
        label.textContent = `${phone.label}:`;

        const call = document.createElement('a');
        call.href = `tel:+${phone.cc}${digits}`;
        call.className = 'font-medium text-white underline decoration-leaf-300 underline-offset-4 hover:decoration-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white';
        call.textContent = `+${phone.cc} ${phone.parts.join(' ')}`;

        item.append(label, call);

        if (phone.whatsapp) {
          const chat = document.createElement('a');
          chat.href = `https://wa.me/${phone.cc}${digits}`;
          chat.target = '_blank';
          chat.rel = 'noopener noreferrer';
          chat.className = 'rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white';
          chat.textContent = 'WhatsApp';
          item.appendChild(chat);
        }
        phoneList.appendChild(item);
      });
      phoneList.classList.remove('hidden');
      phoneButton.classList.add('hidden');
    });
  }

  /* ---------- Blog list (index.html) ---------- */
  const postsEl = $('#posts');
  if (postsEl) {
    const showMessage = (text) => {
      const p = document.createElement('p');
      p.className = 'col-span-full text-sm text-stone-600';
      p.textContent = text;
      postsEl.replaceChildren(p);
    };

    const renderCard = (post) => {
      const article = document.createElement('article');
      article.className = 'card flex flex-col transition hover:shadow-md';

      const date = document.createElement('p');
      date.className = 'text-xs text-stone-500';
      date.textContent = formatDate(post.date);

      const title = document.createElement('h3');
      title.className = 'mt-2 text-lg font-semibold leading-snug text-bark-900';
      const link = document.createElement('a');
      link.href = `post.html?slug=${encodeURIComponent(post.slug)}`;
      link.className = 'hover:text-leaf-700 focus:outline-none focus-visible:underline';
      link.textContent = post.title;
      title.appendChild(link);

      const summary = document.createElement('p');
      summary.className = 'mt-3 text-sm leading-relaxed text-stone-600';
      summary.textContent = post.summary || '';

      article.append(date, title, summary);

      if (Array.isArray(post.tags) && post.tags.length) {
        const tags = document.createElement('ul');
        tags.className = 'mt-auto flex flex-wrap gap-2 pt-5';
        post.tags.forEach((tag) => {
          const li = document.createElement('li');
          li.className = 'chip-brown';
          li.textContent = tag;
          tags.appendChild(li);
        });
        article.appendChild(tags);
      }
      return article;
    };

    fetch('posts/posts.json', { cache: 'no-cache' })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((posts) => {
        const valid = posts
          .filter((post) => SLUG_PATTERN.test(post.slug) && post.title && post.date)
          .sort((a, b) => b.date.localeCompare(a.date));
        if (!valid.length) { showMessage('The first post is on its way.'); return; }
        postsEl.replaceChildren(...valid.map(renderCard));
      })
      .catch((error) => {
        console.warn('Could not load posts/posts.json:', error);
        showMessage('Posts could not be loaded right now.');
      });
  }

  /* ---------- Blog post reader (post.html) ---------- */
  const postContent = $('#post-content');
  if (postContent) {
    const titleEl = $('#post-title');
    const metaEl = $('#post-meta');
    const fail = (text) => {
      titleEl.textContent = 'Post not found';
      postContent.textContent = text;
    };

    const slug = new URLSearchParams(window.location.search).get('slug') || '';

    if (!SLUG_PATTERN.test(slug)) {
      fail('That link does not point to a post.');
    } else if (!window.marked || !window.DOMPurify) {
      fail('The reader could not load. Please refresh the page.');
    } else {
      Promise.all([
        fetch('posts/posts.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : [])),
        fetch(`posts/${slug}.md`, { cache: 'no-cache' }).then((r) => {
          if (!r.ok) throw new Error('Post file missing');
          return r.text();
        })
      ])
        .then(([posts, markdown]) => {
          const meta = posts.find((post) => post.slug === slug) || {};
          const title = meta.title || 'Untitled';
          document.title = `${title} | Khoa Tran Huu Le`;
          titleEl.textContent = title;
          if (meta.date) metaEl.textContent = formatDate(meta.date);
          postContent.innerHTML = window.DOMPurify.sanitize(window.marked.parse(markdown));
          $$('a[href^="http"]', postContent).forEach((anchor) => {
            anchor.target = '_blank';
            anchor.rel = 'noopener noreferrer';
          });
        })
        .catch(() => fail('This post could not be loaded.'));
    }
  }
})();
