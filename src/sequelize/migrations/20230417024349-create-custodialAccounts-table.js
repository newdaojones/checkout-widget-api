module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('custodialAccounts', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },
      contactId: {
        type: Sequelize.UUID,
        allowNull: false,
        index: true
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      firstName: {
        allowNull: false,
        type: Sequelize.STRING(100),
      },
      lastName: {
        allowNull: false,
        type: Sequelize.STRING(100),
      },
      dob: {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: null
      },
      gender: {
        type: Sequelize.ENUM('male', 'female'),
        allowNull: false,
        defaultValue: 'male'
      },
      email: {
        allowNull: false,
        type: Sequelize.STRING(100),
      },
      phoneNumber: {
        allowNull: false,
        type: Sequelize.STRING(100),
      },
      taxId: {
        allowNull: false,
        type: Sequelize.STRING(100),
      },
      streetAddress: {
        allowNull: false,
        type: Sequelize.STRING(255),
      },
      streetAddress2: {
        allowNull: true,
        defaultValue: null,
        type: Sequelize.STRING(255),
      },
      city: {
        allowNull: false,
        type: Sequelize.STRING(255),
      },
      state: {
        allowNull: false,
        type: Sequelize.STRING(25),
      },
      zip: {
        allowNull: false,
        type: Sequelize.STRING(10),
      },
      country: {
        allowNull: true,
        defaultValue: null,
        type: Sequelize.STRING(255),
      },
      identityConfirmed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      identityDocumentsVerified: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      proofOfAddressDocumentsVerified: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      amlCleared: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      cipCleared: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
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
  },
  // eslint-disable-next-line no-unused-vars
  down: async (queryInterface, DataTypes) => {
    await queryInterface.dropTable('custodialAccounts');
  },
};
