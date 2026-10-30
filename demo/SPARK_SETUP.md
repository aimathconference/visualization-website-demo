# Hosting the demo on the Spark, and giving the trial team access

This takes about 45 minutes the first time. You need an SSH or terminal session on the Spark with `sudo`, and admin access to the Tailscale tailnet the Spark will join.

Commands marked **(Spark)** run on the Spark. The Spark runs DGX OS (Ubuntu 22.04) on an arm64 CPU.

---

## Part A: put the app on the Spark

### 1. Install the prerequisites (Spark)

```sh
sudo apt update
sudo apt install -y git build-essential python3 curl
# Node.js 22 (system-wide, so the service can find /usr/bin/node)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node --version        # should print v22.x
```

`build-essential` and `python3` are only needed if the SQLite package (`better-sqlite3`) has no prebuilt binary for arm64. Then `npm ci` compiles it, which takes a minute or two.

### 2. Get the code (Spark)

```sh
sudo mkdir -p /opt/loci && sudo chown "$USER" /opt/loci
git clone -b demo https://github.com/<you>/<this-repo>.git /opt/loci/app
cd /opt/loci/app/demo
npm ci
npm test              # 24 tests should pass on the Spark too
```

If the repository is private, `git clone` will ask for credentials. Use a GitHub personal access token as the password, or set up an SSH key on the Spark.

### 3. Create the service account and data folder (Spark)

The service runs as its own user. It can read the code but only write to `/opt/loci/data`.

```sh
sudo useradd --system --no-create-home --shell /usr/sbin/nologin loci
sudo mkdir -p /opt/loci/data
sudo chown loci:loci /opt/loci/data
```

### 4. Configure it (Spark)

```sh
sudo install -m 640 -o root -g loci deploy/loci-demo.env.example /etc/loci-demo.env
sudo nano /etc/loci-demo.env
```

For now, set `ADMIN_LOGINS` to your own Tailscale login. Step 6 shows how to look it up, and you can come back and add more. Leave the registry settings commented out until the practice repos exist (Part D).

### 5. Start it (Spark)

```sh
ss -ltnp | grep ':3000 ' || echo "port 3000 is free"   # if it's taken, set PORT in /etc/loci-demo.env
sudo cp deploy/loci-demo.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now loci-demo
systemctl status loci-demo --no-pager          # should say "active (running)"
curl -s http://127.0.0.1:3000/api/config       # should print JSON with "authMode":"tailscale"
```

The first start creates the database and loads the six seed visualizations and three blog posts. Logs: `journalctl -u loci-demo -f`.

---

## Part B: publish it on the tailnet

### 6. Put the Spark on Tailscale (Spark)

```sh
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up            # opens a login link; sign in with the tailnet's admin account
tailscale status             # lists machines and the logins they belong to
```

In the Tailscale admin console (login.tailscale.com):

1. **Machines:** find the Spark. Optionally rename it to `spark` (⋯ → Edit machine name). That gives the short address `https://spark.<tailnet>.ts.net`.
2. **DNS:** make sure **MagicDNS** is on, then **Enable HTTPS** (HTTPS certificates).
3. **Users:** this page shows each person's **login name** (often an email address). These are the values for `ADMIN_LOGINS` in step 4. After changing that file, run `sudo systemctl restart loci-demo`.

Don't add a tag to the trial members' own devices. Tailscale sends no identity for tagged devices, and the demo uses that identity as each person's account. Tagging the Spark itself is fine.

### 7. Turn on HTTPS serving (Spark)

```sh
sudo tailscale serve --bg 3000
tailscale serve status       # shows https://<machine>.<tailnet>.ts.net
```

This setting persists across reboots. Open the address on your own laptop or phone, with Tailscale connected. You should see the feed and a "Set up your profile" sheet. Pick a handle. Because your login is in `ADMIN_LOGINS`, your account menu should say "Admin".

---

## Part C: give the 30 people access

### 8. Get everyone onto the Spark's tailnet

Use **one** of these, depending on where people's Tailscale accounts live.

**A. They're in the same tailnet as the Spark** (e.g. your organization's):

- If your access policy is still the default (everyone can reach everything), there's nothing to do.
- Otherwise, in the admin console → **Access controls**, add a group and a rule that only lets them reach the Spark's web port:
  ```jsonc
  {
    "groups": { "group:loci-trial": ["alice@example.org", "bob@example.org"] },
    "hosts":  { "spark": "100.x.y.z" },          // the Spark's Tailscale IP, from `tailscale ip -4`
    "acls": [
      { "action": "accept", "src": ["group:loci-trial"], "dst": ["spark:443"] }
      // ...keep your existing rules too
    ]
  }
  ```

