import { parse } from 'path';
import log from '../utils/log';

const PREFIX = parse(__filename).name;

export default warmline;

/**
 * Information about contacting the team!
 * @return {any} an object with information about the bot
 */
export async function warmline():Promise<HelpResource[]> {
  const resources = [
    {
      name: 'Warmline Directory',
      country: 'Worldwide',
      website: 'https://warmline.org/warmdir.html#directory',
      phone: '',
      text: '',
      webchat: '',
    },
  ];
  log.info(`[${PREFIX}] response: ${JSON.stringify(resources, null, 2)}`);
  return resources;
}

type HelpResource = {
  name: string;
  country: string;
  website: string;
  phone: string;
  text: string;
  webchat: string;
};
