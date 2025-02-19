/* eslint-disable max-len */
import {
  SlashCommandBuilder,
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  Colors,
  ChatInputCommandInteraction,
  TextChannel,
  ModalBuilder,
  TextInputBuilder,
  SelectMenuBuilder,
  GuildMember,
  ModalSubmitInteraction,
  // Role,
} from 'discord.js';
import {
  ButtonStyle, TextInputStyle,
} from 'discord-api-types/v10';
import { stripIndent, stripIndents } from 'common-tags';
import { parse } from 'path';
import { db } from '../../../global/utils/knex';
import {
  DiscordGuilds,
  ReactionRoles,
} from '../../../global/@types/pgdb';
import env from '../../../global/utils/env.config';
import { startLog } from '../../utils/startLog';
import { SlashCommand } from '../../@types/commandDef';
import { embedTemplate } from '../../utils/embedTemplate';
import log from '../../../global/utils/log';

const PREFIX = parse(__filename).name;

const file = new AttachmentBuilder('./src/discord/assets/img/RULES.png');

const channelOnly = 'You must run this in the channel you want the prompt to be in!';

/**
 * Checks to see if the bot has the right permissions
 * @param {ChatInputCommandInteraction} interaction The guild to check
 * @param {TextChannel} channel
 * @return {Promise<boolean>}
 */
export async function hasPermissions(
  interaction: ChatInputCommandInteraction,
  channel: TextChannel,
):Promise<boolean> {
  // log.debug(`[${PREFIX}] Checking permissions`);
  if (!interaction.guild) {
    const embed = embedTemplate()
      .setTitle('This command can only be used in a server!');
    interaction.editReply({ embeds: [embed] });
    return false;
  }
  const me = interaction.guild.members.me as GuildMember;
  const channelPerms = channel.permissionsFor(me);
  // log.debug(`[${PREFIX}] channelPerms: ${channelPerms?.toArray()}`);

  if (!channelPerms.has('ViewChannel')) {
    const embed = embedTemplate()
      .setTitle(`I need the 'ViewChannel' permissions in ${channel.name} to view the channel!`);
    interaction.followUp({ embeds: [embed] });
    return false;
  }
  if (!channelPerms.has('SendMessages')) {
    const embed = embedTemplate()
      .setTitle(`I need the 'SendMessages' permissions in ${channel.name} to send messages!`);
    interaction.followUp({ embeds: [embed] });
    return false;
  }
  if (!channelPerms.has('CreatePrivateThreads')) {
    const embed = embedTemplate()
      .setTitle(`I need the 'CreatePrivateThreads' permissions in ${channel.name} to create a private thread!`);
    interaction.followUp({ embeds: [embed] });
    return false;
  }
  if (!channelPerms.has('CreatePublicThreads')) {
    const embed = embedTemplate()
      .setTitle(`I need the 'CreatePublicThreads' permissions in ${channel.name} create a public thread!`);
    interaction.followUp({ embeds: [embed] });
    return false;
  }
  if (!channelPerms.has('SendMessagesInThreads')) {
    const embed = embedTemplate()
      .setTitle(`I need the 'SendMessagesInThreads' permissions in ${channel.name} send messages in threads!`);
    interaction.followUp({ embeds: [embed] });
    return false;
  }
  if (!channelPerms.has('EmbedLinks')) {
    const embed = embedTemplate()
      .setTitle(`I need the 'EmbedLinks' permissions in ${channel.name} send messages in threads!`);
    interaction.followUp({ embeds: [embed] });
    return false;
  }
  return true;
}

/**
 * The tripsit prompt
 * @param {Interaction} interaction The interaction that triggered this
 */
