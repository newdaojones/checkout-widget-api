// TS_NODE_FILES=true node_modules/.bin/ts-node src/scripts/migrateKycLinks.ts

// models
import "../models";

import { KycLink } from "../models/KycLink";
import { User } from "../models/User";
import { TosStatus } from "../types/tosStatus.type";

export const migrateKycLink = async (kycLink: KycLink) => {
  const user = await User.findByPk(kycLink.userId);

  await kycLink.update({
    customerId: kycLink.userId,
    kycStatus: user.status,
    email: user.email,
    tosStatus: TosStatus.Approved,
  });
};

const migrateKycLinks = async () => {
  const kycLinks = await KycLink.findAll();

  for (const kycLink of kycLinks) {
    await migrateKycLink(kycLink);
  }
};

(async () => {
  try {
    await migrateKycLinks();
  } catch (err: any) {
    console.log("migrateKycLinks", err);
  }

  process.exit(0);
})();
