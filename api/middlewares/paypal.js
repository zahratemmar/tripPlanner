
import dotenv from 'dotenv';



dotenv.config();
const clientId  = process.env.PAYPAL_CLIENT_ID
const clientSecret  = process.env.PAYPAL_SECRET






const getAccessToken = async () => {
  const response = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  const data = await response.json();
  return data.access_token;
};









export const sendBatchPayouts = async (recipients) => {
  const accessToken = await getAccessToken();

  const payoutBody = {
    sender_batch_header: {
      sender_batch_id: `batch_${Date.now()}`,
      email_subject: "You have a payout!",
      email_message: "You've received a payout from triply!"
    },
    items: recipients.map((recipient, index) => ({
      recipient_type: "EMAIL",
      amount: {
        value: recipient.amount,
        currency: recipient.currency || "USD"
      },
      note: "Thank you for offering your services at triply !", 
      sender_item_id: `item_${index + 1}`,
      receiver: recipient.bankUrl
    }))
  };

  const response = await fetch('https://api-m.sandbox.paypal.com/v1/payments/payouts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify(payoutBody)
  });

  const result = await response.json();
  console.log(result);
};









export async function getPayoutStatus(payoutBatchId) {
  const accessToken = await getAccessToken();

  const response = await fetch(`https://api-m.sandbox.paypal.com/v1/payments/payouts/${payoutBatchId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  console.log(data);
  return data;
}


const recipients = [
  { email: "sb-aqtyi40092354@personal.example.com", amount: "5.00" },
  { email: "sb-daij540288197@personal.example.com", amount: "9.00" }
]



//sendBatchPayout(recipients);
//getPayoutStatus('DURBNMCJQBU6U')