require('dotenv').config();
require('sugar-date').extend();
const https = require('https');
const client = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_AUTH);

const baseUrl = `https://www.recreation.gov/api/permits/${process.env.PERMIT_ID}/availability/month`;
const fromNumber = process.env.FROM_NUMBER;
const toNumbers = process.env.TO_NUMBERS.split(',');
const startMonth = parseInt(process.env.START_MONTH);
const numMonths = parseInt(process.env.NUM_MONTHS);
const checkInterval = parseInt(process.env.CHECK_INTERVAL)

let lastHash = null;
setInterval(async () => {
  // only run check during active months
  let currentMonth = new Date().getMonth() + 1;
  if(!(startMonth >= currentMonth && startMonth + numMonths <= currentMonth + numMonths)) { return; }

  // build and query each month in active months
  let availableDates = [];
  for (let m = startMonth; m < startMonth + numMonths; m++) {
    let response = await checkAvailability(`${baseUrl}?start_date=2019-${m.toString().padStart(2, '0')}-01T00:00:00.000Z`);
    availableDates = availableDates.concat(response);
  }

  // if the availability has changed since last check,
  // format the text message
  let currentHash = hash(JSON.stringify(availableDates));
  if (currentHash !== lastHash && availableDates.length > 0) {
    let textBody = 'MT ST HELENS AVAILABILITY ALERT\r\n\r\n';
    textBody += availableDates
      .map(d => (`${Date.create(d.date).addDays(1).format('{Weekday}, {Mon} {do}')} (${d.remaining} available)`))
      .join('\r\n');

    // loop through recipient numbers and send text via twilio
    toNumbers.forEach(number => {
      client.messages
        .create({ from: fromNumber, body: textBody, to: number })
        .then(
          message => console.log(message.sid)
        ).catch(e => {
          console.log(e);
        });
    });

    lastHash = currentHash;
  }
}, checkInterval);

async function checkAvailability(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, res => {
      let data = '';
      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        let availability = JSON.parse(data).payload.availability['999'].date_availability;
        let availableDates = [];

        for (let date in availability) {
          if (availability[date].remaining > 0) {
            availableDates.push({
              date: date,
              ...availability[date]
            });
          }
        }
        req.end();
        resolve(availableDates);
      });
    }).on('error', err => {
      console.log(err);
      reject(err);
      process.exit();
    });
  });
}

function hash(s) {
  return s.split("")
    .reduce(function (a, b) { 
      a = ((a << 5) - a) + b.charCodeAt(0); return a & a 
    }, 0);
}
