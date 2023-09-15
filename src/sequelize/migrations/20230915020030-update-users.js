module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('users', 'phoneNumber', {
      type: Sequelize.STRING(100),
      allowNull: true,
      defaultValue: null,
    }, { logging: console.log });

    await queryInterface.changeColumn('users', 'gender', {
      type: Sequelize.STRING(20),
      allowNull: true,
      defaultValue: null,
    }, { logging: console.log });

    await queryInterface.changeColumn('users', 'dob', {
      type: Sequelize.STRING(20),
      allowNull: true,
      defaultValue: null,
    }, { logging: console.log });

    await queryInterface.changeColumn('users', 'ssn', {
      type: Sequelize.STRING(100),
      allowNull: true,
      defaultValue: null,
    }, { logging: console.log });

    await queryInterface.changeColumn('users', 'streetAddress', {
      type: Sequelize.STRING(255),
      allowNull: true,
      defaultValue: null,
    }, { logging: console.log });

    await queryInterface.changeColumn('users', 'city', {
      type: Sequelize.STRING(255),
      allowNull: true,
      defaultValue: null,
    }, { logging: console.log });

    await queryInterface.changeColumn('users', 'state', {
      type: Sequelize.STRING(25),
      allowNull: true,
      defaultValue: null,
    }, { logging: console.log });

    await queryInterface.changeColumn('users', 'postalCode', {
      type: Sequelize.STRING(10),
      allowNull: true,
      defaultValue: null,
    }, { logging: console.log });

    await queryInterface.changeColumn('users', 'signedAgreementId', {
      type: Sequelize.STRING(255),
      allowNull: true,
      defaultValue: null,
    }, { logging: console.log });

    await queryInterface.changeColumn('users', 'idempotenceId', {
      type: Sequelize.STRING(255),
      allowNull: true,
      defaultValue: null,
    }, { logging: console.log });
  },

  down: async (queryInterface, Sequelize) => {
  },
};
