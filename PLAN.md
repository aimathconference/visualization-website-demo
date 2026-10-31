# EigenReel: plan for taking the Spark demo live

<!-- Note to Claude and anyone else editing this file: most people working on this project are not developers. Define every acronym the first time it appears, and if an edit moves the first use, move the definition with it. -->

This plan turns the demo running on the team's NVIDIA DGX Spark (the `demo` branch) into a public website that anyone can use. What the site should do comes from `Wishlist.md`. Facts about the demo were checked against its code and GitHub settings on October 31, 2026. The previous version of this file, a plan to rebuild the site from scratch on Cloudflare, is in git history at commit `efe658f`.

**In short:** keep the app we have, keep it on the Spark, and connect it to the internet through a Cloudflare Tunnel. Three things stand between the demo and a live site:

1. **Sign-in.** Today only people on our Tailscale network can sign in. Strangers need email and GitHub sign-in.
2. **Real content.** Most authors, reviewers and blog posts on the site are samples we wrote to show the format. They have to become real.
3. **Readiness for strangers.** The server, the rules and the operations assume a trusted group of about 30 people.

The building work is roughly 4–6 weeks for one developer. Review, content and legal work run alongside it and depend on other people's time. Hosting starts at about $2–35 a month (section 6).

**There is a much smaller way to start.** The minimal plan just below gets a public alpha running in about a week of work. Sections 1–8 are the full plan, which it can grow into later.

> **The one mistake to avoid: never connect the public internet to the demo as it runs today.** The demo decides who you are by reading a `Tailscale-User-Login` header on each request, and it believes that header because `tailscale serve` removes forged copies. A public route wouldn't do that, so anyone could send the header with an admin's email address and become an admin. One admin's address is in this public repository. We tested this on a local copy on October 31, 2026: a forged header got into the admin pages. Both plans keep the two setups apart so it can't happen.

---

## The minimal plan: a public alpha

The bare minimum to get EigenReel running and usable by the public:

- **Anyone** can browse, watch, customize and like, with no account.
- **Up to 100 people we invite and trust** have real accounts.
- **Nobody submits through the site.** We talk contributors through opening pull requests one at a time, review them, and trust them not to send malicious code.
- **A "use at your own risk" policy** covers the legal side.

### How it works

```
 The public ──► eigenreel.com on Cloudflare Pages
                static files only: no server, no accounts, no database

 Up to 100 invited people ──► the Spark, over Tailscale, as it runs today
                accounts, shared likes, profiles, admin tools

 Contributors ──► pull requests on GitHub, reviewed by us
                a merged piece reaches the Spark by itself, and the public site at the next release
```

**The main decision: the public site doesn't touch the Spark at all.** The front end already runs as plain files, with no server behind it. Hosting it that way means no tunnel, no public server to protect, and no chance of the forged-header problem above. Our attack tests already cover this way of running, and an outage on the Spark wouldn't affect the public.

**Accounts stay on Tailscale.** Sign-in is by far the largest job in the full plan, and this avoids building it. An invited person installs Tailscale, a VPN (virtual private network) app, accepts a share of the Spark, and uses its address. This already works for the 22 people we've shared it with, and sharing it one person at a time keeps the group invite-only.

- **To check first:** we found no published limit on how many people a machine can be shared with, so confirm it before going far past 22.
- **If installing an app is too much to ask,** the alternative is invite links on a public server, about 2–3 more days of building. But that puts sign-in on the public internet, which this design avoids.

**Likes are kept in the visitor's browser, in local storage rather than a cookie.** This already works. In our test on October 31, 2026, a signed-out visitor's like survived a reload, with no cookie set and nothing sent to any server. A cookie would add nothing here, because cookies exist to send information to a server, and this design has none to send to. The limits:

- A like stays on that one browser, and is lost if the visitor clears their site data.
- Public likes aren't added up, so **the public site shows no like counts**. Accounts on the Spark still see real counts among themselves.

**Trust is the review policy, and the sandbox stays as a backstop.** It's already built and costs nothing extra, so a bad piece from someone we trusted still can't reach the network or read anything from the page.

- The registry is public, so anyone can open a pull request whether or not we invite them. The rule has to be: **only merge from people we've spoken to.**
- Keep the automatic check and the two approvals. Copy the up-to-date checker into the registry (section 4.5), which takes minutes.

