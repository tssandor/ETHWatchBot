# ETHWatchBot

Simple Telegram bot to monitor Ethereum addresses. The bot is available @ETHWatchBot.

Commands:
* /start - displays a greeting
* /watch (address) - starts monitoring an address
* /forget (address) - stops monitoring an address
* /list - lists the currently monitored addresses

The bot is using the [Etherscan API](https://etherscan.io/apis). In order to avoid service abuse it checks the addresses every 1 minute. It stops watching an address after 24 hours.

## To-do

This current version is a very barebone MVP, and there's a lot more to do:
- [x] ~~Porting it to Web3.js so the API limitations don't apply.~~ Turned out watching an address with Web3.js is a pain.
- [x] Moved from Ethplorer to Etherscan, as it has more generous API limits.
- [ ] Implementing a database, so the watchlist is not dropped every time the bot is restarted.
- [x] Implementing a /forget command.

# License 

Released under CC-BY.