export async function tripsit(interaction:ChatInputCommandInteraction) {
  const guildOnly = 'You must run this in the guild you want the prompt to be in!';
  if (!interaction.channel) {
    log.error(`${PREFIX} how to tripsit: no channel`);
    interaction.reply(channelOnly);
    return;
  }

  if (!interaction.guild) {
    log.error(`${PREFIX} how to tripsit: no guild`);
    interaction.reply(guildOnly);
    return;
  }

  if (!await hasPermissions(interaction, (interaction.channel as TextChannel))) {
    // log.debug(`${PREFIX} bot does NOT has permission to post in !`);
    return;
  }

  if (!await hasPermissions(interaction, (interaction.options.getChannel('metatripsit') as TextChannel))) {
    // log.debug(`${PREFIX} bot does NOT has permission to post!`);
    return;
  }

  // log.debug(`${PREFIX} bot has permission to post!`);

  const channelSanctuary = interaction.options.getChannel('sanctuary');
  const channelGeneral = interaction.options.getChannel('general');
  const roleNeedshelp = interaction.options.getRole('needshelp');
  const roleTripsitter = interaction.options.getRole('tripsitter');
  const roleHelper = interaction.options.getRole('helper');
  const channelTripsitmeta = interaction.options.getChannel('metatripsit');
  const channelTripsit = interaction.channel as TextChannel;

  // Save this info to the DB
  await db<DiscordGuilds>('discord_guilds')
    .insert({
      id: interaction.guild.id,
      channel_sanctuary: channelSanctuary ? channelSanctuary.id : null,
      channel_general: channelGeneral ? channelGeneral.id : null,
      channel_tripsitmeta: channelTripsitmeta ? channelTripsitmeta.id : null,
      channel_tripsit: channelTripsit.id,
      role_needshelp: roleNeedshelp ? roleNeedshelp.id : null,
      role_tripsitter: roleTripsitter ? roleTripsitter.id : null,
      role_helper: roleHelper ? roleHelper.id : null,
    })
    .onConflict('id')
    .merge();

  let modalText = stripIndents`
    Welcome to ${(interaction.channel as TextChannel).name}!

    **Need to talk with a tripsitter? Click the buttom below!**
    Share what substance you're asking about, time and size of dose, and any other relevant info.
    This will create a new thread and alert the community that you need assistance!
    🛑 Please do not message helpers or tripsitters directly! 🛑
  `;

  if (channelSanctuary) {
    modalText += `\n\nDon't need immediate help but want a peaceful chat? Come to ${channelSanctuary.toString()}!`;
  }

  if (channelGeneral) {
    modalText += `\n\nAll other topics of conversation are welcome in ${channelGeneral.toString()}!`;
  }

  modalText += '\n\nStay safe!\n\n';

  // Create the modal
  const modal = new ModalBuilder()
    .setCustomId(`tripsitmeModal~${interaction.id}`)
    .setTitle('Setup your TripSit room!');

  const body = new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder()
    .setLabel('Intro Message')
    .setValue(stripIndents`${modalText}`)
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setCustomId('introMessage'));
  modal.addComponents([body]);
  await interaction.showModal(modal);

  // Collect a modal submit interaction
  const filter = (i:ModalSubmitInteraction) => i.customId.startsWith('tripsitmeModal');
  interaction.awaitModalSubmit({ filter, time: 0 })
    .then(async i => {
      if (i.customId.split('~')[1] !== interaction.id) return;
      if (!i.guild) return;

      const introMessage = i.fields.getTextInputValue('introMessage');

      // Create a new button embed
      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('tripsitmeClick')
            .setLabel('I need assistance!')
            .setStyle(ButtonStyle.Primary),
        );

      // Create a new button
      await (i.channel as TextChannel).send({ content: introMessage, components: [row] });
      i.reply({ content: 'Donezo!', ephemeral: true });
    });
}

/**
 * The consultants prompt
 * @param {Interaction} interaction The interaction that triggered this
 */