### What has to change

| Work | What | Who | Rough time |
|---|---|---|---|
| **Public mode** | A setting in `config.js` that hides Submit, New, the remix editor, the newsletter form, Distinctions, Wanted and like counts on the public site | Developer | 1–2 days |
| **Pages setup** | Connect the domain, publish only the site's own files, and add a `_headers` file with the security policies (the plain-files setup has none otherwise). Generate share pages with the real domain | Developer | Half a day |
| **Stopping a piece** | Write a short procedure. A stopped piece needs two steps: the Admin tab on the Spark, and `blocked.json` for the public site, which is a commit and a deploy. Don't let browsers cache that file | Developer | An hour |
| **Publishing a piece** | Write a short procedure. After a merge, run `gen-catalog.mjs`, `gen-share-pages.mjs` and `sync-registry-checker.sh`, then deploy. The public site doesn't pick up merged pieces by itself | Developer | An hour |
| **True content** | Credit the 14 pieces' real authors, with licenses they can give. Two of us actually review each piece, or the "Community reviewed" badge and invented reviewers come off. Remove invented like counts, sample profiles and sample blog posts (section 4.4) | Editors | A few days |
| **Legal page** | The policy below, linked from every page, with a contact address someone reads | Project lead, counsel | A day or two |
| **Phones** | Try it on a real iPhone and Android phone. **Do this first:** a failure here could change the design | Anyone with a phone | An hour, plus any fixes |
| **Contributor guide** | Point people to `docs/submitting.md`, and agree who walks each person through it | Moderators | An hour |

**Total:** about a week of work, spread across a few people. The estimates are my rough judgment.

**Cost:** one domain, about $1 a month. Cloudflare Pages is reported free. Nothing else is needed.

**Optional, about 30 minutes:** put the sandbox page on its own free address, such as `eigenreel-sandbox.pages.dev`, so frames get the separate-site protection in section 7. Worth doing if it goes smoothly, but we haven't tried it on Pages, and it needn't hold up launch.

### The "use at your own risk" policy

This draft needs a real name and contact address, and someone qualified should read it. **A disclaimer limits some claims, but it doesn't remove every duty.** Privacy law still applies to the invited accounts, and copyright complaints still have to be answered. It also doesn't excuse knowingly harming someone. It's a good fit here mainly because the public site collects so little.

> **EigenReel is an early alpha, provided as is, and you use it at your own risk.**
>
> - **Run by:** [name]. **Contact:** [address].
> - **No warranty.** We make no promises that the site works, stays available, or that its mathematics is correct. To the extent the law allows, we aren't liable for any loss from using it.
> - **Other people's code.** Each visualization is code written by a contributor that runs in your browser. We review contributions and run them in a sandbox, but we can't guarantee they're safe.
> - **Flashing images.** Some visualizations move quickly or may flash. If you're sensitive to this, please take care.
> - **Your data.** We have no public accounts. Your likes stay in your browser, and clearing your site data deletes them. Our hosting provider and the services that deliver our fonts and scripts receive normal request details, such as your internet address. Invited alpha members' account details are kept on our own server, and we'll delete them on request.
> - **Ownership.** Each visualization belongs to its author under the license shown with it. If you think something infringes your rights, or shouldn't be here, write to us and we'll look into it.
> - **Age.** This site isn't aimed at children under 13.

### What we're knowingly giving up

- **A malicious piece from someone we trust** would be limited only by the sandbox. Without the optional address above, there's also no separate-site protection against a browser bug.
- **Two places to manage.** The public site and the Spark are separate, so stopping or publishing a piece takes a deliberate step on each.
- **No shared likes** for the public, so the feed can't rank by popularity among visitors.
- **Tailscale for accounts** is real friction, especially on phones.
- **The Spark can still go down** for invited people, with only the backups it has today.

### Before going public

- [ ] The Spark is still reachable only over Tailscale.
- [ ] `node scripts/check-sandbox.mjs` passes.
- [ ] The published site sends its security headers, including on `runner.html`.
- [ ] The site works on a real iPhone and Android phone.
- [ ] No invented author, reviewer, count, award or post appears anywhere.
- [ ] Submit, New and the newsletter form don't appear on the public site.
- [ ] Listing a piece in `blocked.json` and deploying stops it on a second device within about a minute.
- [ ] The policy is linked from every page, and someone reads the contact address.
- [ ] Trial members know the trial is continuing as the alpha. Our invitation promised deletion when the trial ends, so that promise still stands.

