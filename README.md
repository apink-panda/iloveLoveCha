# iloveLoveCha

恩地海浪 31 秒跟唱挑戰。歌曲片段為 01:28–01:59，提供三秒倒數、同步歌詞高亮、慢速練習、分句跳轉與音量控制。

## GitHub Pages

網站由 GitHub Pages 自動發布：

<https://apink-panda.com/iloveLoveCha/>

每次推送至 `main` 分支後，GitHub Pages 會自動發布根目錄中的靜態網站。

## 本機開發

```bash
npm install
npm run dev
```

GitHub Pages 靜態版本：

```bash
npm run build:pages
```

更新網站時，請在提交前執行 `npm run build:pages`，再將 `dist-pages` 的內容同步至專案根目錄。
