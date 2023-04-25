// TS_NODE_FILES=true node_modules/.bin/ts-node src/scripts/enableWebhook.ts

import '../models';
import { Config } from '../config';
import { PrimeTrustService } from '../services/primeTrust';

export const enableWebhook = async () => {
  const primeTrustService = PrimeTrustService.getInstance()
  const res = await primeTrustService.getAccount(Config.primeTrustAccountId);
  const webhookConfigId = res?.included?.find((entry) => entry.type === 'webhook-configs')?.id

  if (webhookConfigId) {
    await primeTrustService.enableWebHookConfig(webhookConfigId)
  }
};

(async () => {
  await enableWebhook();
})();
