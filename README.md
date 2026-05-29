# BFSMLT Blog

A minimal static blog built with plain Node.js, Markdown, and CSS.

- No framework
- No client-side JavaScript
- No tracking
- Markdown posts
- GitHub Actions deployment
- Caddy serves the generated static files at `https://blog.bfsmlt.com`

## Project structure

```txt
.
├── build.js                 # Static site generator
├── new-post.js              # Create a new post scaffold
├── serve.js                 # Local preview server with auto rebuild
├── posts/                   # Markdown posts
│   └── YYYY-MM-DD-slug/
│       ├── index.md
│       └── images/          # Optional post assets
├── src/
│   ├── template.html
│   └── styles.css
└── dist/                    # Generated output, ignored by git
```

## Create a new post

Interactive mode:

```sh
npm run new
```

Or pass the title directly:

```sh
npm run new -- "My New Post"
```

This creates:

```txt
posts/YYYY-MM-DD-my-new-post/index.md
```

The generated Markdown contains only frontmatter:

```md
---
title: My New Post
date: 2026-05-29
description:
---
```

Write the post content below the frontmatter.

## Add images to a post

Put images next to the post:

```txt
posts/YYYY-MM-DD-my-new-post/
├── index.md
└── images/
    └── photo.jpg
```

Reference them with a relative Markdown path:

```md
![Photo description](images/photo.jpg)
```

During build, all files in the post folder except `index.md` are copied to the generated post directory.

## Local preview

```sh
npm run serve
```

Then open:

```txt
http://localhost:8080
```

`serve.js` watches `posts/` and `src/`, and rebuilds when files change.

## Build

```sh
npm run build
```

Generated files are written to:

```txt
dist/
```

## Deploy

Deployment is handled by GitHub Actions.

Normal publishing flow:

```sh
git add .
git commit -m "Add post"
git push
```

On every push to `main`, GitHub Actions builds the site and deploys `dist/` to:

```txt
/var/www/bfsmlt-blog
```

The server's Caddy container serves that directory at:

```txt
https://blog.bfsmlt.com
```

## Optional editor integration

If `$EDITOR` is set, `new-post.js` opens the new Markdown file automatically.

Example:

```sh
EDITOR=code npm run new
```

or:

```sh
EDITOR=nvim npm run new
```
