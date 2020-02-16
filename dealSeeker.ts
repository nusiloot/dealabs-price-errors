import axios from 'axios';
import * as cheerio from 'cheerio';
const { discordWebhook, telegramToken, telegramChatId, intervalBase } = require('./config');

export class DealSeeker {
  baseUrl;
  interval = 1;
  lastPageUrl = '';
  cache = {};

  constructor(baseUrl: string, interval = intervalBase) {
    this.baseUrl = baseUrl;
    this.interval = interval;
    this.runner();
  }

  sendNotification = async ({ commentText, dealLinks, commentLink }) => {
    const output = `${commentText}\n\n${dealLinks.join('\n')}\n\n${commentLink}`;

    if (discordWebhook && discordWebhook !== '') {
      await axios.post(discordWebhook, {
        username: 'Dealabs Price Error',
        avatar_url: 'https://www.dealabs.com/favicon.ico',
        content: output,
      });
    }

    if (telegramToken && telegramToken !== '' && telegramChatId && telegramChatId !== '') {
      await axios.get(
        `https://api.telegram.org/bot${telegramToken}/sendMessage?chat_id=${telegramChatId}&parse_mode=markdown&text=${escape(
          output,
        )}`,
      );
    }
  };

  fetchNewComments = async (firstTime = false) => {
    console.log('Fetching page');
    const lastComments = await axios.get(this.lastPageUrl);

    const $ = cheerio.load(lastComments.data);
    const nextPageElement = $('a.pagination-next');

    if (nextPageElement.length > 0) {
      this.lastPageUrl = nextPageElement.attr('href');
      console.log('New page detected: ' + this.lastPageUrl);

      return this.fetchNewComments();
    }

    $('.comments-list-item').each((_index, element) => {
      const comment = $(element);

      if (comment.attr('id') in this.cache) {
        return;
      }

      const commentBody = comment.find('.comment-body .userHtml-content');
      const commentText = commentBody.text();
      const dealLinks = commentBody
        .find('a')
        .map((_index, element) => {
          return $(element).attr('title');
        })
        .get();
      const commentLink = JSON.parse(
        comment
          .find('.comment-footer button')
          .last()
          .attr('data-popover'),
      ).tplData.url;

      this.cache[comment.attr('id')] = commentText;

      if (firstTime) {
        return;
      }

      console.log(`Sending notification for comment ${comment.attr('id')}`);
      this.sendNotification({ commentText, dealLinks, commentLink }).catch((error) => {
        console.error(error);
      });
    });
  };

  runner = async () => {
    const topicPage = await axios.get(this.baseUrl);

    const $ = cheerio.load(topicPage.data);
    this.lastPageUrl = $('a.cept-last-page').attr('href');

    if (!this.lastPageUrl) {
      console.error('lastPage not found');
      process.exit(1);
    }

    this.fetchNewComments(true).catch((error) => {
      console.error(error);
    });

    setInterval(() => {
      this.fetchNewComments().catch((error) => {
        console.error(error);
      });
    }, this.interval * 1000);
  };
}