export async function applications(interaction:ChatInputCommandInteraction) {
  // log.debug(`[${PREFIX}] Setting up applications!`);
  if (!interaction.channel) {
    log.error(`${PREFIX} applications: no channel`);
    interaction.reply(channelOnly);
    return;
  }

  if (!interaction.guild) {
    interaction.reply('You must run this in a guild!');
    return;
  }

  const hasPermission = await hasPermissions(interaction, (interaction.channel as TextChannel));
  if (!hasPermission) {
    // log.debug(`[${PREFIX}] bot does NOT has permission to post in ${interaction.channel}!`);
    return;
  }

  // Save the application channel to the DB
  const channelApplications = interaction.options.getChannel('applications_channel', true);
  await db<DiscordGuilds>('discord_guilds')
    .insert({
      id: interaction.guild.id,
      channel_applications: channelApplications.id,
    })
    .onConflict('id')
    .merge();

  /* eslint-disable no-unused-vars */
  const roleRequestdA = interaction.options.getRole('application_role_a');
  const roleReviewerA = interaction.options.getRole('application_reviewer_a');
  const roleRequestdB = interaction.options.getRole('application_role_b');
  const roleReviewerB = interaction.options.getRole('application_reviewer_b');
  const roleRequestdC = interaction.options.getRole('application_role_c');
  const roleReviewerC = interaction.options.getRole('application_reviewer_c');
  const roleRequestdD = interaction.options.getRole('application_role_d');
  const roleReviewerD = interaction.options.getRole('application_reviewer_d');
  const roleRequestdE = interaction.options.getRole('application_role_e');
  const roleReviewerE = interaction.options.getRole('application_reviewer_e');

  const roleArray = [
    [roleRequestdA, roleReviewerA],
    [roleRequestdB, roleReviewerB],
    [roleRequestdC, roleReviewerC],
    [roleRequestdD, roleReviewerD],
    [roleRequestdE, roleReviewerE],
  ];

  const modal = new ModalBuilder()
    .setCustomId(`appModal~${interaction.id}`)
    .setTitle('Tripsitter Help Request');
  modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder()
    .setCustomId('appliationText')
    .setLabel('What wording do you want to appear?')
    .setStyle(TextInputStyle.Paragraph)
    .setValue(stripIndent`
    **Interested in helping out?**

    Welcome to ${interaction.channel}! This channel allows you to apply for intern positions here at ${interaction.guild.name}!

    We want people who love ${interaction.guild.name}, want to contribute to its growth, and be part of our success!

    We currently have two positions open:

    * Helper
    * Consultant

    **These are not formal roles, but rather a way to get access to the rooms to help out and prove you want to be a part of the org!**
    
    Both positions require that you have a short tenure on the org: 
    While we appreciate the interest you should familiarize yourself with the culture before applying! 
    If you have not been here that long please chat and get to know people before applying again (at least two weeks)!
    
    The **Helper** role is for people who want to help out in the tripsitting rooms.
    As long as you have a general understanding of how drugs work and how hey interact with mental health conditions we do not require a formal education for users interested in taking on the helper role. 
    While we do value lived/living experience with drug use it is not required to be an effective helper!
    
    The **Consultant** role is for people who want to help out in the back-end with development or other organizational work.
    You don't need to code, but you should have some experience with the org and be able to contribute to the org in some way.
    We appreciate all types of help: Not just coders, but anyone who wants to give input or test out new features!
  
    If you want to help out with ${interaction.guild.name}, please click the button below to fill out the application form.
    `)));
  await interaction.showModal(modal);

  // Collect a modal submit interaction
  const filter = (i:ModalSubmitInteraction) => i.customId.startsWith('appModal');
  interaction.awaitModalSubmit({ filter, time: 150000 })
    .then(async i => {
      if (i.customId.split('~')[1] !== interaction.id) return;
      const selectMenu = new SelectMenuBuilder()
        .setCustomId('applicationRoleSelectMenu')
        .setPlaceholder('Select role here!')
        .setMaxValues(1);
      selectMenu.addOptions(
        {
          label: 'Select role here!',
          value: 'none',
        },
      );
      roleArray.forEach(role => {
        if (role[0]) {
          if (role[1]) {
          // log.debug(`[${PREFIX}] role: ${role[0].name}`);
            selectMenu.addOptions(
              {
                label: role[0].name,
                value: `${role[0].id}~${role[1].id}`,
              },
            );
          } else {
            i.reply('Error: You must provide both a role and a reviewer role!');
          }
        }
      });

      await (i.channel as TextChannel).send(
        {
          content: stripIndents`${i.fields.getTextInputValue('appliationText')}`,
          components: [new ActionRowBuilder<SelectMenuBuilder>()
            .addComponents(selectMenu)],
        },
      );
      i.reply({ content: 'Donezo!', ephemeral: true });
    });
}

/**
 * The techhelp prompt
 * @param {Interaction} interaction The interaction that triggered this
 */
export async function techhelp(interaction:ChatInputCommandInteraction) {
  // log.debug(`${PREFIX} techhelp!`);
  if (!(interaction.channel as TextChannel)) {
    log.error(`${PREFIX} how to tripsit: no channel`);
    interaction.reply(channelOnly);
    return;
  }

  if (!interaction.guild) {
    interaction.reply('You must run this in a server!');
    return;
  }

  if (!await hasPermissions(interaction, (interaction.channel as TextChannel))) {
    // log.debug(`${PREFIX} bot does NOT has permission to post in !`);
    return;
  }

  // Save the tech help reviewer role to the db
  await db<DiscordGuilds>('discord_guilds')
    .insert({
      id: interaction.guild.id,
      role_techhelp: interaction.options.getRole('roletechreviewer', true).id,
    })
    .onConflict('id')
    .merge();

  let text = stripIndents`
    Welcome to ${interaction.guild.name}'s technical help channel!

    This channel can be used to get in contact with the ${interaction.guild.name}'s team for **technical** assistance/feedback!`;

  const channelTripsit = interaction.options.getChannel('tripsit');
  if (channelTripsit) {
    text += `\n\n**If you need psychological help try ${channelTripsit.toString()}!**`;
  }
  text += `\n\n**Discord-specific issues, feedback or questions** can be discussesed with the team via the **blue🟦button**.

**Other issues, questions, feedback** can be privately discussed with the team with the **grey button**.

We value your input, no matter how small. Please let us know if you have any questions or feedback!

Thanks for reading, stay safe!
  `;

  // Get the moderator role
  // const roleModerator = interaction.options.getRole('moderator') as Role;

  // Create buttons
  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('techHelpClick~discord')
        .setLabel('Discord issue/feedback!')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('techHelpClick~other')
        .setLabel('I have something else!')
        .setStyle(ButtonStyle.Secondary),
    );

  // Create a new button
  await (interaction.channel as TextChannel).send({ content: text, components: [row] });
  interaction.reply({ content: 'Donezo!', ephemeral: true });
}

