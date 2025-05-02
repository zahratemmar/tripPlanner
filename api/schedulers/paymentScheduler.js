// /schedulers/tripScheduler.js
import cron from 'node-cron';
import {launchVerification} from "../services/nodeServices.js"



cron.schedule('0 0 * * *', async () => {
  console.log('running payment verification at', new Date());
  try {
    launchVerification()
  } catch (error) {
    console.error('error during payment verification:', error);
  }
});
