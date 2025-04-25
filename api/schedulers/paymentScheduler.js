// /schedulers/tripScheduler.js
import cron from 'node-cron';

cron.schedule('0 0 * * *', async () => {
  console.log('running payment verification at', new Date());
  try {
    //code to do
  } catch (error) {
    console.error('error during scheduled task:', error);
  }
});
