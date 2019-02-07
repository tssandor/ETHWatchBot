// TO DO
// 1. PORT IT TO WEB3 SO API LIMITATIONS DON'T APPLY
// 2. IMPLEMENT A DB SO IT WON'T DROP THE WATCHLIST IF IT'S RESTARTED
// 3. IMPLEMENT /forget


const TelegramBot = require('node-telegram-bot-api');
const requestify = require('requestify');
const cron = require("node-cron");

// replace the value below with the Telegram token you receive from @BotFather
const token = process.env.TOKEN;

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {polling: true});

// Class to store addresses, previous balances and the Telegram chatID
class WatchEntry {
    constructor(chatID, ETHaddress, currentBalance, timeLastChecked) {
        this.chatID = chatID;
        this.ETHaddress = ETHaddress;
        this.currentBalance = currentBalance;
        this.timeLastChecked = timeLastChecked;
    }
}

// Array to store WatchEntry objects
var watchDB = [];

// Function to check if an address is a valid ETH address
var isAddress = function (address) {
    address = address.toLowerCase();
    if (!/^(0x)?[0-9a-f]{40}$/i.test(address)) {
        return false;
    } else if (/^(0x)?[0-9a-f]{40}$/.test(address) || /^(0x)?[0-9A-F]{40}$/.test(address)) {
        return true;
    } else {
        return false;
    }
};

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    if (msg.text === "/watch") {
        bot.sendMessage(chatId, "You need to specify an address.\nType /watch followed by a valid ETH address like this:\n<code>/watch 0xB91986a9854be250aC681f6737836945D7afF6Fa</code>" ,{parse_mode : "HTML"});
    } else {
        // bot.sendMessage(chatId, 'Received your message');
    }
});

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "***************\nHey there! I am a Telegram bot by @torsten1.\n\nI am here to watch Ethereum addresses. I will ping you if there's a change in balance. This is useful if you've just sent a transaction and want to be notified when it arrives. Due to API limitations, I can watch an address for no more than 1 hour.\n\nI only can handle one command at the moment, <code>/watch</code>.\n\nSimply type <code>/watch</code> followed by the Ethereum address you want to check!" ,{parse_mode : "HTML"});
    // bot.sendMessage(chatId, "Your chat ID is " + chatId ,{parse_mode : "HTML"});
})

bot.onText(/\/watch (.+)/, (msg, match) => {

    const chatId = msg.chat.id;
    const ETHaddress = match[1];

    if (isAddress(ETHaddress)) {
        const apiCall = 'http://api.ethplorer.io/getAddressInfo/' + ETHaddress + '?apiKey=freekey';
        requestify.get(apiCall)
        .then(function(response) {
            response.getBody();
            var responseJSON = JSON.parse(response.body);
            bot.sendMessage(chatId, responseJSON.ETH.balance);
            //add entry to the watchlist
            var date = new Date();
            var timestamp = date.getTime();
            const newEntry = new WatchEntry(chatId, ETHaddress, responseJSON.ETH.balance, timestamp);
            watchDB.push(newEntry);
        });
    } else {
        bot.sendMessage(chatId, "This is not a valid ETH address.\nType /watch followed by a valid ETH address like this:\n<code>/watch 0xB91986a9854be250aC681f6737836945D7afF6Fa</code>" ,{parse_mode : "HTML"});
    }
});

function checkAllAddresses() {

    var newWatchDB = [];

    watchDB.forEach(function(entry) {
        // we check if the balance has changed
        const apiCall = 'http://api.ethplorer.io/getAddressInfo/' + entry.ETHaddress + '?apiKey=freekey';
        requestify.get(apiCall)
        .then(function(response) {
            response.getBody();
            var responseJSON = JSON.parse(response.body);
            if (responseJSON.ETH.balance === entry.currentBalance) {
                // no transfer
            } else {
                // there was a transfer
                var difference = responseJSON.ETH.balance - entry.currentBalance;
                if (difference > 0) {
                    //incoming transfer
                    bot.sendMessage(entry.chatID, `I see incoming funds!\n\n${difference} ETH arrived to the address ${entry.ETHaddress} since I've last checked.`);    
                } else {
                    //outgoing transfer
                    bot.sendMessage(entry.chatID, `Funds are flying out!\n\n${difference} ETH left the address ${entry.ETHaddress} since I've last checked.`);    
                }
            }
        });

        // if the entry is too old, we get rid of it
        var date = new Date();
        var now = date.getTime();
        if ((entry.timeLastChecked + (60000*60)) > now) {
            //has been added less than an hour ago
            newWatchDB.push(entry);
        } else {
            bot.sendMessage(entry.chatID, `Due to API limitations, I can only watch an address for one hour.\n\nYou asked me to watch ${entry.ETHaddress} quite some time ago, so I dropped it from my list. Sorry about it!`);
        }
    });

    watchDB = newWatchDB;
}

bot.on('polling_error', (error) => {
    console.log(error.message);  // => 'EFATAL'
});

// do the scan every 5 minutes
cron.schedule('*/5 * * * *', () => {
    checkAllAddresses();
});
