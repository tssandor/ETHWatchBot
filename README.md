# ETHWatchBot

Simple Telegram bot to monitor Ethereum addresses. The bot is available @ETHWatchBot.

Commands:
* /start - displays a greeting
* /watch <address> - start monitoring an address

The bot is using the [Ethplorer API](https://github.com/EverexIO/Ethplorer/wiki/Ethplorer-API). In order to avoid service abuse it checks the addresses every 5 minutes.

## To-do

This current version is a very barebone MVP, and there's a lot more to do:
- [ ] Porting it to Web3.js so the API limitations don't apply.
- [ ] Implementing a database, so the watchlist is not dropped every time the bot is restarted.
- [x] Implementing a /forget command

# License 

Released under CC-BY.