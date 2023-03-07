module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('assetQuotes', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },
      checkoutId: {
        type: Sequelize.UUID,
        allowNull: false,
        index: true
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      assetName: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      transactionType: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      baseAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      feeAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      totalAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      pricePerUnit: {
        type: Sequelize.DECIMAL(10, 10),
        allowNull: false
      },
      unitCount: {
        type: Sequelize.DECIMAL(10, 10),
        allowNull: false
      },
      hot: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      delayedSettlement: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      integratorSettled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      executedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null
      },
      rejectedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null
      },
      settledAt: {
        type: Sequelize.DATE,
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

    await queryInterface.addConstraint('assetQuotes', {
      type: 'foreign key',
      fields: ['checkoutId'],
      name: 'assetQuoteCheckoutId',
      references: {
        table: 'checkouts',
        field: 'id',
      },
    });
  },
  // eslint-disable-next-line no-unused-vars
  down: async (queryInterface, DataTypes) => {
    await queryInterface.dropTable('assetQuotes');
  },
};
