import {
  ContextMenuCommandBuilder,
  GuildMember,
} from 'discord.js';
import {
  ApplicationCommandType,
} from 'discord-api-types/v10';
import { parse } from 'path';
import { UserCommand } from '../../@types/commandDef';
// import log from '../../../global/utils/log';
import { moderate } from '../../../global/commands/g.moderate';
import { startLog } from '../../utils/startLog';

const PREFIX = parse(__filename).name;

export default uInfo;

export const uInfo: UserCommand = {
  data: new ContextMenuCommandBuilder()
    .setName('Info')
    .setType(ApplicationCommandType.User),
  async execute(interaction) {
    startLog(PREFIX, interaction);
    const actor = interaction.member as GuildMember;
    const target = interaction.options.data[0].member as GuildMember;

    const result = await moderate(
      actor,
      'INFO',
      target,
      null,
      null,
      null,
    );

    // log.debug(`[${PREFIX}] Result: ${result}`);
    interaction.reply(result);

    return true;
  },
};