### Moving on to the full plan

Nothing here is wasted. The Pages copy becomes the fallback in section 4.7, the review process is the same one, and public mode can be switched off piece by piece. Move on when any of these becomes true: strangers want to submit, people want likes across devices, or 100 accounts is too few.

---

## 1. Where the demo stands

| Area | Today | Needed for a live site |
|---|---|---|
| Feed, Browse, explanations, Customize | Working | Confirm on real phones |
| Sandbox for submitted code | Built and tested on desktop browsers | Test on iPhone and Android; give it its own domain |
| Sign-in | Tailscale only | Email links and GitHub sign-in (section 4.1) |
| Likes and the list of your likes | Working, on the Yours page | Carries over once sign-in changes |
| Submission and review | `EigenReel/registry` is running, but all 8 pull requests came from one person | Real outside submissions, more reviewers, no admin bypass (section 4.5) |
| Moderator **Flag** button | Not in the current front end; only the older one in `demo/public` had it | Build it (section 4.3) |
| **Report** button | `docs/review-pipeline.md` says every slide has one, but it isn't built | Build a simple version and correct the doc |
| Newsletter | **The form says "You're subscribed" but sends nothing anywhere.** The Yours page has no newsletter settings | Connect it to a provider, and hide it until then (section 4.3) |
| Content | Sample authors, reviewers, profiles, awards and posts | Replace with real ones (section 4.4) |
| Backups | A script exists, but it's optional and writes to the same disk | Automatic nightly backups off the machine |
| Monitoring | None | Know when the site is down |
| Legal pages | None | Privacy policy, terms, copyright contact (section 4.6) |

---

## 2. Decisions to make first

These hold up everything else. The recommendation is what this plan assumes.

| # | Decision | Recommendation | Why it matters |
|---|---|---|---|
| 1 | **Where does it run?** | The Spark, with a clear way to move off it (section 3) | It costs almost nothing and needs no rewrite |
| 2 | **May the Spark serve the public?** | Ask whoever owns the machine and the network it's on | If the answer is no, use a rented server for about €5 a month. Nothing else in this plan changes |
| 3 | **Who is legally running the site?** | Name a person or organization | The privacy policy, terms and copyright contact all need a name, and emails need a postal address |
| 4 | **Which domain?** | `eigenreel.com`, **if it's ours.** It was registered at GoDaddy on October 31, 2026 and shows a parked page. I couldn't tell who registered it | If it isn't ours, `eigenreel.org` was unregistered that day. `NAMES.md` calls the name check "a screen, not a clearance", so do a trademark search before spending on the name |
| 5 | **Second domain for the sandbox** | Buy `eigenreelusercontent.net`, unregistered as of October 31 | It must not sit under the main domain (section 7) |
| 6 | **Is the Playground open at launch?** | No. Keep the editor, the checks and "Prepare pull request", but turn off storing posts on the server | The wishlist doesn't ask for it, and it lets strangers store code on our disk |
| 7 | **What happens to trial data?** | Start the live site with an empty database | Our invitation to trial members says everything they post will be deleted when the trial ends (`demo/SPARK_SETUP.md`, step 9). Keeping it would break that promise |
| 8 | **Which newsletter provider?** | Buttondown, or similar with an API (application programming interface, how one program talks to another) and notifications when people unsubscribe | The wishlist's three lists need both |
| 9 | **Minimum age** | 13 | Accounts for younger children bring extra legal duties (section 4.6) |

---

## 3. How the live site will run

```
 Visitors' browsers
        │  https://eigenreel.com
        ▼
 Cloudflare: domain settings, caching, protection from floods of traffic
        │  Cloudflare Tunnel: the Spark connects outward, so no port is open
        ▼
 The Spark
   ├─ port 3301  LIVE: its own code copy, data folder and service account
   │             sign-in by email or GitHub; ignores Tailscale headers
   └─ port 3300  TRIAL / STAGING: Tailscale only, never connected to the tunnel

 Elsewhere
   ├─ Cloudflare Pages: eigenreelusercontent.net/runner.html, the sandbox
   ├─ Cloudflare R2 (file storage): nightly backups
   ├─ GitHub: submissions and review
   └─ Email services: sign-in links and the newsletter
```

