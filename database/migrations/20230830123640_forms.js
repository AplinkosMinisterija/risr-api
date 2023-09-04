const { commonFields } = require('./20230830123614_setup');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('forms', (table) => {
    table.increments('id');
    table.integer('tenantId').unsigned();
    table.string('name', 255);
    table.string('code', 255);
    commonFields(table);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable('forms');
};
