import { sandboxPayments } from './sandbox';
import { devPayments } from './dev';
import { productionPayments } from './production';

/** One API client per SynraPay environment: sandbox, dev and production each call their own backend URLs. */
const CLIENTS = { sandbox: sandboxPayments, dev: devPayments, production: productionPayments };

/**
 * The client for an environment. `fallback` is used when none is known yet (the configured default from
 * /payments/config); attempts made before environments existed are dev.
 */
export function paymentsFor(environment, fallback = 'dev') {
  const client = CLIENTS[environment] || CLIENTS[fallback];
  if (!client) throw new Error(`Unknown SynraPay environment: ${environment}`);
  return client;
}

/**
 * Environments the storefront never offers or names, even when the backend has them configured.
 * Their API clients stay, so an attempt already made in one can still be finished.
 */
export const HIDDEN_ENVIRONMENTS = ['dev'];
export const isHiddenEnvironment = (id) => HIDDEN_ENVIRONMENTS.includes(id);

/** The payment config with hidden environments removed, and the default moved to the first one still shown. */
export function withoutHiddenEnvironments(config) {
  if (!config) return config;
  const environments = (config.environments || []).filter((e) => !isHiddenEnvironment(e.id));
  const environment = isHiddenEnvironment(config.environment) ? environments[0]?.id : config.environment;
  return { ...config, environments, environment };
}

export { sandboxPayments, devPayments, productionPayments };
