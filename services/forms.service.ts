'use strict';

import moleculer, { Context } from 'moleculer';
import { Method, Service } from 'moleculer-decorators';

import { UserAuthMeta } from './api.service';
import DbConnection from '../mixins/database.mixin';

import {
  COMMON_FIELDS,
  COMMON_DEFAULT_SCOPES,
  COMMON_SCOPES,
  BaseModelInterface,
  TENANT_FIELD,
  FieldHookCallback,
} from '../types';
import { UserType } from './users.service';
import _, { merge } from 'lodash';
import { FormGroup } from './forms.groups.service';

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

      items: {
        type: 'array',
        required: true,
        validate: 'validateItems',
        get: async ({ value }: FieldHookCallback) => {
          return (value as any[]).map((v) => {
            try {
              v.items = JSON.parse(v.items);
            } catch (err) {}
            return v;
          });
        },
        items: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              required: true,
            },
            items: {
              type: 'array',
              validate: 'validateSubItems',
              required: true,
              items: {
                type: 'object',
                properties: {
                  k: {
                    type: 'number',
                    min: 0,
                    max: 4,
                    required: true,
                  },
                  v: {
                    type: 'number',
                    min: 0,
                    max: 4,
                    required: true,
                  },
                  p: {
                    type: 'number',
                    min: 0,
                    max: 4,
                    required: true,
                  },
                  group: {
                    type: 'number',
                    required: true,
                  },
                },
              },
            },
          },
        },
        populate(ctx: any, _values: any, requests: any[]) {
          return Promise.all(
            requests.map((request: any) => {
              return this.getTaxonomiesByRequest(request);
            })
          );
        },
      },

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
export default class FormsService extends moleculer.Service {
  @Method
  async validateItems({ ctx, value, entity, params }: FieldHookCallback) {
    const error = 'Invalid items';

    const valueHasItems = !!value?.length;
    const hadItems = !!entity?.items?.length;

    if (!valueHasItems && !hadItems) {
      return error;
    }

    return true;
  }

  @Method
  async validateSubItems({ ctx, value, entity, params }: FieldHookCallback) {
    const groupsWithParents: FormGroup[] = await ctx.call('forms.groups.find', {
      query: {
        parent: { $exists: true },
      },
    });

    if (groupsWithParents.length !== value.length) {
      return 'Missing groups';
    }

    const everyGroupMathes = groupsWithParents.every((item) =>
      value.some((v: any) => v.group === item.id)
    );

    if (!everyGroupMathes) {
      return 'Invalid groups';
    }

    return true;
  }
}
