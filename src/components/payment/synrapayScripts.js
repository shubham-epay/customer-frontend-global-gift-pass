/**
 * SynraPay Hosted Session script per environment, exactly as SynraPay's Hosted Session docs give them.
 * Loaded straight from SynraPay's script host (never from our API). A client token only works with the
 * script of the environment that created it, so the script is always picked by the session's environment.
 * An environment without a script here (dev) is not offered Hosted Session.
 */
export const HOSTED_SESSION_SCRIPTS = {
  sandbox: 'https://sandbox.js.synrapay.com/hosted-session.js',
  production: 'https://js.synrapay.com/hosted-session.js',
};

export const hostedSessionScript = (environment) => HOSTED_SESSION_SCRIPTS[environment] || null;
