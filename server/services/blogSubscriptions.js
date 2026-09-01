// Notifies confirmed subscribers when a post in their subscribed category
// goes from draft to published - called once, from the single place a post's
// status changes (see createOrUpdatePost in routes/admin.js).
const Subscriber = require('../models/Subscriber');
const { sendNewPostNotification } = require('./mailer');

async function notifySubscribers(post) {
  const subscribers = await Subscriber.find({ status: 'confirmed', categories: post.category }).lean();

  for (const sub of subscribers) {
    const unsubscribeUrl = `https://humankindmovement.in/blog/subscribe/unsubscribe/${sub.unsubscribeToken}`;
    sendNewPostNotification({ to: sub.email, post, unsubscribeUrl }).catch((err) => {
      console.error(`sendNewPostNotification failed for ${sub.email}:`, err.message);
    });
  }
}

module.exports = { notifySubscribers };