/**
 * The rules prompt
 * @param {Interaction} interaction The interaction that triggered this
 */
export async function rules(interaction:ChatInputCommandInteraction) {
  // log.debug(`${PREFIX} rules!`);
  if (!(interaction.channel as TextChannel)) {
    log.error(`${PREFIX} how to tripsit: no channel`);
    interaction.reply(channelOnly);
    return;
  }
  const channelTripsit = interaction.client.channels.cache.get(env.CHANNEL_TRIPSIT);
  if (!channelTripsit) {
    log.error(`${PREFIX} how to tripsit: no channel`);
    interaction.reply('We can\'t find the tripsit channel!');
    return;
  }

  const embed = embedTemplate()
    .setAuthor(null)
    .setFooter(null)
    .setColor(Colors.Red)
    .setImage('attachment://RULES.png');
  await (interaction.channel as TextChannel).send({ embeds: [embed], files: [file] });

  await (interaction.channel as TextChannel).send(stripIndents`
    > **-** **You can be banned without warning if you do not follow the rules!**
    > **-** The "Big 4" rules are below, but generally be positive, be safe, and dont buy/sell stuff and you'll be fine.
    > **-** If you need to clarify anything you can review the full unabridged network rules: https://wiki.tripsit.me/wiki/Rules 
    > **-** The moderators reserve the right to remove those who break the 'spirit' of the rules, even if they don't break any specific rule.
    > **-** If you see something against the rules or something that makes you feel unsafe, let the team know. We want this server to be a welcoming space!
    ${env.EMOJI_INVISIBLE}
    `);

  await (interaction.channel as TextChannel).send(stripIndents`
    > **🔞 1. You must be over 18 to participate in most channels!**
    > **-** We believe that minors will use substances regardless of the info available to them so the best we can do is educate properly and send them on their way.
    > **-** ${channelTripsit.toString()} allows minors to get help from a tripsitter.
    > **-** We appreciate the support, but beyond this it is our belief that minors have more productive activitives than contributing to a harm reduction network <3
    ${env.EMOJI_INVISIBLE}
    `);

  await (interaction.channel as TextChannel).send(stripIndents`
    > **💊 2. No Sourcing!**
    > **-** Don't post anything that would help you or others acquire drugs; legal or illegal, neither in the server nor in DMs.
    > **-** Assume anyone attempting to buy or sell something is a scammer. Report scammers to the team to get a (virtual) cookie.
    > **-** You may source harm reduction supplies and paraphernalia, providing that the source doesn't distribute any substances.
    > **-** No self-promotion (server invites, advertisements, etc) without permission from a staff member.
    ${env.EMOJI_INVISIBLE}
    `);

  await (interaction.channel as TextChannel).send(stripIndents`
    > **💀 3. Do not encourage unsafe usage!**
    > **-** Don't encourage or enable dangerous drug use; don't spread false, dangerous, or misleading information about drugs.
    > **-** Keep your dosage information and stash private unless it's relevant to a question. Posting absurd dosages to get a reaction will receive a reaction (a ban).
    > **-** Hard drug use (beyond nicotine or THC) or driving on camera is not allowed in the voice rooms.
    > **-** No substance identification - no one can tell you which drugs, or how much of them, you have just by looking at them. #harm-reduction
    ${env.EMOJI_INVISIBLE}
    `);

  await (interaction.channel as TextChannel).send(stripIndents`
    > **❤️ 4. Treat everyone with respect!**
    > **-** Don't participate in behaviour that purposefully causes discomfort to others.
    > **-** Don't submit anything that drastically disturbs the flow of chat without providing any added value.
    > **-** That includes: Mic spam, reaction spam, taking six messages to formulate one sentence, etc.
    > **-** Don't post content that is unnecessarily inflammatory, provocative, or controversial. Read the atmosphere, and recognize when you've gone too far.
    ${env.EMOJI_INVISIBLE}
    `);
}

