module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('fundsTransfers', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.UUIDV4,
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
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      amountExcepted: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      currencyType: {
        type: Sequelize.STRING(10),
        allowNull: false
      },
      cancelledAt: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null
      },
      cancellationDetails: {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: null
      },
      clearsOn: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null
      },
      contingenciesClearedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null
      },
      contingenciesClearedOn: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null
      },
      equalityHash: {
        type: Sequelize.STRING(255),
        allowNull: true,
        defaultValue: null
      },
      fundsSourceName: {
        type: Sequelize.STRING(255),
        allowNull: true,
        defaultValue: null
      },
      fundsTransferType: {
        type: Sequelize.STRING(255),
        allowNull: true,
        defaultValue: null
      },
      nachaIndividualId: {
        type: Sequelize.STRING(255),
        allowNull: true,
        defaultValue: null
      },
      privateMemo: {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: null
      },
      receivedChargeBack: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      receiverName: {
        type: Sequelize.STRING(255),
        allowNull: true,
        defaultValue: null
      },
      reference: {
        type: Sequelize.STRING(255),
        allowNull: true,
        defaultValue: null
      },
      reviewReasons: {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: null
      },
      reversedAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      reversedReasons: {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: null
      },
      reversalDetails: {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: null
      },
      reversedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null
      },
      settledAt: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null
      },
      settlementDetails: {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: null
      },
      signetDepositAddress: {
        type: Sequelize.STRING(255),
        allowNull: true,
        defaultValue: null
      },
      specialInstructions: {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: null
      },
      specialType: {
        type: Sequelize.STRING(255),
        allowNull: true,
        defaultValue: null
      },
      wireInstructions: {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: null
      },
      wireInstructionsIntl: {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: null
      },
      altCurrencyWireInstructions: {
        type: Sequelize.TEXT,
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

    await queryInterface.addConstraint('fundsTransfers', {
      type: 'foreign key',
      fields: ['checkoutId'],
      name: 'fundsTransferCheckoutId',
      references: {
        table: 'checkouts',
        field: 'id',
      },
    });
  },
  // eslint-disable-next-line no-unused-vars
  down: async (queryInterface, DataTypes) => {
    await queryInterface.dropTable('fundsTransfers');
  },
};
