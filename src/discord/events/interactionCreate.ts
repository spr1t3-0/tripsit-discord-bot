// import {
//   Client,
//   Interaction,
// } from 'discord.js';
import {
  InteractionType,
} from 'discord-api-types/v10';
import { parse } from 'path';
import {
  InteractionCreateEvent,
} from '../@types/eventDef';
import { commandRun } from '../utils/commandRun';
import { buttonClick } from '../utils/buttonClick';
import { selectMenu } from '../utils/selectMenu';
import { autocomplete } from '../utils/autocomplete';
import { getUser } from '../../global/utils/knex';
import log from '../../global/utils/log'; // eslint-disable-line

const PREFIX = parse(__filename).name;  // eslint-disable-line

export default interactionCreate;

export const interactionCreate: InteractionCreateEvent = {
  name: 'interactionCreate',
  async execute(interaction) {
    const userData = await getUser(interaction.user.id, null);
    if (userData && userData.discord_bot_ban) {
      if (interaction.isRepliable()) {
        interaction.reply({ content: '*beeps sadly*', ephemeral: true });
      }
      return;
    }
    // log.debug(`[${PREFIX}] interaction: ${JSON.stringify(interaction, null, 2)}`);
    // log.debug(`[${PREFIX}] interaction: ${JSON.stringify(interaction)}`);
    // log.debug(`[${PREFIX}] interaction: ${interaction}`);
    // log.debug(`[${PREFIX}] typeof interaction: ${typeof interaction}`);
    // log.debug(`[${PREFIX}] interaction.type: ${interaction.type}`);

    if (interaction.user.bot) {
      // log.debug(`[${PREFIX}] Ignoring bot interaction`);
      return;
    }

    if (interaction.isChatInputCommand()) {
      // log.debug(`[${PREFIX}] Interaction isChatInputCommand!`);

      commandRun(interaction, client);
      return;
    }

    if (interaction.type === InteractionType.ApplicationCommand
      && interaction.isContextMenuCommand()) {
      // log.debug(`[${PREFIX}] interaction.isContextMenuCommand(): ${interaction.isContextMenuCommand()}`);
      commandRun(interaction, client);
      return;
    }

    if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
      autocomplete(interaction);
      return;
    }

    if (interaction.type === InteractionType.MessageComponent) {
      if (interaction.isContextMenuCommand()) {
        commandRun(interaction, client);
        return;
      }
      if (interaction.isSelectMenu()) {
        selectMenu(interaction);
        return;
      }
      if (interaction.isButton()) {
        buttonClick(interaction, client);
      }
      // log.debug(`[${PREFIX}] Unknown interaction!`);
    }
  },
};
