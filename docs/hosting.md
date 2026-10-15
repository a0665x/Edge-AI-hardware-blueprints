# Static hosting

The repository contains ready-to-use HTML. GitHub's file viewer displays source; GitHub Pages serves the interactive application.

In **Settings → Pages**, choose **Deploy from a branch**, select **main**, and use **/(root)**. The root entry page opens the workbench in English. `.nojekyll` keeps the HTML and assets unchanged.

Demo: https://a0665x.github.io/Edge-AI-hardware-blueprints/

- Selection: `?lang=en#selection`
- Delivery workflow: `?lang=en#delivery`
- Traditional Chinese: `?lang=zh`

After editing source files, run `python3 edge-ai-guide/build.py` and commit the generated HTML with the source. Source and asset files in a public repository are publicly readable; the application uses no server-side secrets.

[GitHub Pages publishing sources](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
