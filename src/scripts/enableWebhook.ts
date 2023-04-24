// TS_NODE_FILES=true node_modules/.bin/ts-node src/scripts/enableWebhook.ts

import '../models';
import { Config } from '../config';
import { PrimeTrustService } from '../services/primeTrust';

export const enableWebhook = async () => {
  const primeTrustService = PrimeTrustService.getInstance()
  await primeTrustService.enableWebHookConfig(Config.primeTrustWebhookConfigId)
};

(async () => {
  await enableWebhook();
})();
