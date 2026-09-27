# customsdingus

Satirical static site. No build step. Open `index.html`.

Carousel logos live in `img/`.

Placeholders like `[PHONE]`, `[HTS CODE]`, `[STEP]` are meant to be filled in.

## Deploy

`.github/workflows/deploy.yml` publishes the site to GitHub Pages on every push
to the default branch (also runnable by hand from the Actions tab).

One-time setup, which only a repo admin can do: Settings → Pages → Build and
deployment → Source → "GitHub Actions". The site is then served at
`https://tradecurious.github.io/customsdingus/`.
