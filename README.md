# NASA-TLX questionnaire

A static, privacy-preserving NASA Task Load Index questionnaire that runs on GitHub Pages. It supports raw and full weighted scoring, calculates the result in the browser, and downloads one CSV record per completed session.

## Use

Open the published page, enter a participant ID, select a scoring method, complete the ratings, and choose **Download CSV record**.

Participant IDs can also be prefilled with a query parameter:

```text
https://YOUR-ACCOUNT.github.io/YOUR-REPOSITORY/?participant=P904
```

The participant ID is URL-decoded automatically. The page does not transmit, save, or aggregate any data; the downloaded CSV is the only record it creates.

Study links may also include a label, for example `?participant=P001&label=Period%201%3A%20tree-node-navigation%20(linear)`. The page displays the full label and preserves it in the CSV's `session_label` column. A label containing `Period 1` or `Period 2` also fills the `period` column and adds `_period1` or `_period2` to the downloaded filename, for example `nasa-tlx_P001_period1_2026-10-28.csv`. Without a period label, `period` stays empty and the original filename format is used.

## Publish with GitHub Pages

1. Create a GitHub repository and push this project to its default branch.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select the default branch and the **/(root)** folder, then save.
4. GitHub provides the public URL after deployment.

The questionnaire uses only `index.html`, `app.js`, and `styles.css`; no server or build step is required for GitHub Pages.
