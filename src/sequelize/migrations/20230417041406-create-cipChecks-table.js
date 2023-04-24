module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('cipChecks', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },
      userId: {
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
      exceptionDetails: {
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

    await queryInterface.addConstraint('cipChecks', {
      type: 'foreign key',
      fields: ['userId'],
      name: 'cipCheck_userId',
      references: {
        table: 'users',
        field: 'id',
      },
    });
  },
  // eslint-disable-next-line no-unused-vars
  down: async (queryInterface, DataTypes) => {
    await queryInterface.dropTable('cipChecks');
  },
};