**Two copies run side by side on the Spark.** The trial stays where it is and becomes the place to test each change. The live copy gets its own folder (`/opt/loci/live`), its own data (`/opt/loci/live-data`) and its own service account. A new port is right here, because it separates two copies of the app. It still wouldn't work for the sandbox (section 7).

**Why the Spark is reasonable to start with.** The server never runs anyone's visualization code; browsers do, inside the sandbox. It stores small amounts of data, and Cloudflare can absorb much of the traffic for files that don't change. A tunnel means no open ports on the machine.

**What's weak about it, and how we cover that:**

| Risk | Cover |
|---|---|
| One machine: a power cut, network outage or hardware fault takes the site down | Nightly off-machine backups, a monitor that alerts us, and a static copy of the site as a fallback. The front end already runs without a server: the feed works, but accounts don't |
| The Spark does other work (ports 3000 and 8000 are in use) | A separate service account and restricted file access for the live copy. Agree with the owner what happens if the machine is needed or rebooted |
| A break-in could reach other things on the machine | The systemd service settings already limit what the app can write to. Keep the operating system updated, and move off the Spark if it starts holding anything sensitive |

**Options ruled out:**

| Option | Why not |
|---|---|
| Tailscale Funnel | It can't use our own domain, only a `ts.net` name, and its bandwidth limits can't be changed |
| Opening a port on the Spark's network | It exposes the machine directly, and a tunnel does the job without that |
| Rebuilding on Cloudflare Workers and D1 (its database), as this plan used to propose | The server's database code assumes instant answers and D1's doesn't, so every database call would change. It's worth doing only for scale we don't have yet (section 8) |
| A rented server from day one | A good option, and the fallback for decision 2, but it adds a bill and setup work before we know we need it |

---

## 4. What has to be built or changed

### 4.1 Sign-in and accounts

This is the largest piece of building work.

- **Email links for readers.** Enter an address and get a one-time link, valid for 15 minutes. No password. Store the link's token only in scrambled (hashed) form.
- **GitHub for contributors and moderators.** Sign in with GitHub, or link it from account settings, using OAuth (Open Authorization, the standard behind "Sign in with GitHub"). The wishlist requires this so submissions connect to accounts.
- **Real sessions.** The current Sign out only sets a cookie that ignores Tailscale. Live needs a session stored on the server, in a cookie that scripts can't read, sent only over encrypted connections.
- **Tailscale off.** The live copy must ignore the header entirely, and refuse to start in `dev` mode. Add a test for both.
- **Reuse the identity column.** `users.ts_login` becomes a general key such as `email:…` or `github:…`. The registry importer already makes `github:<login>` placeholder accounts, so linking GitHub can hand over a contributor's existing pieces.
- **Verified GitHub names only.** Today the GitHub name is a box you type in, and the importer uses it to decide who gets credit for a piece. On a public site, someone could type another person's name. It must come only from a real GitHub sign-in.
- **Roles.** Admins move from `ADMIN_LOGINS` to verified addresses. Moderator and blog roles keep working as they do.
- **Delete your own account.** This doesn't exist yet, only admin removal. Add it, along with a download of your own data (section 4.6).

### 4.2 Readiness for strangers

- **Know who is sending requests.** Through a tunnel, every request appears to come from the Spark itself. Limits have to use the visitor's IP (Internet Protocol) address from Cloudflare's `CF-Connecting-IP` header, and only that.
- **Fix the shared newsletter limit.** All signed-out visitors share one limit of 10 signups per 10 minutes, so a popular day would lock people out.
- **Fix the rate limiter's memory.** It never forgets a key. That's harmless for 30 people, but with one key per visitor it would slowly fill memory.
- **Limit what each account can store.** One account may store 500 values of 256 kilobytes (KB) each, about 125 megabytes (MB). Many throwaway accounts could fill the disk, so cap the total per account and watch free disk space.
- **Limit sign-in emails,** per address and per IP address. Add a bot check such as Cloudflare Turnstile, so nobody can use us to flood someone's inbox or use up our email allowance.
- **Tighten the page's security policy.** Remove `'unsafe-inline'`; `index.html` has only one inline script, so this looks small. Host fonts and scripts ourselves rather than loading them from Google Fonts and cdnjs, so visitors' addresses aren't sent to those services. The font packages are already in `demo/package.json`.
- **Let Cloudflare cache files that don't change.** By default the server marks its files `no-cache` today, so every visitor's request would reach the Spark. The server needs to allow caching, and each release has to clear the old copies.
- **Remove demo-only features:**
  - Admin "promote", the review bypass the wishlist says goes away (`routes/admin.js`).
  - The old front end (`demo/public`, `FRONTEND=legacy`) and its runner pages (`/run/*`).
  - The temporary page colors, which let any moderator recolor the site for everyone.
  - Wording like "demo server" and "prototype" in the interface.