**B. They each have their own Tailscale account:** share the Spark with them.

1. Admin console → **Machines** → the Spark → ⋯ → **Share…**
2. Send each person the invite link, or invite them by email.
3. They accept, and the Spark appears in their own Tailscale.

Shared users can reach it and are identified the same way, but they can't see the rest of your tailnet. **Try this with one person first**, to confirm their identity comes through. They should get the profile-setup sheet, not a message about signing in.

### 9. Send the team instructions

Show them a QR code if you're in a room together. To print one (Spark): `cd /opt/loci/app/demo && npm run qr -- https://spark.<tailnet>.ts.net`

A message you can send:

> **Try the visualization feed**
> 1. Install Tailscale on your phone or laptop and sign in. (If you got a share invite, accept it first.)
> 2. Make sure Tailscale is **on**. On phones it's a VPN toggle in the app.
> 3. Open **https://spark.<tailnet>.ts.net** and pick a handle. There's no password; Tailscale knows who you are.
> 4. Scroll, like things, try the Customize panel, and write your own in the Playground (easier on a laptop).
>
> Everything you post is visible to the trial team and will be deleted when the trial ends.

### 10. Set up roles and thumbnails (in the browser, as an admin)

1. Ask the moderators and blog maintainers to open the site once and set up their profiles. Their GitHub username matters here.
2. In the account menu → **Admin**, set their roles.
3. In **Admin**, click **Generate missing thumbnails**. Thumbnails are rendered in your browser and uploaded; it takes a few seconds per visualization. Later uploads by the author or an admin are generated automatically.

---

## Part D (optional): the review dry run on GitHub

Follow `github/README.md` to create the practice repos. Then on the Spark:

```sh
sudo nano /etc/loci-demo.env      # set REGISTRY_REPO, MODERATION_REPO, optionally GITHUB_TOKEN
sudo systemctl restart loci-demo
journalctl -u loci-demo -n 20     # should mention "importing approved entries from github.com/…"
```

Approved entries appear in the main feed within a minute (or five minutes without `GITHUB_TOKEN`). **Admin → Import from the practice registry now** imports immediately.

---

## Running the trial

| Task | How |
|---|---|
| Watch the logs | `journalctl -u loci-demo -f` |
| Daily backup | `sudo crontab -u loci -e` and add: `15 3 * * * cd /opt/loci/app/demo && DATA_DIR=/opt/loci/data /usr/bin/node server/scripts/backup.js` (keeps 14 copies in `/opt/loci/data/backups`) |
| Deploy an update | `cd /opt/loci/app && git pull && cd demo && npm ci && sudo systemctl restart loci-demo` (about a 2-second blip; open pages recover on their own) |
| Publish a merged blog post | `cd /opt/loci/app && git pull`, then **Admin → Reload blog posts** (no restart needed) |
| Export everything | **Admin → Export all data**, or: `sudo -u loci env DATA_DIR=/opt/loci/data node server/scripts/export.js` |
| Start over from the seed data | `sudo systemctl stop loci-demo && sudo -u loci env DATA_DIR=/opt/loci/data node server/scripts/reset.js && sudo systemctl start loci-demo` |
| Someone sees "open this from a personal device…" | Their Tailscale is off, or the device is tagged, or (for a shared machine) the invite wasn't accepted |
| Someone's page won't load at all | Tailscale isn't connected on that device. Check with `tailscale ping <spark>` on a laptop |

### When the trial ends

```sh
sudo -u loci env DATA_DIR=/opt/loci/data node server/scripts/export.js   # if you want to keep the data
sudo tailscale serve reset                                                  # stop publishing
sudo systemctl disable --now loci-demo
sudo rm -rf /opt/loci/data                                                  # delete it, as promised
```

Then remove the access-control rule or the machine shares, and archive the practice repos.

---

## What to check early

These couldn't be verified before the demo was on the Spark:

- `npm ci` builds `better-sqlite3` on arm64. Step 1 installs the build tools in case it has to compile.
- A person from **another tailnet** using a shared device is identified (step 8B).
- On an **iPhone**, the visualizations' labels show in Manrope. If they fall back to a system font, the sandbox didn't accept the font hand-off; everything else still works.
- On an **older Android phone**, the heavier pieces (the Julia set) may pause with "running slowly", which is expected.