/**
 * The ticketbooth prompt
 * @param {Interaction} interaction The interaction that triggered this
 */
export async function ticketbooth(interaction:ChatInputCommandInteraction) {
  if (!(interaction.channel as TextChannel)) {
    log.error(`${PREFIX} how to tripsit: no channel`);
    interaction.reply(channelOnly);
    return;
  }
  startLog(PREFIX, interaction);
  const channelTripsit = await interaction.client.channels.fetch(env.CHANNEL_TRIPSIT) as TextChannel;
  const channelSanctuary = await interaction.client.channels.fetch(env.CHANNEL_SANCTUARY) as TextChannel;
  const channelOpentripsit = await interaction.client.channels.fetch(env.CHANNEL_OPENTRIPSIT1) as TextChannel;
  const channelRules = await interaction.client.channels.fetch(env.CHANNEL_RULES) as TextChannel;

  // **3)** I understand that every room with a :link: is bridged to IRC and there may be lower quality chat in those rooms.

  const buttonText = `
  Welcome to TripSit!

  **If you need help**
  **1** Go to ${channelTripsit.toString()} and click the "I need assistance button"!
  **-** This will create a private thread for you, and we're happy to help :grin:
  **2** If no one responds, you can chat as a group in the ${channelOpentripsit.toString()} rooms
  **-** Try to pick one that's not busy so we can pay attention to you :heart:
  **3** If you don't need help but would appreciate a quiet chat, come to ${channelSanctuary.toString()}

  **If you want to social chat please agree to the following:**

  **1)** I do not currently need help and understand I can go to ${channelTripsit.toString()} to get help if I need it.
  **2)** I understand if no one responds in ${channelTripsit.toString()} I can talk in the "open" tripsit rooms.
  **3)** I have read the ${channelRules.toString()}: I will not buy/sell anything and I will try to keep a positive atmosphere!
  `;

  // Create a new button embed
  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('memberbutton')
        .setLabel('I understand where to find help and will follow the rules!')
        .setStyle(ButtonStyle.Success),
    );

  // Create a new button
  await (interaction.channel as TextChannel).send({ content: buttonText, components: [row] });
}

/**
 * The starthere prompt
 * @param {Interaction} interaction The interaction that triggered this
 */
export async function starthere(interaction:ChatInputCommandInteraction) {
  startLog(PREFIX, interaction);
  if (!(interaction.channel as TextChannel)) {
    log.error(`${PREFIX} how to tripsit: no channel`);
    interaction.reply(channelOnly);
    return;
  }
  // const channelIrc = interaction.member.client.channels.cache.get(CHANNEL_HELPDESK);
  // const channelQuestions = interaction.client.channels.cache.get(CHANNEL_DRUGQUESTIONS);
  const channelBotspam = interaction.client.channels.cache.get(env.CHANNEL_BOTSPAM);
  // const channelSanctuary = interaction.client.channels.cache.get(CHANNEL_SANCTUARY);
  // const channelGeneral = interaction.client.channels.cache.get(CHANNEL_GENERAL);
  const channelTripsit = interaction.client.channels.cache.get(env.CHANNEL_TRIPSIT);
  const channelRules = interaction.client.channels.cache.get(env.CHANNEL_RULES);

  // **If someone has the "bot" tag they are talking from IRC!**
  // > IRC is an older chat system where TripSit began: chat.tripsit.me
  // > The 🔗 icon in the channel name means the channel is linked with IRC.
  // > Users on IRC cannot see when you Reply to their message, or any custom emojis.

  const message = stripIndents`
    **Welcome to the TripSit Discord!**
    > TripSit has always been a bit...different.
    > Our discord is no exception: Even if you've been using discord for years please take a moment to read the info here.
    > The information on this page can help you understand some of the intricaces of this guild!
    > **This guild is under active development and may make changes at any time!**

    **Remember: If you need help, join the ${channelTripsit} room and click the "I need assistance" button**
    > This will create a new thread for you to talk with people who want to help you =)

    **By chatting here you agree to abide the ${channelRules}**
    > Many of our users are currently on a substance and appreciate a more gentle chat.
    > We want this place to be inclusive and welcoming, if there is anything disrupting your stay here:
    ***1*** Use the /report interface to report someone to the mod team! Also use Right Click > Apps > Report!
    ***2*** Mention the @moderators to get attention from the mod team!
    ***3*** Message TripBot and click the "I have a discord issue" button to start a thread with the team!

    **We have our own custom bot!**
    > Go crazy in ${channelBotspam} exploring the bot commands!
    `;

  await (interaction.channel as TextChannel).send(message);
}

