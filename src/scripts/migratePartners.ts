// TS_NODE_FILES=true node_modules/.bin/ts-node src/scripts/migratePartners.ts

// models
import "../models";

import { Partner } from "../models/Partner";
import { PartnerUser } from "../models/PartnerUser";
import { User } from "../models/User";

export const migratePartner = async (partner: Partner) => {
  await partner.sequelize.transaction(async (t) => {
    const user = await User.create(
      {
        id: partner.id,
        firstName: partner.firstName,
        lastName: partner.lastName,
        email: partner.email,
        password: partner.password,
        phoneNumber: partner.phoneNumber,
        ssn: partner.ssn,
        dob: partner.dob,
        streetAddress: partner.streetAddress,
        streetAddress2: partner.streetAddress2,
        city: partner.city,
        state: partner.state,
        postalCode: partner.postalCode,
        country: partner.country,
        status: partner.status,
      },
      { transaction: t }
    );

    await PartnerUser.create(
      {
        partnerId: partner.id,
        userId: user.id,
      },
      { transaction: t }
    );
  });
};

const migratePartners = async () => {
  const partners = await Partner.findAll();

  for (const partner of partners) {
    await migratePartner(partner);
  }
};

(async () => {
  try {
    await migratePartners();
  } catch (err: any) {
    console.log("migrateKycLinks", err);
  }

  process.exit(0);
})();