- **Make takedowns work for every piece.** The admin "hide" setting is ignored for catalog pieces. Use the kill switch to stop a piece at once, then a registry pull request to remove it for good. Update the admin page to say so.
- **Keep secrets out of the repository.** The email key, GitHub sign-in secret and session secret go in a file only root and the service can read. Also remove the admin's email address and the Spark's Tailscale address from `demo/SPARK_SETUP.md`.
- **Keep software updated.** Turn on automatic security updates on the Spark and automated dependency alerts on GitHub.

### 4.3 Missing features

- **Flag (moderators).** A button with three choices, each opening a prefilled GitHub issue: removal, request changes, flag account. The forms already exist in `demo/github/`. Admins see them with a GitHub search on the `flag:` labels.
- **Report (everyone).** Start simple: a link on each piece to a form or address that reaches moderators. A public site must have a way to report a problem. `docs/review-pipeline.md` also describes a 72-hour rule and "three upheld reports" that don't exist; remove those until they do.
- **Newsletter.** Hide the form now, because it tells people something untrue. Then connect it to the provider, add the three checkboxes to account settings, and have people confirm by email before they're added. Unsubscribes made from emails must flow back.
- **Link previews.** Share pages exist only for the 14 catalog pieces, and without the `--origin` setting their links are relative, which most previews can't use. Generate them for every published piece, with the real domain. Replace `og/default.png`, which shows the old name.
- **Thumbnails.** No piece has a saved still image. Browsers that can't run the sandbox see a card in the piece's colors, and previews all show the same picture. Produce one per piece at publish time.

### 4.4 Real content

No code here: this is editorial work, and most of the team can help. **Anything presented as fact on a public site has to be true.**

| What | Today | To do |
|---|---|---|
| Authors of the 14 pieces | Invented handles such as `@circle-mod-n`, in `catalog.js` | Credit whoever really made each one, and confirm its license is theirs to give |
| Author profiles (`users.js`) | Invented bios with `.example` homepages | Delete, and use real accounts |
| Reviewers and "Community reviewed" | Invented. `catalog.js` itself says "no review has run" | Put every piece through real two-person review, using the checklist in `docs/review-pipeline.md` section 4 |
| Like counts | The server shows real counts, but `catalog-extras.json` holds invented ones (up to 15,800) that static copies would show | Remove them |
| Distinctions (`distinctions.js`) | Marked as samples; no jury has met | Hold back until a real jury has met |
| Wanted challenges (`bounties.js`) | Marked as samples; no real votes | Hold back, or relaunch with real requests |
| Blog posts (`posts.js`) | Include sample awards and an invented guest curator | Write real launch posts |
| About and help text | Written for a prototype | Read through every page |

Also check the mathematics of each piece, and read each explanation as a stranger would. This site's whole promise is that the math is right.

### 4.5 The review process

Checked on `EigenReel/registry` on October 31, 2026:

- **The checker there is out of date.** Its `checks.js` and `check-entries.mjs` don't match the `demo` branch, so pull requests don't get the new safety rules. Run `scripts/sync-registry-checker.sh`, then copy `demo/github/registry/.loci/` over. Make this automatic before launch.
- **Admins can still skip review.** The "Two approvals" rule lets organization admins bypass it and is named "demo only". Remove the bypass; the wishlist revokes it for the real version.
- **Too few reviewers.** `reviewers.yml` lists three people (`tbrazel`, `nbrody`, `FayeAlephNil`), so if one of them submits, the other two must always review. Aim for at least six, and confirm everyone has write access. I couldn't see `FayeAlephNil` among the organization's members, and without write access their approval won't count.
- **Never tried by an outsider.** All 8 pull requests came from one member. Run the end-to-end checklist in `demo/github/README.md` with someone outside the organization.
- **Real moderation repository.** Replace `moderation-practice` with a real private repository for account flags.
- **Browser checks stay advisory.** They give false results without a real GPU (graphics processing unit, the graphics chip), so they can't block a merge yet (section 7).

