'use strict';

import moleculer, { Context } from 'moleculer';
import { Action, Method, Service } from 'moleculer-decorators';

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
  items: Array<{
    name: string;
    items: Array<{
      k: number;
      v: number;
      p: number;
      group: number;
    }>;
  }>;
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
                    convert: true,
                  },
                  v: {
                    type: 'number',
                    min: 0,
                    max: 4,
                    required: true,
                    convert: true,
                  },
                  p: {
                    type: 'number',
                    min: 0,
                    max: 4,
                    required: true,
                    convert: true,
                  },
                  group: {
                    type: 'number',
                    required: true,
                    convert: true,
                  },
                },
              },
            },
          },
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
  @Action({
    rest: 'GET /:id/stats',
    params: {
      id: {
        type: 'number',
        convert: true,
      },
    },
  })
  async stats(ctx: Context<{ id: number }>) {
    const form: Form = await ctx.call('forms.resolve', {
      id: ctx.params.id,
      throwIfNotExist: true,
    });

    const formGroups: { [key: string]: FormGroup[] } = await ctx.call(
      'forms.groups.find',
      {
        query: {
          parent: { $exists: true },
        },
        mapping: 'parent',
        mappingMulti: true,
      }
    );

    function calcStats(items: any | any[]) {
      if (!Array.isArray(items)) {
        items = [items];
      }

      function getMaxValue(items: number[]) {
        items = items.filter((i) => i > 0);
        if (!items?.length) return 0;
        return Math.min(...items);
      }

      return {
        k: getMaxValue(items.map((i: any) => i.k)),
        v: getMaxValue(items.map((i: any) => i.v)),
        p: getMaxValue(items.map((i: any) => i.p)),
      };
    }

    function getStatsByItem(item: any) {
      const statsByGroup: any = {};
      item.items.forEach((item: any) => {
        statsByGroup[item.group] = calcStats(item);
      });

      Object.keys(formGroups).forEach((id) => {
        statsByGroup[id] = calcStats(
          formGroups[id].map((i) => i.id).map((id) => statsByGroup[id])
        );
      });

      return {
        name: item.name,
        byGroup: statsByGroup,
        global: calcStats(Object.values(statsByGroup)),
      };
    }

    const stats: any = {
      byItem: form.items.reduce(
        (acc, item, index) => ({
          ...acc,
          [index]: getStatsByItem(item),
        }),
        {}
      ),
      byGroup: {},
      global: {},
    };

    const allGroupsIds = Object.values(stats.byItem)
      .map((i: any) => i.byGroup)
      .map((i) => Object.keys(i))
      .reduce((acc, i) => [...acc, ...i], []);

    allGroupsIds.forEach((id) => {
      const groupStats = Object.values(stats.byItem).map(
        (i: any) => i.byGroup[id]
      );
      stats.byGroup[id] = calcStats(groupStats);
    });

    stats.global = calcStats(Object.values(stats.byGroup));

    return stats;
  }

  @Method
  async validateItems({ value, entity }: FieldHookCallback) {
    const error = 'Invalid items';

    const valueHasItems = !!value?.length;
    const hadItems = !!entity?.items?.length;

    if (!valueHasItems && !hadItems) {
      return error;
    }

    return true;
  }

  @Method
  async validateSubItems({ ctx, value }: FieldHookCallback) {
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
