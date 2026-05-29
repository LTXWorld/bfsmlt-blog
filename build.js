#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const POSTS_DIR = path.join(ROOT, 'posts');
const SRC_DIR = path.join(ROOT, 'src');
const DIST_DIR = path.join(ROOT, 'dist');

const SITE = {
  title: 'My Blog',
  subtitle: '一个极简、文本优先、无依赖的静态博客。',
  description: 'A minimal static blog built with plain Node.js and Markdown.',
};

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function emptyDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  ensureDir(dir);
}

function copyFile(from, to) {
  ensureDir(path.dirname(to));
  fs.copyFileSync(from, to);
}

function copyDirContents(fromDir, toDir, { exclude = new Set() } = {}) {
  if (!fs.existsSync(fromDir)) return;

  for (const entry of fs.readdirSync(fromDir, { withFileTypes: true })) {
    if (exclude.has(entry.name)) continue;

    const from = path.join(fromDir, entry.name);
    const to = path.join(toDir, entry.name);

    if (entry.isDirectory()) {
      copyDirContents(from, to);
    } else if (entry.isFile()) {
      copyFile(from, to);
    }
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function slugifyHeading(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '') || 'section';
}

function parseFrontmatter(source) {
  if (!source.startsWith('---\n')) {
    return { data: {}, body: source };
  }

  const end = source.indexOf('\n---', 4);
  if (end === -1) {
    return { data: {}, body: source };
  }

  const raw = source.slice(4, end).trim();
  const body = source.slice(end + 4).replace(/^\n/, '');
  const data = {};

  for (const line of raw.split('\n')) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    const [, key, value] = match;
    data[key] = value.replace(/^['"]|['"]$/g, '').trim();
  }

  return { data, body };
}

function inlineMarkdown(text) {
  let html = escapeHtml(text);

  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  return html;
}

function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const html = [];
  let paragraph = [];
  let list = null;
  let blockquote = [];
  let inCode = false;
  let codeLang = '';
  let codeLines = [];

  function flushParagraph() {
    if (!paragraph.length) return;
    html.push(`<p>${inlineMarkdown(paragraph.join(' '))}</p>`);
    paragraph = [];
  }

  function flushList() {
    if (!list) return;
    html.push(`<${list.type}>`);
    for (const item of list.items) {
      html.push(`<li>${inlineMarkdown(item)}</li>`);
    }
    html.push(`</${list.type}>`);
    list = null;
  }

  function flushBlockquote() {
    if (!blockquote.length) return;
    html.push(`<blockquote>${markdownToHtml(blockquote.join('\n'))}</blockquote>`);
    blockquote = [];
  }

  function flushBlocks() {
    flushParagraph();
    flushList();
    flushBlockquote();
  }

  for (const line of lines) {
    const codeFence = line.match(/^```(.*)$/);
    if (codeFence) {
      if (inCode) {
        html.push(`<pre><code${codeLang ? ` class="language-${escapeHtml(codeLang)}"` : ''}>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
        inCode = false;
        codeLang = '';
        codeLines = [];
      } else {
        flushBlocks();
        inCode = true;
        codeLang = codeFence[1].trim();
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (!line.trim()) {
      flushBlocks();
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushBlocks();
      const level = heading[1].length;
      const text = inlineMarkdown(heading[2].trim());
      html.push(`<h${level} id="${slugifyHeading(heading[2])}">${text}</h${level}>`);
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      flushBlocks();
      html.push('<hr>');
      continue;
    }

    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      flushParagraph();
      flushList();
      blockquote.push(quote[1]);
      continue;
    }

    const unordered = line.match(/^[-*+]\s+(.+)$/);
    if (unordered) {
      flushParagraph();
      flushBlockquote();
      if (!list || list.type !== 'ul') list = { type: 'ul', items: [] };
      list.items.push(unordered[1]);
      continue;
    }

    const ordered = line.match(/^\d+\.\s+(.+)$/);
    if (ordered) {
      flushParagraph();
      flushBlockquote();
      if (!list || list.type !== 'ol') list = { type: 'ol', items: [] };
      list.items.push(ordered[1]);
      continue;
    }

    flushList();
    flushBlockquote();
    paragraph.push(line.trim());
  }

  if (inCode) {
    html.push(`<pre><code${codeLang ? ` class="language-${escapeHtml(codeLang)}"` : ''}>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
  }

  flushBlocks();
  return html.join('\n');
}

function renderTemplate(template, values) {
  return template.replace(/{{\s*([A-Za-z0-9_]+)\s*}}/g, (_, key) => values[key] ?? '');
}

function formatDate(date) {
  if (!date) return '';
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(`${date}T00:00:00`));
}

function readPosts() {
  if (!fs.existsSync(POSTS_DIR)) return [];

  return fs.readdirSync(POSTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const slug = entry.name;
      const file = path.join(POSTS_DIR, slug, 'index.md');
      if (!fs.existsSync(file)) return null;

      const source = fs.readFileSync(file, 'utf8');
      const { data, body } = parseFrontmatter(source);
      const fallbackTitle = slug.replace(/^\d{4}-\d{2}-\d{2}-/, '').replaceAll('-', ' ');

      return {
        slug,
        dir: path.join(POSTS_DIR, slug),
        title: data.title || fallbackTitle,
        date: data.date || slug.slice(0, 10),
        description: data.description || '',
        body,
        html: markdownToHtml(body),
      };
    })
    .filter(Boolean)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function renderPage({ title, description, content, basePath = './' }) {
  const template = fs.readFileSync(path.join(SRC_DIR, 'template.html'), 'utf8');
  return renderTemplate(template, {
    title: escapeHtml(title),
    description: escapeHtml(description || SITE.description),
    siteTitle: escapeHtml(SITE.title),
    siteSubtitle: escapeHtml(SITE.subtitle),
    content,
    basePath,
  });
}

function build() {
  emptyDir(DIST_DIR);
  copyFile(path.join(SRC_DIR, 'styles.css'), path.join(DIST_DIR, 'styles.css'));

  const posts = readPosts();

  for (const post of posts) {
    const outputDir = path.join(DIST_DIR, post.slug);
    ensureDir(outputDir);
    copyDirContents(post.dir, outputDir, { exclude: new Set(['index.md']) });

    const content = `
<article class="post">
  <header class="post-header">
    <h1>${escapeHtml(post.title)}</h1>
    <time class="post-meta" datetime="${escapeHtml(post.date)}">${formatDate(post.date)}</time>
    ${post.description ? `<p class="post-description">${escapeHtml(post.description)}</p>` : ''}
  </header>
  <div class="post-content">
${post.html}
  </div>
  <a class="back-link" href="../index.html">← 返回首页</a>
</article>`.trim();

    const page = renderPage({
      title: `${post.title} · ${SITE.title}`,
      description: post.description,
      content,
      basePath: '../',
    });

    fs.writeFileSync(path.join(outputDir, 'index.html'), page);
  }

  const list = posts.length
    ? `<ul class="post-list">
${posts.map((post) => `  <li class="post-card">
    <time class="post-meta" datetime="${escapeHtml(post.date)}">${formatDate(post.date)}</time>
    <h2><a href="${post.slug}/index.html">${escapeHtml(post.title)}</a></h2>
    ${post.description ? `<p class="post-description">${escapeHtml(post.description)}</p>` : ''}
  </li>`).join('\n')}
</ul>`
    : '<p>还没有文章。</p>';

  const indexContent = `
<section class="home">
  <h1>文章</h1>
  ${list}
</section>`.trim();

  const indexPage = renderPage({
    title: SITE.title,
    description: SITE.description,
    content: indexContent,
    basePath: './',
  });

  fs.writeFileSync(path.join(DIST_DIR, 'index.html'), indexPage);
  console.log(`Built ${posts.length} post(s) into ${path.relative(ROOT, DIST_DIR)}/`);
}

build();
