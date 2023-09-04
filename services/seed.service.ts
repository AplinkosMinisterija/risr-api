'use strict';

import moleculer, { Context, ServiceBroker } from 'moleculer';
import { Action, Method, Service } from 'moleculer-decorators';
import { FormGroup } from './forms.groups.service';
const fs = require('fs');

@Service({
  name: 'seed',
})
export default class SeedService extends moleculer.Service {
  @Action()
  async real(ctx: Context<Record<string, unknown>>) {
    const usersCount: number = await ctx.call('users.count');

    if (!usersCount) {
      const data: any[] = await ctx.call('auth.getSeedData');

      for (const item of data) {
        await ctx.call('auth.createUserWithTenantsIfNeeded', {
          authUser: item,
          authUserGroups: item.groups,
        });
      }
    }

    console.log('real!')
    await this.seedGroups(ctx);

    return true;
  }

  @Method
  async seedGroups(ctx: Context) {
    const groupsCount: number = await ctx.call('forms.groups.count');
    console.log(groupsCount);
    if (groupsCount > 0) return;

    const groups = [
      {
        name: 'A1. Gynyba, nacionalinis saugumas ir žvalgyba',
        groups: [
          {
            name: 'A1.1. Poveikis politiniam stabilumui, valstybės suverenitetui, teritorijos vientisumui ir konstitucinei santvarkai',
          },
          { name: 'A1.2. Poveikis karinėms ir gynybos operacijoms' },
          { name: 'A1.3. Poveikis žvalgybos ir kontržvalgybos veiklai' },
        ],
      },
      {
        name: 'A2. Tarptautiniai santykiai ir tarptautinė prekyba',
        groups: [
          {
            name: 'A2.1. Poveikis tarptautiniams santykiams ir Lietuvos Respublikos diplomatinių atstovybių ir konsulinių įstaigų užsienyje veiklai',
          },
          { name: 'A2.2. Poveikis tarptautinės prekybos susitarimams' },
        ],
      },

      {
        name: 'A3. Viešasis saugumas ir teisėsauga',
        groups: [
          { name: 'A3.1. Poveikis viešajam saugumui' },
          { name: 'A3.2. Poveikis teismo procesams' },
          {
            name: 'A3.3. Poveikis skubios pagalbos tarnybų (greitoji pagalba, policija, priešgaisrinė apsauga, aplinkosauga) veiklai',
          },
          { name: 'A3.4. Poveikis fizinių asmenų sveikatai' },
          { name: 'A3.5. Poveikis fizinių asmenų gyvybei ir saugumui' },
          { name: 'A3.6. Poveikis fizinių asmenų tapatybei (ir el. erdvėje)' },
          { name: 'A3.7. Poveikis fizinių asmenų reputacijai' },
        ],
      },

      {
        name: 'A4. Prekyba, ekonomika ir viešieji finansai',
        groups: [
          { name: 'A4.1. Poveikis viešiesiems finansams' },
          { name: 'A4.2. Poveikis prekybai ir komercijai' },
          { name: 'A4.3. Poveikis fizinių asmenų finansams ir turtui' },
        ],
      },

      {
        name: 'A5. Viešosios ir administracinės paslaugos',
        groups: [
          {
            name: 'A5.1. Poveikis viešosios ir administracinės paslaugos teikimui',
          },
          {
            name: 'A5.2. Poveikis asmens sveikatos priežiūros ir visuomenės sveikatos priežiūros paslaugoms',
          },
        ],
      },
    ];

    async function createGroups(data: any, parent?: number) {
      if (!data?.length) return;

      for (const item of data) {
        const group: FormGroup = await ctx.call('forms.groups.create', {
          name: item.name,
          parent,
        });

        await createGroups(item.groups, group.id);
      }
    }

    await createGroups(groups);
  }

  @Action()
  async fake(ctx: Context<Record<string, unknown>>) {
    return true;
  }

  @Action()
  run() {
    return this.broker
      .waitForServices([
        'auth',
        'users',
        'tenants',
        'tenantUsers',
        'forms.groups',
      ])
      .then(async () => {
        await this.broker.call('seed.real', {}, { timeout: 120 * 1000 });
      });
  }
}
