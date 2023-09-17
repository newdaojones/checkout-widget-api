import { Job } from "bull";
import * as moment from "moment-timezone";
import { KycLink } from "../models/KycLink";
import { Op } from "sequelize";
import { UserStatus } from "../types/userStatus.type";
import { TosStatus } from "../types/tosStatus.type";
import { BridgeService } from "./bridgeService";
import { User } from "../models/User";
import { Partner } from "../models/Partner";
import { NotificationService } from "./notificationService";
import { UserService } from "./userService";

const notificationService = NotificationService.getInstance();
const bridgeServiceInstance = BridgeService.getInstance();

export class KycService {
  constructor(
    private bridgeService: BridgeService,
    private notificationService: NotificationService
  ) {}
  static getInstance() {
    return new KycService(bridgeServiceInstance, notificationService);
  }

  private async getKycLinksInAnHour() {
    return KycLink.findAll({
      where: {
        createdAt: {
          [Op.lte]: moment.utc().subtract(1, "hour").toDate(),
        },
        [Op.or]: [
          {
            kycStatus: { [Op.notIn]: [UserStatus.Active, UserStatus.Rejected] },
          },
          {
            tosLink: TosStatus.Pending,
          },
        ],
      },
    });
  }

  private async getKycLinksIn24Hours() {
    return KycLink.findAll({
      where: {
        createdAt: {
          [Op.gt]: moment.utc().subtract(1, "hour").toDate(),
          [Op.lte]: moment.utc().subtract(1, "day").toDate(),
        },
        [Op.or]: [
          {
            kycStatus: { [Op.notIn]: [UserStatus.Active, UserStatus.Rejected] },
          },
          {
            tosLink: TosStatus.Pending,
          },
        ],
      },
    });
  }

  private async getKycLinksIn28Days() {
    return KycLink.findAll({
      where: {
        createdAt: {
          [Op.gt]: moment.utc().subtract(1, "day").toDate(),
          [Op.lte]: moment.utc().subtract(28, "days").toDate(),
        },
        [Op.or]: [
          {
            kycStatus: { [Op.notIn]: [UserStatus.Active, UserStatus.Rejected] },
          },
          {
            tosLink: TosStatus.Pending,
          },
        ],
      },
    });
  }

  async syncKycInAnHour(job: Job) {
    const kycLinks = await this.getKycLinksInAnHour();

    await this.syncKycLinks(job, kycLinks);
  }

  async syncKycIn24Hours(job: Job) {
    const kycLinks = await this.getKycLinksIn24Hours();

    await this.syncKycLinks(job, kycLinks);
  }

  async syncKycIn28Days(job: Job) {
    const kycLinks = await this.getKycLinksIn28Days();

    await this.syncKycLinks(job, kycLinks);
  }

  async singleSyncKyc(job: Job) {
    const { id } = job.data;

    if (!id) {
      await job.log("Not provided kyc link id");
      await job.progress(100);
      return;
    }

    const kycLink = await KycLink.findByPk(id);

    if (!kycLink) {
      await job.log(`Not found kyc link for ${id}`);
      await job.progress(100);
      return;
    }

    await this.syncKycLinks(job, [kycLink]);
  }

  private async syncKycLinks(job: Job, kycLinks: KycLink[]) {
    if (!kycLinks.length) {
      await job.log("No kyc links that need to sync");
      await job.progress(100);
      return;
    }

    await job.update({
      kycLinkIds: kycLinks.map((link) => link.id),
    });

    for (let i = 0; i < kycLinks.length; i += 1) {
      const kycLink = await kycLinks[i];

      await job.log(`Start Sync: ${kycLink.id}`);

      try {
        await this.syncKyc(kycLink);

        await job.log(`Synced ${kycLink.id}`);
      } catch (err) {
        await job.log(`Error Sync: ${kycLink.id}`);
      }

      if (i !== kycLinks.length - 1) {
        const progress = ((i + 1) / kycLinks.length) * 100;
        await job.progress(Number(progress.toFixed(2)));
      }
    }

    await job.progress(100);
  }

  private async syncKyc(kycLink: KycLink) {
    if (kycLink.associatedObjectType === "user") {
      if (kycLink.associatedUserType === "user") {
        return this.syncUserByCustomer(kycLink);
      }

      return this.syncUserByKycLink(kycLink);
    }

    if (kycLink.associatedUserType === "user") {
      return this.syncPartnerByCustomer(kycLink);
    }

    return this.syncPartnerByKycLink(kycLink);
  }

