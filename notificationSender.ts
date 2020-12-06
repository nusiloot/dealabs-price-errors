import axios from 'axios';
import { discordWebhook, telegramToken, telegramChatId, slackWebhook } from './config.json';

interface ChannelWebhook {
  type: 'slack' | 'discord';
  url: string;
}

interface ChannelDiscord {
  type: 'telegram';
  token: string;
  id: string;
}

type Channel = ChannelWebhook | ChannelDiscord;

const channels: Channel[] = [{
  type: 'discord',
  url: discordWebhook,
}, {
  type: 'slack',
  url: slackWebhook,
}, {
  type: 'telegram',
  token: telegramToken,
  id: telegramChatId,
}];

export const sendNotification = async ({ commentText, dealLinks, commentLink }: { commentText: string, dealLinks?: any, commentLink?: string }) => {
  const output = (commentLink && dealLinks)
    ? `${commentText}\n\n${dealLinks.join('\n')}\n\n${commentLink}`
    : commentText;

  const notificationsList = channels.map((channel) => {
    switch (channel.type) {
      case 'discord':
        return channel.url && axios.post(channel.url, {
          username: 'Dealabs Price Error',
          avatar_url: 'https://www.dealabs.com/favicon.ico',
          content: output,
        });
      case 'telegram':
        return channel.id && channel.token && axios.get(
          `https://api.telegram.org/bot${channel.token}/sendMessage?chat_id=${channel.id}&parse_mode=markdown&text=${escape(
            output,
          )}`,
        );
      case 'slack':
        return channel.url && axios.post(channel.url, {
          text: dealLinks ? `<!channel> ${output}` : output,
        });
      default:
        return null;
    }
  });

  return Promise.all(notificationsList);
};
