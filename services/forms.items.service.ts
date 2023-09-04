'use strict';

import moleculer from 'moleculer';
import { Service } from 'moleculer-decorators';

import DbConnection from '../mixins/database.mixin';

import {
  COMMON_FIELDS,
  COMMON_SCOPES,
  BaseModelInterface,
  COMMON_DEFAULT_SCOPES,
} from '../types';
import _ from 'lodash';

export interface FormGroup extends BaseModelInterface {
  name: string;
  form: number;
  group: number;
  k: number;
  v: number;
  p: number;
}

@Service({
  name: 'forms.items',

  mixins: [
    DbConnection({
      collection: 'formItems',
      rest: false,
    }),
  ],

  settings: {
    fields: {
      id: {
        type: 'string',
        columnType: 'integer',
        primaryKey: true,
        secure: true,
      },

      name: 'string',

      form: {
        type: 'number',
        columnName: 'formId',
        populate: {
          action: 'forms.resolve',
        },
      },

      group: {
        type: 'number',
        columnName: 'groupId',
        populate: {
          action: 'forms.groups.resolve',
        },
      },

      k: 'number',
      v: 'number',
      p: 'number',

      ...COMMON_FIELDS,
    },

    scopes: {
      ...COMMON_SCOPES,
    },

    defaultScopes: [...COMMON_DEFAULT_SCOPES],
  },
})
export default class FormsItemsService extends moleculer.Service {}
