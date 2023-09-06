'use strict';

import moleculer from 'moleculer';
import { Action, Service } from 'moleculer-decorators';
import { EndpointType } from '../types';

@Service({
  name: 'public',
})
export default class PublicService extends moleculer.Service {
  @Action({
    rest: 'POST /cache/clean',
    auth: EndpointType.PUBLIC,
  })
  cleanCache() {
    this.broker.cacher.clean();
  }
}