/**
 * The mindset prompt
 * @param {Interaction} interaction The interaction that triggered this
 */
export async function mindsets(interaction:ChatInputCommandInteraction) {
  startLog(PREFIX, interaction);
  if (!(interaction.channel as TextChannel)) {
    log.error(`${PREFIX} how to tripsit: no channel`);
    interaction.reply(channelOnly);
    return;
  }

  const mindsetEmbed = embedTemplate()
    .setDescription(stripIndents`
      **React to this message to show your mindset!**

      ${env.EMOJI_DRUNK} - Drunk
      ${env.EMOJI_HIGH} - High
      ${env.EMOJI_ROLLING} - Rolling
      ${env.EMOJI_TRIPPING} - Tripping
      ${env.EMOJI_DISSOCIATING} - Dissociating
      ${env.EMOJI_STIMMING} - Stimming
      ${env.EMOJI_SEDATED} - Sedated
      ${env.EMOJI_TALKATIVE} - I'm just happy to chat!
      ${env.EMOJI_WORKING} - I'm busy and may be slow to respond!

      *You may have more than one mindset, please pick the main one!*
    `)
    .setFooter({ text: 'These roles reset after 8 hours to (somewhat) accurately show your mindset!' })
    .setColor(Colors.Purple);
  let reactionRoleInfo = [] as {
    guild_id: string;
    channel_id: string;
    message_id: string;
    reaction_id: string;
    role_id: string;
  }[];

  await (interaction.channel as TextChannel).send({ embeds: [mindsetEmbed] })
    .then(async msg => {
      await msg.react(`${env.EMOJI_DRUNK}`);
      await msg.react(`${env.EMOJI_HIGH}`);
      await msg.react(`${env.EMOJI_ROLLING}`);
      await msg.react(`${env.EMOJI_TRIPPING}`);
      await msg.react(`${env.EMOJI_DISSOCIATING}`);
      await msg.react(`${env.EMOJI_STIMMING}`);
      await msg.react(`${env.EMOJI_SEDATED}`);
      // await msg.react(`${env.EMOJI_SOBER}`);
      await msg.react(`${env.EMOJI_TALKATIVE}`);
      await msg.react(`${env.EMOJI_WORKING}`);
      reactionRoleInfo = [
        {
          guild_id: msg.channel.guild.id,
          channel_id: msg.channel.id,
          message_id: msg.id,
          reaction_id: env.EMOJI_DRUNK.slice(env.EMOJI_DRUNK.indexOf(':', 3) + 1, env.EMOJI_DRUNK.indexOf('>')),
          role_id: env.ROLE_DRUNK,
        },
        {
          guild_id: msg.channel.guild.id,
          channel_id: msg.channel.id,
          message_id: msg.id,
          reaction_id: env.EMOJI_HIGH.slice(env.EMOJI_HIGH.indexOf(':', 3) + 1, env.EMOJI_HIGH.indexOf('>')),
          role_id: env.ROLE_HIGH,
        },
        {
          guild_id: msg.channel.guild.id,
          channel_id: msg.channel.id,
          message_id: msg.id,
          reaction_id: env.EMOJI_ROLLING.slice(env.EMOJI_ROLLING.indexOf(':', 3) + 1, env.EMOJI_ROLLING.indexOf('>')),
          role_id: env.ROLE_ROLLING,
        },
        {
          guild_id: msg.channel.guild.id,
          channel_id: msg.channel.id,
          message_id: msg.id,
          reaction_id: env.EMOJI_TRIPPING.slice(env.EMOJI_TRIPPING.indexOf(':', 3) + 1, env.EMOJI_TRIPPING.indexOf('>')),
          role_id: env.ROLE_TRIPPING,
        },
        {
          guild_id: msg.channel.guild.id,
          channel_id: msg.channel.id,
          message_id: msg.id,
          reaction_id: env.EMOJI_DISSOCIATING.slice(env.EMOJI_DISSOCIATING.indexOf(':', 3) + 1, env.EMOJI_DISSOCIATING.indexOf('>')),
          role_id: env.ROLE_DISSOCIATING,
        },
        {
          guild_id: msg.channel.guild.id,
          channel_id: msg.channel.id,
          message_id: msg.id,
          reaction_id: env.EMOJI_STIMMING.slice(env.EMOJI_STIMMING.indexOf(':', 3) + 1, env.EMOJI_STIMMING.indexOf('>')),
          role_id: env.ROLE_STIMMING,
        },
        {
          guild_id: msg.channel.guild.id,
          channel_id: msg.channel.id,
          message_id: msg.id,
          reaction_id: env.EMOJI_SEDATED.slice(env.EMOJI_SEDATED.indexOf(':', 3) + 1, env.EMOJI_SEDATED.indexOf('>')),
          role_id: env.ROLE_NODDING,
        },
        {
          guild_id: msg.channel.guild.id,
          channel_id: msg.channel.id,
          message_id: msg.id,
          reaction_id: env.EMOJI_TALKATIVE.slice(env.EMOJI_TALKATIVE.indexOf(':', 3) + 1, env.EMOJI_TALKATIVE.indexOf('>')),
          role_id: env.ROLE_TALKATIVE,
        },
        {
          guild_id: msg.channel.guild.id,
          channel_id: msg.channel.id,
          message_id: msg.id,
          reaction_id: env.EMOJI_WORKING.slice(env.EMOJI_WORKING.indexOf(':', 3) + 1, env.EMOJI_WORKING.indexOf('>')),
          role_id: env.ROLE_WORKING,
        },
      ];

      // Update the database
      await db<ReactionRoles>('reaction_roles')
        .insert(reactionRoleInfo)
        .onConflict(['role_id', 'reaction_id'])
        .merge();
    });
}

