module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('checkouts', {
      id: {
        type: Sequelize.INTEGER(11).UNSIGNED,
        primaryKey: true,
        allowNull: false,
        autoIncrement: true,
      },
      firstName: {
        allowNull: false,
        type: Sequelize.STRING(100),
      },
      lastName: {
        allowNull: false,
        type: Sequelize.STRING(100),
      },
      email: {
        allowNull: false,
        type: Sequelize.STRING(100),
      },
      phoneNumber: {
        allowNull: false,
        type: Sequelize.STRING(100),
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'USD',
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      tip: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      fee: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
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
      checkoutChargeId: {
        allowNull: true,
        defaultValue: null,
        type: Sequelize.STRING(255)
      },
      checkoutStatus: {
        allowNull: false,
        defaultValue: 'processing',
        type: Sequelize.ENUM('processing', 'paid', 'postponed', 'error')
      },
      checkoutPaidAt: {
        allowNull: true,
        defaultValue: null,
        type: Sequelize.DATE
      },
      primeTrustId: {
        allowNull: true,
        defaultValue: null,
        type: Sequelize.STRING(255)
      },
      primeTrustStatus: {
        allowNull: false,
        defaultValue: 'postponed',
        type: Sequelize.ENUM('processing', 'paid', 'postponed', 'error')
      },
      primeTrustPaidAt: {
        allowNull: true,
        defaultValue: null,
        type: Sequelize.DATE
      },
      logs: {
        allowNull: true,
        defaultValue: null,
        type: Sequelize.JSON
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
    await queryInterface.dropTable('checkouts');
  },
};
