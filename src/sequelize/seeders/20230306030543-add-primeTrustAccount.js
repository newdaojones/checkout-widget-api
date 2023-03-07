const account = {
  email: process.env.PRIME_TRUST_ACCOUNT_EMAIL,
  password: process.env.PRIME_TRUST_ACCOUNT_PASSWORD,
}

module.exports = {
  // eslint-disable-next-line no-unused-vars
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('primeTrustAccount', [account]);
  },

  // eslint-disable-next-line no-unused-vars
  async down(queryInterface, Sequelize) {
    return queryInterface.bulkDelete('primeTrustAccount', { email: account.email });
  },
};