/**
 * The colors prompt
 * @param {Interaction} interaction The interaction that triggered this
 */
export async function colors(interaction:ChatInputCommandInteraction) {
  startLog(PREFIX, interaction);
  if (!(interaction.channel as TextChannel)) {
    log.error(`${PREFIX} how to tripsit: no channel`);
    interaction.reply(channelOnly);
    return;
  }

  let reactionRoleInfo = [] as {
    guild_id: string;
    channel_id: string;
    message_id: string;
    reaction_id: string;
    role_id: string;
  }[];

  const colorEmbed = embedTemplate()
    .setDescription('React to this message to set the color of your nickname!')
    .setFooter({ text: 'You can only pick one color at a time!' })
    .setColor(Colors.Blue);

  await (interaction.channel as TextChannel).send({ embeds: [colorEmbed] })
    .then(async msg => {
      await msg.react('❤');
      await msg.react('🧡');
      await msg.react('💛');
      await msg.react('💚');
      await msg.react('💙');
      await msg.react('💜');
      await msg.react(env.EMOJI_PINKHEART);
      await msg.react('🖤');
      await msg.react('🤍');
      reactionRoleInfo = [
        {
          guild_id: msg.channel.guild.id,
          channel_id: msg.channel.id,
          message_id: msg.id,
          reaction_id: '❤',
          role_id: env.ROLE_RED,
        },
        {
          guild_id: msg.channel.guild.id,
          channel_id: msg.channel.id,
          message_id: msg.id,
          reaction_id: '🧡',
          role_id: env.ROLE_ORANGE,
        },
        {
          guild_id: msg.channel.guild.id,
          channel_id: msg.channel.id,
          message_id: msg.id,
          reaction_id: '💛',
          role_id: env.ROLE_YELLOW,
        },
        {
          guild_id: msg.channel.guild.id,
          channel_id: msg.channel.id,
          message_id: msg.id,
          reaction_id: '💚',
          role_id: env.ROLE_GREEN,
        },
        {
          guild_id: msg.channel.guild.id,
          channel_id: msg.channel.id,
          message_id: msg.id,
          reaction_id: '💙',
          role_id: env.ROLE_BLUE,
        },
        {
          guild_id: msg.channel.guild.id,
          channel_id: msg.channel.id,
          message_id: msg.id,
          reaction_id: '💜',
          role_id: env.ROLE_PURPLE,
        },
        {
          guild_id: msg.channel.guild.id,
          channel_id: msg.channel.id,
          message_id: msg.id,
          reaction_id: env.EMOJI_PINKHEART.slice(env.EMOJI_PINKHEART.indexOf(':', 3) + 1, env.EMOJI_PINKHEART.indexOf('>')),
          role_id: env.ROLE_PINK,
        },
        {
          guild_id: msg.channel.guild.id,
          channel_id: msg.channel.id,
          message_id: msg.id,
          reaction_id: '🖤',
          role_id: env.ROLE_BLACK,
        },
        {
          guild_id: msg.channel.guild.id,
          channel_id: msg.channel.id,
          message_id: msg.id,
          reaction_id: '🤍',
          role_id: env.ROLE_WHITE,
        },
      ];

      // Update the database
      await db<ReactionRoles>('reaction_roles')
        .insert(reactionRoleInfo)
        .onConflict(['role_id', 'reaction_id'])
        .merge();
    });
}

