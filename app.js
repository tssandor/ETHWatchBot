// TO DO
// 1. IMPLEMENT A DB SO IT WON'T DROP THE WATCHLIST IF IT'S RESTARTED

const TelegramBot = require('node-telegram-bot-api');
const cron = require("node-cron");
var etherscan = require('etherscan-api').init(process.env.ETHERSCAN_KEY);

const telegramBotToken = process.env.TOKEN;
const bot = new TelegramBot(telegramBotToken, {polling: true});
const botOwner = process.env.BOTOWNER;

// Class to store addresses, previous balances and the Telegram chatID
class WatchEntry {
    constructor(chatID, ETHaddress, currentBalance, timeAddedToWatchlist) {
        this.chatID = chatID;
        this.ETHaddress = ETHaddress;
        this.currentBalance = currentBalance;
        this.timeAddedToWatchlist = timeAddedToWatchlist;
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
    if (msg.text === '/watch') {
        bot.sendMessage(chatId, 'You need to specify an address.\nType /watch followed by a valid ETH address like this:\n<code>/watch 0xB91986a9854be250aC681f6737836945D7afF6Fa</code>' ,{parse_mode : "HTML"});
    }
    if (msg.text === "/forget") {
        bot.sendMessage(chatId, 'You need to specify an address.\nType /forget followed by an address you are watching currently, like this:\n<code>/forget 0xB91986a9854be250aC681f6737836945D7afF6Fa</code>' ,{parse_mode : "HTML"});
    }
});

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "***************\n\nHey there! I am a Telegram bot by @torsten1.\n\nI am here to watch Ethereum addresses. I will ping you if there's a change in balance. This is useful if you've just sent a transaction and want to be notified when it arrives. Due to API limitations, I can watch an address for no more than 24 hours.\n\n<b>Commands</b>\n\n* <code>/watch (address)</code> - start watching an address.\n* <code>/forget (address)</code> - stop watching an address.\n* <code>/list</code> - list the addresses you are watching.\n\nHave fun :)" ,{parse_mode : "HTML"});
});

bot.onText(/\/watch (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const ETHaddress = match[1];
    if (isAddress(ETHaddress)) {
        var balance = etherscan.account.balance(ETHaddress);
        balance.then(function(balanceData){
            var date = new Date();
            var timestamp = date.getTime();
            const newEntry = new WatchEntry(chatId, ETHaddress, balanceData.result, timestamp);
            console.log(`New entry added with the data:\n${chatId}\n${ETHaddress}\n${balanceData.result}\n${timestamp}`);
            watchDB.push(newEntry);
            var balanceToDisplay = balanceData.result / 1000000000000000000;
            balanceToDisplay = balanceToDisplay.toFixed(4);
            bot.sendMessage(chatId, `Started watching the address ${ETHaddress}\nIt currently has ${balanceToDisplay} ETH.`);
            // Debug admin message for the bot owner
            bot.sendMessage(botOwner, `--> ADMIN MESSAGE\nSomeone started watching the address\n${ETHaddress}\n`);
        });
    } else {
        bot.sendMessage(chatId, "This is not a valid ETH address.\nType /watch followed by a valid ETH address like this:\n<code>/watch 0xB91986a9854be250aC681f6737836945D7afF6Fa</code>" ,{parse_mode : "HTML"});
        // Debug admin message for the bot owner
        bot.sendMessage(botOwner, `--> ADMIN MESSAGE\nSomeone tried to watch an invalid address\n${ETHaddress}\n`);

    }
});

bot.onText(/\/forget (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const ETHaddress = match[1];
    var newWatchDB = [];
    var nothingToForget = true;
    watchDB.forEach(function(entry) {
        if ((entry.chatID === chatId) && (entry.ETHaddress === ETHaddress)) {
            bot.sendMessage(chatId, `I stopped monitoring the address ${entry.ETHaddress}.`);
            // Debug admin message for the bot owner
            bot.sendMessage(botOwner, `--> ADMIN MESSAGE\nSomeone stopped watching the address\n${ETHaddress}\n`);
            nothingToForget = false;    
        } else {
            newWatchDB.push(entry);
        }
    });
    if (nothingToForget) {
        bot.sendMessage(chatId, `I couldn't find the address ${ETHaddress} on the watchlist.`);
        // Debug admin message for the bot owner
        bot.sendMessage(botOwner, `--> ADMIN MESSAGE\nSomeone tried to remove this non-existing address from watchlist:\n${ETHaddress}\n`);
    }
    watchDB = newWatchDB;
});

