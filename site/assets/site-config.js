/* forgelegacy.app — public client config for the TestFlight form.
 * The anon/publishable key is designed to be public: with it, this page can call exactly one thing,
 * request_testflight_invite() (migration 0215). Empty values make the form say sign-up is unavailable
 * instead of failing silently. */
window.FL_SITE = {
  supabaseUrl: 'https://ucqbzoeouvwoyfnnmqoo.supabase.co',
  anonKey: 'sb_publishable_NxMfaKv5XYqdu72C7D1xdg_MCbsOaHw',
};
