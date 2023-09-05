const { commonFields } = require('./20230830123614_setup');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.dropTableIfExists('formItems').alterTable('forms', (table) => {
    table.jsonb('items');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema
    .createTable('formItems', (table) => {
      table.increments('id');
      table.string('name', 255);
      table.integer('formId').unsigned();
      table.integer('groupId').unsigned();
      table.integer('k');
      table.integer('v');
      table.integer('p');
      commonFields(table);
    })
    .alterTable('forms', (table) => {
      table.dropColumn('items');
    });
};
