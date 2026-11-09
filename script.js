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
  /* ---------- Expand project groups ---------- */
  $$('[data-see-more]').forEach((button) => {
    button.addEventListener('click', () => {
      const group = button.dataset.seeMore;
      const groupCards = {
        research: '#research-projects',
        leadership: '#leadership-projects',
        academic: '#academic-projects'
      };
      const grid = $(groupCards[group]);

      if (!grid) return;

      $$('.project-extra', grid).forEach((card) => card.classList.remove('hidden'));
      button.remove();
    });
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
