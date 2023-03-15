module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('primeTrustAccounts', 'email');
    await queryInterface.removeColumn('primeTrustAccounts', 'password');
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('primeTrustAccounts', 'email', {
      type: Sequelize.STRING(100),
      allowNull: false,
    }, {
      logging: console.log,
    });
    await queryInterface.addColumn('primeTrustAccounts', 'password', {
      type: Sequelize.STRING(100),
      allowNull: false,
    }, {
      logging: console.log,
    });
  },
};
