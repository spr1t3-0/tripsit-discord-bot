/* eslint-disable max-len */
import { parse } from 'path';
import log from '../utils/log';
import timezones from '../assets/data/timezones.json';
import { db, getUser } from '../utils/knex';
import { Users } from '../@types/pgdb';

const PREFIX = parse(__filename).name;

export default timezone;

/**
 * Get and set someone's timezone!
 * @param {'get' | 'set'} command You can get 'get' or 'set' the timezone!
 * @param {string} memberId The user to either set or get the timezone!
 * @param {string} timezone (Not always there) The timezone!
 * @return {string} an object with information about the bot
 */
export async function timezone(
  command: 'get' | 'set',
  memberId: string,
  tzvalue?:string | null,
):Promise<string | null> {
  // log.debug(`[${PREFIX}] tzvalue: ${command} ${memberId} ${tzvalue}`);

  let response = '' as string | null;
  if (command === 'set') {
    // define offset as the value from the timezones array
    let tzCode = '';
    for (let i = 0; i < timezones.length; i += 1) {
      if (timezones[i].label === tzvalue) {
        tzCode = timezones[i].tzCode;
        // log.debug(`[${PREFIX}] tzCode: ${tzCode}`);
      }
    }
    // log.debug(`[${PREFIX}] actor.id: ${actor.id}`);

    await db<Users>('users')
      .insert({
        discord_id: memberId,
        timezone: tzCode,
      })
      .onConflict('discord_id')
      .merge()
      .returning('*');

    return `I updated your timezone to ${tzvalue}`;
  }
  let gmtValue = '';

  const userData = await getUser(memberId, null);

  // log.debug(`[${PREFIX}] userData: ${JSON.stringify(userData, null, 2)}`);

  if (userData.timezone !== null) {
    const tzCode = userData.timezone;
    for (let i = 0; i < timezones.length; i += 1) {
      if (timezones[i].tzCode === tzCode) {
        gmtValue = timezones[i].offset;
        // log.debug(`[${PREFIX}] gmtValue: ${gmtValue}`);
      }
    }
    // get the user's timezone from the database
    const timestring = new Date().toLocaleTimeString('en-US', { timeZone: tzCode });
    response = `It is likely ${timestring} (GMT${gmtValue})`;
    log.info(`[${PREFIX}] response: ${JSON.stringify(response, null, 2)}`);
  }
  log.info(`[${PREFIX}] response: ${JSON.stringify(response, null, 2)}`);
  return response;
}