bot.onText(/\/list/, (msg) => {
    const chatId = msg.chat.id;
    var nothingToList = true;
    var listOfAddresses = '';
    watchDB.forEach(function(entry) {
        if (entry.chatID === chatId) {
            nothingToList = false;
            listOfAddresses = listOfAddresses + `* ${entry.ETHaddress}\n`;    
        }
    });
    if (nothingToList) {
        bot.sendMessage(chatId, `There are no addresses on your watchlist. Maybe time to add some!`);    
    } else {
        bot.sendMessage(chatId, 'You are currently monitoring\n' + listOfAddresses);
    }
});

bot.onText(/\/check/, (msg) => {
    // To manually trigger a check. For testing purposes.
    checkAllAddresses();
    // Debug admin message for the bot owner
    bot.sendMessage(botOwner, `--> ADMIN MESSAGE\nSomeone called the /check function.`);
});

async function checkAllAddresses() {
    var debugNumberOfAlertsDelivered = 0;
    var newWatchDB = [];
    // using the for i structure because it's async
    for (var i = 0; i < watchDB.length; i++) {
        var entry = watchDB[i];
        // we check if the balance has changed
        const balance = await etherscan.account.balance(entry.ETHaddress);
        console.log(`\nComparing Etherscan balance of ${balance.result} with DB entry ${entry.currentBalance}`);
        if (balance.result === entry.currentBalance) {
            // no transfer
        } else {
            // there was a transfer
            var difference = (balance.result - entry.currentBalance) / 1000000000000000000;
            difference = difference.toFixed(4);
            var balanceToDisplay = balance.result / 1000000000000000000;
            balanceToDisplay = balanceToDisplay.toFixed(4);
            if (difference > 0) {
                //incoming transfer
                bot.sendMessage(entry.chatID, `I see incoming funds!\n\n${difference} ETH arrived to the address ${entry.ETHaddress} since I've last checked.\nCurrent balance is ${balanceToDisplay} ETH.`);    
            } else {
                //outgoing transfer
                bot.sendMessage(entry.chatID, `Funds are flying out!\n\n${difference} ETH left the address ${entry.ETHaddress} since I've last checked.\nCurrent balance is ${balanceToDisplay} ETH.`);    
            }
            // debug
            debugNumberOfAlertsDelivered = debugNumberOfAlertsDelivered + 1;
        }
        // if the entry is too old, we get rid of it
        var date = new Date();
        var now = date.getTime();
        if ((entry.timeAddedToWatchlist + (24*60000*60)) > now) {
            //has been added less than 24h ago
            const newEntry = new WatchEntry(entry.chatID, entry.ETHaddress, balance.result, entry.timeAddedToWatchlist);
            newWatchDB.push(newEntry);
        } else {
            bot.sendMessage(entry.chatID, `Due to API limitations, I can only watch an address for 24 hours.\n\nYou asked me to watch ${entry.ETHaddress} quite some time ago, so I dropped it from my list. Sorry about it!`);
        }
    }
    watchDB = newWatchDB;
    // Debug admin message for the bot owner
    if (debugNumberOfAlertsDelivered > 0) {
        bot.sendMessage(botOwner, `--> ADMIN MESSAGE\nNumber of notifications delivered: ${debugNumberOfAlertsDelivered}`);
        debugNumberOfAlertsDelivered = 0;
    }
}

bot.on('polling_error', (error) => {
    console.log(error.message);  // => 'EFATAL'
});

// do the scan every minute
cron.schedule('*/1 * * * *', () => {
    checkAllAddresses();
});
