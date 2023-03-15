module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('primeTrustAccounts', 'password');
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('primeTrustAccounts', 'password', {
      type: Sequelize.STRING(100),
      allowNull: false,
    }, {
      logging: console.log,
    });
  },
};
