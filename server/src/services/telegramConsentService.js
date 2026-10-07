// Telegram update ids may reset after a long idle period: order by signed event date first.
// Require a strictly newer second than an API disable; never guess same-second consent order.
export function consentPredicate(update, event) {
  if (
    !Number.isSafeInteger(update?.update_id) ||
    update.update_id < 0 ||
    !Number.isSafeInteger(event?.date) ||
    event.date <= 0
  )
    return null;
  return {
    $and: [
      {
        $or: [
          { telegramConsentEventDate: null },
          { telegramConsentEventDate: { $lt: event.date } },
          {
            telegramConsentEventDate: event.date,
            telegramConsentEventId: { $lt: update.update_id }
          }
        ]
      },
      {
        $or: [
          { telegramNotificationsDisabledAt: null },
          {
            telegramNotificationsDisabledAt: {
              $lt: new Date(event.date * 1000)
            }
          }
        ]
      }
    ]
  };
}
export const consentMarker = (update, event) => ({
  telegramConsentEventDate: event.date,
  telegramConsentEventId: update.update_id
});