  private async syncUserByCustomer(kycLink: KycLink) {
    if (!kycLink.customerId) {
      return;
    }

    const user = await User.findByPk(kycLink.userId);

    if (!user) {
      return;
    }

    const userStatus = user.status;
    const res = await this.bridgeService.getCustomer(kycLink.customerId);

    await user.sequelize.transaction(async (t) => {
      await user.update(
        {
          status: res.status,
          requirementsDue: res.requirements_due,
          futureRequirementsDue: res.future_requirements_due,
        },
        { transaction: t }
      );

      await kycLink.update(
        {
          kycStatus: res.status,
        },
        { transaction: t }
      );
    });

    if (userStatus === user.status) {
      return;
    }

    await this.notificationService.publishUserStatus({
      userId: user.id,
      status: user.state,
      token: UserService.generateJWTToken({
        id: user.id,
        email: user.email,
      }),
      error: "",
    });
  }

  private async syncUserByKycLink(kycLink: KycLink) {
    const user = await User.findByPk(kycLink.userId);

    if (!user) {
      return;
    }

    const userStatus = user.status;

    await user.sequelize.transaction(async (t) => {
      const kycLinkRes = await this.bridgeService.getKycLink(kycLink.id);

      await kycLink.update(
        {
          kycStatus: kycLinkRes.kyc_status,
          tosStatus: kycLinkRes.tos_status,
        },
        { transaction: t }
      );

      if (kycLinkRes.customer_id) {
        const customer = await this.bridgeService.getCustomer(
          kycLinkRes.customer_id
        );

        await user.update(
          {
            status: customer.status,
            requirementsDue: customer.requirements_due,
            futureRequirementsDue: customer.future_requirements_due,
          },
          { transaction: t }
        );
      }
    });

    if (userStatus === user.status) {
      return;
    }

    await this.notificationService.publishUserStatus({
      userId: user.id,
      status: user.state,
      token: UserService.generateJWTToken({
        id: user.id,
        email: user.email,
      }),
      error: "",
    });
  }

  private async syncPartnerByCustomer(kycLink: KycLink) {
    if (!kycLink.customerId) {
      return;
    }

    const partner = await Partner.findByPk(kycLink.userId);

    if (!partner) {
      return;
    }
    const partnerStatus = partner.status;
    const res = await this.bridgeService.getCustomer(kycLink.customerId);

    await partner.sequelize.transaction(async (t) => {
      await partner.update(
        {
          status: res.status,
        },
        { transaction: t }
      );

      await kycLink.update(
        {
          kycStatus: res.status,
        },
        { transaction: t }
      );
    });

    if (partner.status === partnerStatus) {
      return;
    }

    await partner.sendWebhook(partner.id, "account", {
      id: partner.id,
      firstName: partner.firstName,
      lastName: partner.lastName,
      email: partner.email,
      phoneNumber: partner.phoneNumber,
      ssn: partner.ssn,
      dob: partner.dob,
      status: partner.status,
      streetAddress: partner.streetAddress,
      streetAddress2: partner.streetAddress2,
      city: partner.city,
      postalCode: partner.postalCode,
      state: partner.state,
      country: partner.country,
    });
  }

  private async syncPartnerByKycLink(kycLink: KycLink) {
    const partner = await Partner.findByPk(kycLink.userId);

    if (!partner) {
      return;
    }

    const partnerStatus = partner.status;
    await partner.sequelize.transaction(async (t) => {
      const kycLinkRes = await this.bridgeService.getKycLink(kycLink.id);

      await kycLink.update(
        {
          kycStatus: kycLinkRes.kyc_status,
          tosStatus: kycLinkRes.tos_status,
        },
        { transaction: t }
      );

      if (kycLinkRes.customer_id) {
        const customer = await this.bridgeService.getCustomer(
          kycLinkRes.customer_id
        );

        await partner.update(
          {
            status: customer.status,
          },
          { transaction: t }
        );
      }
    });

    if (partner.status === partnerStatus) {
      return;
    }

    await partner.sendWebhook(partner.id, "account", {
      id: partner.id,
      firstName: partner.firstName,
      lastName: partner.lastName,
      email: partner.email,
      phoneNumber: partner.phoneNumber,
      ssn: partner.ssn,
      dob: partner.dob,
      status: partner.status,
      streetAddress: partner.streetAddress,
      streetAddress2: partner.streetAddress2,
      city: partner.city,
      postalCode: partner.postalCode,
      state: partner.state,
      country: partner.country,
    });
  }
}
