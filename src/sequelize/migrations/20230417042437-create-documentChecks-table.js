module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('documentChecks', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },
      custodialAccountId: {
        type: Sequelize.UUID,
        allowNull: false,
        index: true
      },
      socureReferenceId: {
        type: Sequelize.UUID,
        allowNull: true,
        defaultValue: null
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      submitForReview: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      exceptions: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: null
      },
      failureDetails: {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: null
      },
      identity: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      identityPhoto: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      kycDocumentCountry: {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: null
      },
      kycDocumentOtherType: {
        type: Sequelize.STRING(100),
        allowNull: true,
        defaultValue: null
      },
      kycDocumentType: {
        type: Sequelize.STRING(100),
        allowNull: true,
        defaultValue: null
      },
      proofOfAddress: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      parsedPhysicalAddress: {
        type: Sequelize.STRING(255),
        allowNull: true,
        defaultValue: null
      },
      parsedPhysicalAddress: {
        type: Sequelize.STRING(255),
        allowNull: true,
        defaultValue: null
      },
      parsedDocumentNumber: {
        type: Sequelize.STRING(255),
        allowNull: true,
        defaultValue: null
      },
      parsedName: {
        type: Sequelize.STRING(255),
        allowNull: true,
        defaultValue: null
      },
      parsedDateOfBirth: {
        type: Sequelize.STRING(255),
        allowNull: true,
        defaultValue: null
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
        allowNull: false,
      },
    }, {
      engine: 'InnoDB',
      charset: 'utf8',
    });

    await queryInterface.addConstraint('cipChecks', {
      type: 'foreign key',
      fields: ['custodialAccountId'],
      name: 'cipCheckCustodialAccountId',
      references: {
        table: 'custodialAccounts',
        field: 'id',
      },
    });
  },
  // eslint-disable-next-line no-unused-vars
  down: async (queryInterface, DataTypes) => {
    await queryInterface.dropTable('cipChecks');
  },
};
