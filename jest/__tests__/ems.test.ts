import {
  Colors,
} from 'discord.js';
import { parse } from 'path';
import { stripIndents } from 'common-tags';
import { dEms } from '../../src/discord/commands/global/d.ems';
import { executeCommandAndSpyReply, embedContaining, getParsedCommand } from '../utils/testutils';
import log from '../../src/global/utils/log'; // eslint-disable-line

const PREFIX = parse(__filename).name; // eslint-disable-line

const slashCommand = dEms;

describe(slashCommand.data.name, () => {
  it(slashCommand.data.description, async () => {
    const commandData = slashCommand.data;
    const stringCommand = `/${commandData.name}`;
    const command = getParsedCommand(stringCommand, commandData);
    // log.debug(`[${PREFIX}] command: ${JSON.stringify(command, null, 2)}`);
    const spy = await executeCommandAndSpyReply(slashCommand, command);
    expect(spy).toHaveBeenCalledWith(embedContaining({
      color: Colors.Purple,
      author: {
        iconURL: 'https://fossdroid.com/images/icons/me.tripsit.tripmobile.13.png',
        name: 'TripSit.Me',
        url: 'http://www.tripsit.me',
      },
      footer: {
        iconURL: 'https://imgur.com/b923xK2.png',
        text: 'Dose responsibly!',
      },
      title: 'EMS Information',
      fields: [
        {
          name: 'Poison Control (USA)',
          value: stripIndents`
          [Website](https://www.poison.org)            
          [Webchat](https://www.poison.org)            
          Call: (800) 222-1222`,
          inline: true,
        },
        {
          name: 'Never Use Alone (USA)',
          value: stripIndents`
          [Website](https://neverusealone.com)                        
          Call: (800) 484-3731`,
          inline: true,
        },
        {
          name: 'National Overdose Response Service (Canada)',
          value: stripIndents`
          [Website](https://www.nors.ca)                        
          Call: 1 (888) 688-6677`,
          inline: true,
        },
        {
          name: 'Talktofrank (UK)',
          value: stripIndents`
          [Website](https://www.talktofrank.com)            
          [Webchat](https://www.talktofrank.com)            
          Call: 0300 123 6600`,
          inline: true,
        },
        {
          name: 'Mindzone (EU/germany)',
          value: stripIndents`
          [Website](https://mindzone.info/gesundheit/drogennotfall)                                    
          Text: 112 (works EU wide)`,
          inline: true,
        },
        {
          name: 'Crisis Text Line (United States)',
          value: stripIndents`
          [Website](https://www.crisistextline.org)                        
          Call: 988            
          Text: HOME to 741741`,
          inline: true,
        },
        {
          name: 'Canadian Mental Health Association (Canada)',
          value: stripIndents`
          [Website](https://cmha.ca/)                        
          Call: 1-833-456-4566 (24/7) 
          1-866-277-3553 in Quebec (24/7)             
          Text: 45645 (4 p.m. – Midnight ET)`,
          inline: true,
        },
        {
          name: 'Kids Help Phone (<18) (Canada)',
          value: stripIndents`
          [Website](https://kidshelpphone.ca/)            
          [Webchat](https://kidshelpphone.ca/)                        
          Text: CONNECT to 686868`,
          inline: true,
        },
        {
          name: 'Samaritans (UK)',
          value: stripIndents`
          [Website](https://www.samaritans.org)            
          [Webchat](https://www.samaritans.org)            
          Call: 116 123`,
          inline: true,
        },
        {
          name: 'Open Counseling Suicide Hotline List (Worldwide)',
          value: stripIndents`
          [Website](https://blog.opencounseling.com)            
          [Webchat](https://blog.opencounseling.com)`,
          inline: true,
        },
      ],
    }));
  });
});
