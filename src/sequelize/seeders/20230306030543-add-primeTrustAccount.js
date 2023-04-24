const user = {
  email: process.env.PRIME_TRUST_ACCOUNT_EMAIL,
}

module.exports = {
  // eslint-disable-next-line no-unused-vars
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('primeTrustAccounts', [user]);
  },

  // eslint-disable-next-line no-unused-vars
  async down(queryInterface, Sequelize) {
    return queryInterface.bulkDelete('primeTrustAccounts', { email: user.email });
  },
};
