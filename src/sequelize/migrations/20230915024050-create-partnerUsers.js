module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('partnerUsers', {
      partnerId: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },
      userId: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
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

    await queryInterface.addConstraint('partnerUsers', {
      type: 'foreign key',
      fields: ['partnerId'],
      name: 'partnerUsers_partnerId',
      references: {
        table: 'partners',
        field: 'id',
      },
    });

    await queryInterface.addConstraint('partnerUsers', {
      type: 'foreign key',
      fields: ['userId'],
      name: 'partnerUsers_userId',
      references: {
        table: 'users',
        field: 'id',
      },
    });
  },
  // eslint-disable-next-line no-unused-vars
  down: async (queryInterface, DataTypes) => {
    await queryInterface.dropTable('partnerUsers');
  },
};
