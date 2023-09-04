'use strict';

import moleculer, { Context } from 'moleculer';
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
  parent: number;
}

@Service({
  name: 'forms.groups',

  mixins: [
    DbConnection({
      collection: 'formGroups',
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

      parent: {
        type: 'number',
        columnName: 'parentId',
        populate: {
          action: 'forms.groups.resolve',
        },
      },

      children: {
        virtual: true,
        type: 'array',
        populate: {
          keyField: 'id',
          action: 'forms.groups.populateByProp',
          params: {
            populate: 'children',
            sort: 'name',
            mappingMulti: true,
            queryKey: 'parent',
          },
        },
      },

      ...COMMON_FIELDS,
    },

    scopes: {
      ...COMMON_SCOPES,
      noParent(query: any, ctx: Context, params: any) {
        if (!params?.id && !query?.parent) {
          query.parent = { $exists: false };
        }
        return query;
      },
    },

    defaultScopes: [...COMMON_DEFAULT_SCOPES, 'noParent'],
  },
})
export default class FormsGroupsService extends moleculer.Service {}
