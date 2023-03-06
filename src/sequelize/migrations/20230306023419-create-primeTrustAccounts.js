module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('primeTrustAccounts', {
      id: {
        type: Sequelize.INTEGER(11).UNSIGNED,
        primaryKey: true,
        allowNull: false,
        autoIncrement: true,
      },
      email: {
        allowNull: false,
        type: Sequelize.STRING(100),
      },
      password: {
        allowNull: false,
        type: Sequelize.STRING(100),
      },
      token: {
        allowNull: false,
        type: Sequelize.TEXT,
      },
      expiresAt: {
        allowNull: true,
        defaultValue: null,
        type: Sequelize.DATE
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
    await queryInterface.dropTable('primeTrustAccounts');
  },
};