const roleQuestion = 'What role are people applying for?';
const reviewerQuestion = 'What role reviews those applications?';
/**
 * This command populates various channels with static prompts
 * This is actually kind of complicated, but not really, let me explain:
 * Each prompt generally allows a response from the user, like giving a role or sending a message
 * @param {Interaction} interaction The interaction that triggered this
 */
export const prompt: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Set up various channels and prompts!')
    .addSubcommand(subcommand => subcommand
      .setDescription('Tripsit info!')
      .setName('tripsit')
      .addRoleOption(option => option
        .setDescription('What is your Tripsitter role?')
        .setName('tripsitter')
        .setRequired(true))
      .addRoleOption(option => option
        .setDescription('What is your Needshelp role?')
        .setName('needshelp')
        .setRequired(true))
      .addChannelOption(option => option
        .setDescription('What is your Meta-tripsit channel?')
        .setName('metatripsit')
        .setRequired(true))
      // .addChannelOption((option) => option
      //   .setDescription('Do you have a sanctuary room?')
      //   .setName('sanctuary'),
      // )
      // .addChannelOption((option) => option
      //   .setDescription('Do you have a general room?')
      //   .setName('general'),
      // )
      .addRoleOption(option => option
        .setDescription('What is your Helper role?')
        .setName('helper')))
    .addSubcommand(subcommand => subcommand
      .setDescription('Set up the application page. 5 roles max!')
      .setName('applications')
      .addChannelOption(option => option
        .setDescription('What channel stores applications?')
        .setName('applications_channel')
        .setRequired(true))
      .addRoleOption(option => option
        .setDescription(roleQuestion)
        .setName('application_role_a')
        .setRequired(true))
      .addRoleOption(option => option
        .setDescription(reviewerQuestion)
        .setName('application_reviewer_a')
        .setRequired(true))
      .addRoleOption(option => option
        .setDescription(roleQuestion)
        .setName('application_role_b'))
      .addRoleOption(option => option
        .setDescription(reviewerQuestion)
        .setName('application_reviewer_b'))
      .addRoleOption(option => option
        .setDescription(roleQuestion)
        .setName('application_role_c'))
      .addRoleOption(option => option
        .setDescription(reviewerQuestion)
        .setName('application_reviewer_c'))
      .addRoleOption(option => option
        .setDescription(roleQuestion)
        .setName('application_role_d'))
      .addRoleOption(option => option
        .setDescription(reviewerQuestion)
        .setName('application_reviewer_d'))
      .addRoleOption(option => option
        .setDescription(roleQuestion)
        .setName('application_role_e'))
      .addRoleOption(option => option
        .setDescription(reviewerQuestion)
        .setName('application_reviewer_e')))
    .addSubcommand(subcommand => subcommand
      .setDescription('techhelp info!')
      .setName('techhelp')
      .addRoleOption(option => option
        .setDescription('What role responds to tickets here?')
        .setName('roletechreviewer')
        .setRequired(true))
      .addChannelOption(option => option
        .setDescription('Do you have a tripsit room?')
        .setName('tripsit')))
    .addSubcommand(subcommand => subcommand
      .setDescription('rules info!')
      .setName('rules'))
    .addSubcommand(subcommand => subcommand
      .setDescription('starthere info!')
      .setName('starthere'))
    .addSubcommand(subcommand => subcommand
      .setDescription('mindset reaction roles!')
      .setName('mindset'))
    .addSubcommand(subcommand => subcommand
      .setDescription('color reaction roles')
      .setName('color'))
    .addSubcommand(subcommand => subcommand
      .setDescription('ticketbooth info!')
      .setName('ticketbooth')),
  async execute(interaction:ChatInputCommandInteraction) {
    startLog(PREFIX, interaction);
    // await interaction.deferReply({ephemeral: true});
    const command = interaction.options.getSubcommand();
    if (command === 'applications') {
      await applications(interaction);
    } else if (command === 'techhelp') {
      await techhelp(interaction);
    } else if (command === 'rules') {
      await rules(interaction);
    } else if (command === 'starthere') {
      await starthere(interaction);
    } else if (command === 'mindset') {
      await mindsets(interaction);
    } else if (command === 'color') {
      await colors(interaction);
    } else if (command === 'tripsit') {
      await tripsit(interaction);
    } else if (command === 'ticketbooth') {
      await ticketbooth(interaction);
    }
    // await interaction.editReply('Donezo!');
    return true;
  },
};
