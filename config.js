/* ---------- site configuration for the static site ----------
   SITE_NAME: the name the site shows its visitors (the top bar's wordmark, the page title, link previews, the about
   texts). On the demo server its SITE_NAME (default EigenReel, demo/README.md) wins: api/whoami reports it as siteName
   and LociAPI.siteName() returns it. "Loci" stays only in identifiers: storage keys loci:*, @loci/kit, loci.json,
   LociHost and the other globals.
   REGISTRY: the GitHub repository that takes submissions as pull requests (demo/github/README.md), for the Submit
   page's "Submit on GitHub" section when the page is opened as static files. On the demo server REGISTRY_REPO and
   REGISTRY_BRANCH win (api/registry). null: not set up yet, and the Submit page says so and shows the layout to
   submit by hand. Example: const REGISTRY = { repo: 'EigenReel/registry', branch: 'main' }; */
/* RUNNER_URL: where runner.html, the sandbox visualizations run in, is served from. null: beside this file, sandboxed
   but on this domain. In production, serve runner.html from a second domain of its own (docs/server.md, "The sandbox")
   and name it here, e.g. 'https://lociusercontent.net/runner.html'. On the demo server RUNNER_URL wins (api/whoami). */
const RUNNER_URL = null;
const SITE_NAME = 'EigenReel';
const REGISTRY = { repo: 'EigenReel/registry', branch: 'main' };
