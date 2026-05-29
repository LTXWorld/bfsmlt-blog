---
title: 你好，静态博客
date: 2026-05-29
description: 第一篇示例文章：用纯 Node.js、Markdown 和 CSS 搭建一个极简博客。
---

这是这个博客的第一篇文章。

它不是一个复杂系统：没有数据库，没有前端框架，没有客户端路由，也没有追踪脚本。文章只是一些 Markdown 文件，构建脚本把它们变成静态 HTML。

## 为什么静态博客？

静态博客的好处很直接：

- 部署简单，可以放在任何静态托管服务上
- 页面速度快，几乎不需要运行时成本
- 内容长期可保存，Markdown 文件也容易迁移
- 设计可以保持克制，把注意力留给文字

## 代码片段

```js
console.log('hello, tiny blog');
```

## 下一步

你可以在 `posts/YYYY-MM-DD-slug/index.md` 里继续添加文章，然后运行：

```sh
node build.js
```

生成的站点会输出到 `dist/` 目录。
