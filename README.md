# customsdingus

Satirical static site. No build step. Open `index.html`.

Carousel logos live in `img/`.

Placeholders like `[PHONE]`, `[HTS CODE]`, `[STEP]` are meant to be filled in.

## Deploy

`.github/workflows/deploy.yml` publishes the site to GitHub Pages on every push
to the default branch (also runnable by hand from the Actions tab).

GitHub Pages is only available on private repos with a paid plan, so the repo
must be public (Settings → General → Danger Zone → Change visibility) for the
deploy to succeed. Once it is, the site is served at
`https://tradecurious.github.io/customsdingus/`.
