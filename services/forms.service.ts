'use strict';

import moleculer, { Context } from 'moleculer';
import { Service } from 'moleculer-decorators';

import { UserAuthMeta } from './api.service';
import DbConnection from '../mixins/database.mixin';

import {
  COMMON_FIELDS,
  COMMON_DEFAULT_SCOPES,
  COMMON_SCOPES,
  BaseModelInterface,
  TENANT_FIELD,
} from '../types';
import { UserType } from './users.service';
import _ from 'lodash';

export interface Form extends BaseModelInterface {
  title: string;
  code: string;
}

const VISIBLE_TO_USER_SCOPE = 'visibleToUser';

const AUTH_PROTECTED_SCOPES = [...COMMON_DEFAULT_SCOPES, VISIBLE_TO_USER_SCOPE];

@Service({
  name: 'forms',

  mixins: [
    DbConnection({
      collection: 'forms',
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
      code: 'string',

      ...TENANT_FIELD,

      ...COMMON_FIELDS,
    },

    scopes: {
      ...COMMON_SCOPES,
      visibleToUser(query: any, ctx: Context<null, UserAuthMeta>, params: any) {
        const { user, profile } = ctx?.meta;
        if (!user?.id) return query;

        const createdByUserQuery = {
          createdBy: user?.id,
          tenant: { $exists: false },
        };

        if (profile?.id) {
          return { ...query, tenant: profile.id };
        } else if (user.type === UserType.USER) {
          return { ...query, ...createdByUserQuery };
        }

        if (query.createdBy === user.id) {
          return { ...query, ...createdByUserQuery };
        }

        return query;
      },
    },

    defaultScopes: AUTH_PROTECTED_SCOPES,
  },
})
export default class FormsService extends moleculer.Service {}
