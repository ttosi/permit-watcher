## Recreation.gov permit availability checker
A small node.js that will query the recreation.gov API and determine if availibility for a chosen permit has changed and send a text message (via Twilio) to one more recipients.

### Installation
* Clone project to a server
* Copy and rename `.env.template` to `.env`
* Update the `.env` to your configuration
* Start the application as a process (I use [PM2](http://pm2.keymetrics.io/))

