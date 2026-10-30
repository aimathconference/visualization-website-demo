# Hosting the demo on the Spark, and giving the trial team access

This takes about 45 minutes the first time. You need an SSH or terminal session on the Spark with `sudo`, and admin access to the Tailscale tailnet the Spark will join.

Commands marked **(Spark)** run on the Spark. The Spark runs DGX OS (Ubuntu 22.04) on an arm64 CPU.

**Our setup:**

| | |
|---|---|
| Machine | `spark-7d54`, Tailscale IP `100.69.228.10` |
| Tailnet owner and admin login | `tbraz56@gmail.com` |
| Already done | The Spark is on Tailscale and shared with 22 people (step 8B) |
| Site address | `https://spark-7d54.<tailnet>.ts.net`. Step 7 prints the exact address. |

Run every command from the app folder. A new terminal starts in your home folder (`~`), so `cd /opt/loci/app/demo` first.

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
sudo install -m 640 -o root -g loci /opt/loci/app/demo/deploy/loci-demo.env.example /etc/loci-demo.env
sudo nano /etc/loci-demo.env
```

Set these two lines. Ports 3000 and 8000 are already taken on the Spark, so the demo uses 3300.

```sh
PORT=3300
ADMIN_LOGINS=tbraz56@gmail.com
```

To add more admins later, separate the logins with commas, then run `sudo systemctl restart loci-demo`. Leave the registry settings commented out until the practice repos exist (Part D).

To save in nano, press **Ctrl+O** and **Enter**, then **Ctrl+X** to exit. To check the file: `sudo grep -E 'PORT|ADMIN' /etc/loci-demo.env`.

### 5. Start it (Spark)

```sh
cd /opt/loci/app/demo
ss -ltnp | grep ':3300 ' || echo "port 3300 is free"   # if it's taken, pick another free port for PORT in /etc/loci-demo.env, and use it in step 7 too
sudo cp /opt/loci/app/demo/deploy/loci-demo.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now loci-demo
systemctl status loci-demo --no-pager          # should say "active (running)"
curl -s http://127.0.0.1:3300/api/config       # should print JSON with "authMode":"tailscale"
```

The first start creates the database and loads the six seed visualizations and three blog posts. Logs: `journalctl -u loci-demo -f`.

---

## Part B: publish it on the tailnet

### 6. Check the Spark's Tailscale settings

The Spark is already on Tailscale as `spark-7d54`, signed in as `tbraz56@gmail.com`, so skip installing it and `tailscale up`. To confirm it's connected (Spark): `tailscale status`.

In the Tailscale admin console (login.tailscale.com):

1. **DNS:** make sure **MagicDNS** is on, then **Enable HTTPS** (HTTPS certificates). The site can't get a certificate without this.
2. **Machines** (optional): to get the shorter address `https://spark.<tailnet>.ts.net`, rename the machine to `spark` (⋯ → Edit machine name). Do it **before** sending anyone the link, because the address changes with the name.
3. **Users:** this page shows each person's **login name**, often an email address. These are the values for `ADMIN_LOGINS` in step 4. After changing that file, run `sudo systemctl restart loci-demo`.

Don't add a tag to the trial members' own devices. Tailscale sends no identity for tagged devices, and the demo uses that identity as each person's account. Tagging the Spark itself is fine.

### 7. Turn on HTTPS serving (Spark)

First check whether the apps on ports 3000 and 8000 are already published through Tailscale:

```sh
tailscale serve status
```

**If it says there's no serve config**, or nothing is listed for plain `https://spark-7d54.<tailnet>.ts.net` (port 443), use the standard HTTPS port:

```sh
sudo tailscale serve --bg 3300
tailscale serve status       # shows https://spark-7d54.<tailnet>.ts.net → 127.0.0.1:3300
```

**If port 443 is already in use**, don't run that command, because it would take over the other app's address. Use port 8443 instead:

```sh
sudo tailscale serve --bg --https=8443 3300
tailscale serve status       # shows https://spark-7d54.<tailnet>.ts.net:8443 → 127.0.0.1:3300
```

The site's address then ends in `:8443`, so use that address in steps 8 and 9. If you're using option A's access rule, allow `spark:8443` instead of `spark:443`.

The serve setting persists across reboots. Then test it on your own laptop or phone:

1. Turn Tailscale on. A device that's grey in the Machines list is offline.
2. Open the address. You should see the feed and a "Set up your profile" sheet.
3. Pick a handle. Because `tbraz56@gmail.com` is in `ADMIN_LOGINS`, your account menu should say "Admin".

---

## Part C: give the 30 people access

### 8. Get everyone onto the Spark's tailnet

**Our setup uses B: it's already shared with 22 people.** They have their own Tailscale accounts, and the Spark is on the personal tailnet of `tbraz56@gmail.com`.

- For the rest of the 30 people, use B below.
- If someone can't open the site, check the admin console under **Machines → spark-7d54 → Share…**. Have they accepted their invite?

Option A is here for reference.

**A. They're in the same tailnet as the Spark** (e.g. your organization's):

- If your access policy is still the default (everyone can reach everything), there's nothing to do.
- Otherwise, in the admin console → **Access controls**, add a group and a rule that only lets them reach the Spark's web port:
  ```jsonc
  {
    "groups": { "group:loci-trial": ["alice@example.org", "bob@example.org"] },
    "hosts":  { "spark": "100.69.228.10" },      // the Spark's Tailscale IP, from `tailscale ip -4`
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

Shared users can reach it and are identified the same way, but they can't see the rest of your tailnet.

**Before you message everyone, have one person who was shared the machine open the site.** They should get the profile-setup sheet, not a message about signing in. That confirms their identity comes through.

### 9. Send the team instructions

Show them a QR code if you're in a room together. To print one (Spark): `cd /opt/loci/app/demo && npm run qr -- https://spark-7d54.<tailnet>.ts.net`

A message you can send:

> **Try the visualization feed**
> 1. Install Tailscale on your phone or laptop and sign in. (If you got a share invite, accept it first.)
> 2. Make sure Tailscale is **on**. On phones it's a VPN toggle in the app.
> 3. Open **https://spark-7d54.<tailnet>.ts.net** and pick a handle. There's no password; Tailscale knows who you are.
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
| Someone's page won't load at all | Tailscale isn't connected on that device. Check with `tailscale ping spark-7d54` on a laptop |

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
