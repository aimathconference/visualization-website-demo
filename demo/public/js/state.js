// Shared app state.
export const state = {
  config: null,     // /api/config
  meInfo: null,     // /api/me
  me: null,         // the signed-up user, or null
  view: 'feed',     // 'feed' or a page name
  tab: 'reviewed',  // feed tab: 'reviewed' (main feed) or 'playground'
  items: { reviewed: null, playground: null },
  seq: 0,           // polling cursor
};

const ROLES = ['user', 'moderator', 'blog', 'admin'];
export const rankOf = role => ROLES.indexOf(role) + 1;
/** True if the signed-up user has at least this role (roles form a hierarchy). */
export const can = role => !!state.me && rankOf(state.me.role) >= rankOf(role);
export const ROLE_NAMES = { user: 'User', moderator: 'Moderator', blog: 'Blog maintainer', admin: 'Admin' };

/** Ask the app to show the profile-setup sheet (writes need a finished profile). */
export const needSetup = () => document.dispatchEvent(new CustomEvent('loci:need-setup'));
