module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('checkouts', 'custodialAccountId', {
      type: Sequelize.UUID,
      allowNull: true,
      defaultValue: null
    }, { logging: console.log });

    await queryInterface.addConstraint('checkouts', {
      type: 'foreign key',
      fields: ['custodialAccountId'],
      name: 'checkout_custodialAccountId_id',
      references: {
        table: 'custodialAccounts',
        field: 'id',
      },
    }, { logging: console.log });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('checkouts', 'custodialAccountId');
  },
};
