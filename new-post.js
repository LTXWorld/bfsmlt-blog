#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT = __dirname;
const POSTS_DIR = path.join(ROOT, 'posts');

function today() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function slugify(title) {
  return title
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '') || 'untitled';
}

function uniqueDir(baseDir) {
  if (!fs.existsSync(baseDir)) return baseDir;

  let index = 2;
  while (true) {
    const candidate = `${baseDir}-${index}`;
    if (!fs.existsSync(candidate)) return candidate;
    index += 1;
  }
}

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const titleFromArgs = process.argv.slice(2).join(' ').trim();
  const title = titleFromArgs || await ask('请输入博客标题：');

  if (!title) {
    console.error('没有输入标题，已取消。');
    process.exit(1);
  }

  const date = today();
  const slug = slugify(title);
  const postDir = uniqueDir(path.join(POSTS_DIR, `${date}-${slug}`));
  const postPath = path.join(postDir, 'index.md');

  fs.mkdirSync(postDir, { recursive: true });

  const content = `---
title: ${title}
date: ${date}
description:
---
`;

  fs.writeFileSync(postPath, content, 'utf8');

  console.log('\n已创建新文章：');
  console.log(path.relative(ROOT, postPath));
  console.log('\n写完后运行：');
  console.log('node build.js');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
