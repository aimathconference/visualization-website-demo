# Wishlist
A site for hosting a curated collection of high-quality interactive JavaScript mathematical visualizations. These visualizations should be lightweight, customizable, and open-source.

The primary way to interact with the page is by scrolling through the visualizations, akin to TikTok - this is the "Feed" page. A user can also browse through on the "Browse" page. We furthermore have a blog, where curated collections of visualizations are posted.

Users can make accounts or sign up for an email newsletter.

## ROLES:

### User
After logging in, a user can:
- "like" visualizations (the total number of likes is displayed on each visualization in the Feed)
- see a list of their own liked visualizations, and scroll through these
- change their email newsletter preferences

### Moderator
A moderator can do everything a user can, plus:
- flag visualizations for removal
- flag visualizations for requested changes, which gets sent to the user who made the visualization for their edits, which go back into the review process
- flag accounts for removal


### Blog maintainer
A blog maintainer can do everything a moderator can do, plus:
- add blog posts

### Admin experience
An admin can do everything a user and moderator and blog maintainer can do, plus:
- see all flagged visualizations from moderators
- remove any visualization
- remove any account
- upload any visualization, bypassing review (only to be used during the demo version, we will revoke this privilege in the real version)


## Review
All submission and review is done on GitHub somehow, so users who want to have their submitted reviews link to their account need to link and authenticate their GitHub with their account on our site.

When a visualization is submitted as a pull request, a bot will go through and verify it satisfies our code requirements (to come). If it doesn't verify, it will flag this to the submitted and request changes. If it is verified, two moderators (admins are included in this list) are automatically assigned as reviewers. We'll start by assigning at random but later down the line will want to assign based on the "tags" the user has included for their submitted visualization.

When both reviewers approve the submission, it is automatically uploaded to the site.

## Newsletter
Each user can select/deselect three boxes:
- "best of the month": a human-curated collection of the best visualizations each month
- "development blog": posts about site development, infrastructure changes, and so on
- "miscellany": could be anything! :)
