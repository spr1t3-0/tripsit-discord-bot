/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  Colors,
  SlashCommandBuilder,
  TextChannel,
  ModalSubmitInteraction,
} from 'discord.js';
import {
  TextInputStyle,
} from 'discord-api-types/v10';
import { parse } from 'path';
import { stripIndents } from 'common-tags';
import { SlashCommand } from '../../@types/commandDef';
import { privacy } from '../../../global/commands/g.privacy';
import { birthday } from '../../../global/commands/g.birthday';
import { embedTemplate } from '../../utils/embedTemplate';
import env from '../../../global/utils/env.config';
import log from '../../../global/utils/log';
import { startLog } from '../../utils/startLog';

const PREFIX = parse(__filename).name;

export default dPrivacy;

export const dPrivacy: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('privacy')
    .setDescription('See and manage how TripSit uses your data!')
    .addSubcommand(subcommand => subcommand
      .setName('get')
      .setDescription('Get what data is stored on your user!'))
    .addSubcommand(subcommand => subcommand
      .setName('delete')
      .setDescription('Instructions on deleting your data!')
      .addStringOption(option => option.setName('confirmation')
        .setDescription('Enter your confirmation code to delete your data!'))),
  async execute(interaction) {
    startLog(PREFIX, interaction);
    const command = interaction.options.getSubcommand() as 'get' | 'delete';
    const embed = embedTemplate();

    const userData = await privacy('get', interaction.user.id);

    if (command === 'get') {
      embed.setTitle('Your Data')
        .setDescription(`Here is what data we store on you: ${userData}`);
    } else if (command === 'delete') {
      const confirmation = interaction.options.getString('confirmation');
      if (confirmation === 'YesPlease!') {
        const userDeleteData = await privacy('delete', interaction.user.id);
        embed.setTitle('Deleting Your Data')
          .setDescription(`Your data was deleted:
          ${userDeleteData}`);
      } else {
        embed.setTitle('Are you sure?') /* eslint-disable max-len */
          .setDescription(stripIndents`This will delete all data we have on you, except:
          1) Moderation actions taken against your Discord ID will remain on file for 6 months from the last time your user ID was seen.
          2) If your user has been banned, your Discord ID and status of your ban will remain on file indefinately.
          
          In other words: If you're not banned and you don't interact with the bot for 6 months, your data will be deleted.
          
          This will delete everything else. Be sure you want to do this! 
          
          **Run this same command but with 'YesPlease!' as the confirmation code.**
          
          The following data will be deleted:
          ${userData}`);
      }
    }

    interaction.reply({ embeds: [embed], ephemeral: true });
    return true;
  },
};