### 4.6 Legal and policy

Have a lawyer or your institution's counsel review this list. It's a starting point, not legal advice.

- **Privacy policy.** Say what we store: email addresses, GitHub names, likes, saved pieces, and time spent watching each piece (used for "For you"). Reconsider whether we need that last one.
- **Terms of use,** including what a contributor grants by submitting, and the licenses we accept.
- **Copyright complaints.** In the US, the DMCA (Digital Millennium Copyright Act) protects sites that register a contact with the Copyright Office and act on complaints. The fee is reported as $6, with renewal every three years.
- **European visitors.** The GDPR (General Data Protection Regulation, the European Union's data law) gives people rights to see and delete their data, which section 4.1 covers. Ask counsel what else applies.
- **Children.** COPPA (Children's Online Privacy Protection Act, a US law) applies to children under 13. Set a minimum age, and take extra advice if the site will be aimed at schools.
- **Email.** CAN-SPAM (the US commercial email law) requires a working unsubscribe link and a postal address in newsletters.
- **Flashing images.** The automatic flashing check can't measure properly on the test machines. Until it can, reviewers have to check by eye, and the site should carry a photosensitivity notice.

### 4.7 Running it

- **Releases.** Test on the trial copy, tag a version, then deploy that tag to the live copy. Today's `git pull` would take whatever is newest on the branch.
- **Going back.** Keep the previous tag and a fresh backup, so a bad release can be undone in minutes. Practice this once.
- **Backups.** Every night, encrypted, to Cloudflare R2. **Restore one onto a test copy before launch**; a backup nobody has restored isn't proven to work.
- **Alerts.** An outside monitor checks the site every few minutes and messages a real person. Also alert on low disk space.
- **Fallback.** Keep a static copy of the site on Cloudflare Pages, with a written procedure for switching to it, and try the procedure once.
- **People.** Name at least two admins who can use the kill switch, and at least two people who can reach the Spark. Write down who handles an outage, a harmful piece and a legal complaint.

---

## 5. The order of work

| Phase | What | Who | Rough time |
|---|---|---|---|
| **0. Decide** | Section 2. Buy the domains | Project leads | A few days |
| **1. Prove it on phones** | Open the sandbox on real iPhones and Android phones. **Do this first:** a failure here could change the design | Anyone with a phone | 1–2 days, plus any fixes |
| **2. Build** | Sign-in (4.1), readiness (4.2), missing features (4.3) | Developer | 3–5 weeks |
| **3. Make it true** | Real content (4.4), real review (4.5), legal (4.6) | Editors, moderators, counsel | Runs alongside phase 2; depends on people's time |
| **4. Set up** | Live copy, tunnel, sandbox domain, backups, alerts, fallback (section 3, 4.7) | Developer | 2–4 days |
| **5. Rehearse** | Put the real site behind a Cloudflare login wall (Cloudflare Access) and invite the trial team to use it for 1–2 weeks, with outsiders submitting real pieces | Everyone | 1–2 weeks |
| **6. Launch** | Remove the wall, once everything below is done. Announce it in stages, not everywhere at once | Project leads | 1 day, then watch closely for a week |

The time estimates are my rough judgment for one developer working full time, not measurements.

### Launch checklist

**Safety**

- [ ] On the public address, a request carrying a forged `Tailscale-User-Login` header is treated as signed out.
- [ ] Port 3300 can't be reached from the public internet.
- [ ] `node scripts/check-sandbox.mjs` passes against the live setup, with the sandbox on its own domain.
- [ ] The sandbox draws pieces and responds to touch on a real iPhone and Android phone.
- [ ] The registry's checker matches the site's, and an outsider's bad submission is refused.
- [ ] No admin can bypass review.
- [ ] The kill switch stops a piece on a second device within a minute.

**Truth**

- [ ] Every author, reviewer, count, award and post shown is real.
- [ ] Every piece has passed real two-person review.
- [ ] No page says "demo", "prototype" or "sample" unless it's meant to.
- [ ] The newsletter form only says "subscribed" when someone is.

**People**

- [ ] A stranger can sign up by email, like a piece, find their likes, and delete their account.
- [ ] A contributor can link GitHub and see their submission credited to them.
- [ ] A visitor can report a problem, and a moderator can flag a piece.
- [ ] Privacy policy, terms and copyright contact are published and reviewed.
- [ ] Trial data has been handled as we promised, and trial members have been told.

**Operations**

- [ ] A backup has been restored successfully.
- [ ] Unplugging the app sets off an alert to a real person.
- [ ] A release has been rolled back once in practice.
- [ ] The fallback has been switched on once in practice.
- [ ] The Spark's owner has agreed to all this, in writing.

---

## 6. Costs

These are per month at launch. Prices were checked October 31, 2026, mostly from third-party sources, so confirm them on each vendor's page before budgeting.

| Item | Cost | Notes |
|---|---|---|
| Two domains | About $2 | $10–15 a year each; an estimate carried over from the previous plan |
| Cloudflare Tunnel, domain settings, Pages | $0 | Reported free. Setup may ask for a card |
| Backups on Cloudflare R2 | $0 | The first 10 gigabytes (GB) are free |
| Sign-in emails (Resend) | $0–20 | Free for 3,000 a month, **but only 100 a day**. A launch day could pass that, so budget for the $20 plan for launch month |
| Newsletter (Buttondown) | $0–9+ | Reported free up to 100 subscribers; the price grows with the list |
| The Spark | $0 extra | Electricity and the machine's own cost aren't counted |
| **Total** | **About $2–35** | |
| If we rent a server instead | Add about €5 | Hetzner's small server, reported at €4.50–6. Prices rose in 2026 |
| One-off: copyright contact | About $6 | Renewed every three years. Fee from older sources; confirm at copyright.gov |
| One-off: legal review | Unknown | Possibly free through an institution |

**Reviewer time will cost far more than hosting.** The next section shows why.

---

## 7. How the sandbox works, and what is proven

Submitted visualizations are other people's code running in our visitors' browsers. Inspecting that code can't make it safe, because code can be disguised and can change its behavior after review. So safety has to come from limits the browser enforces, so that even a malicious piece can do little. The `demo` branch built this and tested it on October 30–31, 2026. Details are in `docs/module-api.md` section 4, `docs/server.md` and `docs/review-pipeline.md` on that branch.

| Threat | What stops it |
|---|---|
| A piece reads a viewer's data or acts as them | A sandboxed frame with no cookies and no access to the page |
| A piece loads code or sends data anywhere | The frame's policy: no network, no `eval` |
| An explanation runs a script on the page | A sanitizer on all rendered text. The checker also refuses raw HTML (HyperText Markup Language, the code of web pages), images and unusual links |
| A piece's details become code on the page | The page escapes every field, so it's shown as plain text |
| A piece freezes the page | Its own thread, and a watchdog that stops it after 500 milliseconds without a frame |
| A piece uses the processor between frames | It has no timers, so it runs only when called. It can still use spare time within a frame |
| A piece crashes the tab or the graphics chip | Can't be prevented. The piece is skipped on reload, and the kill switch stops it for everyone within about a minute |
| Harmful pictures, or a piece that turns bad later | Report, Flag and the kill switch |
| A bug in the browser itself | Can't be prevented here. The separate domain, reviewers and a small API reduce the odds |

**Lessons to keep:**

- **The sandbox works without a separate domain.** The domain is a further layer, meant to keep frames in a separate browser process.
- **Browsers decide "separate" by registered domain.** A different port doesn't count. Neither does a second machine under our `ts.net` address, because `ts.net` is on the public suffix list (from the list's rules, not tested in a browser). That's why the trial needs no sandbox domain and a public launch does.
- **The sandbox page must name the main site** in its `frame-ancestors` header. With `'self'`, Chrome refused to load it from another address and no piece could start. The host must be able to send headers; Cloudflare Pages can, through a `_headers` file.
- **The frame must own its canvas.** Chrome silently drops a canvas passed into a sandboxed frame.
- **Automatic checks are for quality, not security.** Before these fixes, one package hiding both remote code and a script passed the real registry checker. Only the two reviewers stood in its way.
- **When rules tighten, re-run them on the whole registry.** Only the 14 catalog pieces have been checked against the new rules. Anything else using timers, or raw HTML or images in an explanation, will break or fail.

**Tested:**

- 69 of 69 attack tests pass in Chrome. The suite exempts `hopf-fibers`, which misses the watchdog on a software graphics chip, on the old code too.
- 28 frames from the 14 pieces match the old code exactly.
- Firefox and desktop Safari's engine block the attacks and draw all 14 pieces, in manual runs rather than the full suite.
- After a forced tab crash, the piece is skipped on reload.

**Not yet proven:**

- **iPhones and real phones in general.** Nothing has run on them (phase 1).
- **Real graphics chips.** All browser tests used headless browsers on software graphics. This also causes false results: `rose-curves` fails "Not blank" at one size (1.84% of pixels, 2% required), and "No flashing" can't be measured.
- **Whether a separate domain contains a memory crash.** In plain Chrome with a 200 MB memory limit, the watchdog stopped a memory-hungry piece first. Under our test tool, that piece crashed the whole tab even with the sandbox on another site, possibly because of the tool's settings. Don't count on the domain for this until it's tested.

---

## 8. After launch

**Move off the Spark if any of these happen:**

- Outages become noticeable to visitors.
- The owner needs the machine, or would rather not host a public site.
- The site regularly uses a large share of the machine.
- We start storing anything more sensitive than today's data.

The first move is to a small rented server. The code is the same, and with backups and the tunnel already in place it should take about a day. Because visitors reach us through Cloudflare, the address doesn't change.

**Rebuild on Cloudflare Workers and D1 only for real scale.** Its appeal is low cost at high traffic, with no bandwidth charges. See the previous plan in git history for its design and cost estimates, which ran about $12–35 a month for 2,000 registered users and 100,000 monthly visitors. Those traffic figures were assumptions.

**Reviewer time is the real limit on growth.** Two reviews per piece at about 20 minutes each means 40 minutes of volunteer time per submission, so 1,000 submissions take about 670 hours. As that grows, the options are:

- A larger reviewer pool, with submissions matched to reviewers by tag, as the wishlist anticipates.
- Remixes stored as small settings files that point at an already reviewed piece, needing no new code review.
- A separate, clearly labelled tier of pieces that passed the automatic checks only. This bends the wishlist's rule that everything is reviewed, so it's a product decision.

**Features to add when they're wanted:** ranking the feed, search, embedding in course sites, and turning on the Playground for signed-in users.

---

## Sources

Checked October 31, 2026. Third-party sources may be out of date.

- [Tailscale Funnel](https://tailscale.com/docs/features/tailscale-funnel.md) and [Tailscale Serve](https://tailscale.com/docs/features/tailscale-serve.md): Funnel's domain and bandwidth limits, no identity headers on Funnel, and Serve's identity headers.
- [Complete guide to Cloudflare Tunnel (third-party)](https://flaviocopes.com/cloudflare-tunnel.md) and [Cloudflare Tunnels guide (third-party)](https://selfhosted-sh.pages.dev/cloudflare-tunnels-zero-trust-access): reported as free, outbound-only, and needing the domain on Cloudflare. I didn't reach Cloudflare's own pricing page.
- [Cloudflare Pages headers](https://developers.cloudflare.com/pages/configuration/headers/): the `_headers` file.
- [Cloudflare R2 free tier (third-party)](https://nubbo.app/blog/cloudflare-r2-free-tier/).
- [Resend pricing (third-party)](https://costbench.com/software/email-api/resend/) and [Resend free plan (third-party)](https://costbench.com/software/email-api/resend/free-plan/).
- [Buttondown features](https://buttondown.com/features) and [webhooks](https://buttondown.com/blog/webhooks-and-the-programming-page); [Buttondown pricing (third-party)](https://www.creatorstackclub.com/software/buttondown).
- [Hetzner's small server (third-party)](https://www.vpsbenchmarks.com/hosters/hetzner/plans/cax11) and [Hetzner's 2026 price rise (third-party)](https://privatedevops.com/news/hetzner-june-2026-cloud-price-increase-what-to-do).
- [Copyright Office: designating a DMCA agent](https://copyright.gov/newsnet/2016/640.html): the fee and renewal, from 2016.
- Domain availability: public registration records, through RDAP (Registration Data Access Protocol), on October 31, 2026. An unregistered result can change at any time.
