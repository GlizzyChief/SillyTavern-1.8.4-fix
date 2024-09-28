# SillyTavern-1.8.4-fix

This is a patched version of SillyTavern 1.8.4 which adds support for Poe, FlowGPT, VelloAI and Mistral using Puppeteer.
It can be used the same way as SillyTavern 1.8.4. Just input your p-b cookie (and p-lat cookie optionally), the path to chromium on your device and have a blast!

If you want to use it with the latest version of SillyTavern, please check out [The amazing work done by LegendPoet](https://github.com/LegendPoet/SillyTavern-fix)

## IMPORTANT!!!
Poe has introduced a new cookie 'p-lat' the lack of which often breaks authentication. If you're having issues with connecting, please try adding both p-b and p-lat cookie in the format: p-b|p-lat and connecting. It's important to separate them only with a single | character.

Before moving further, please disable "Try to open links in app" in Poe settings (poe.com/settings). Alternatively, just conect 2 times in a row. This must be done only once for each account.

If you want to use multiple cookies for bypassing 100 message limit, please write them separated by a comma in connection settings, i.e. where you'd input your cookie usually.


# Instructions

## Android

If you've never ran SillyTavern, run:
- pkg install git
- pkg install nodejs

To install, run the following commands in Termux:
- pkg install x11-repo
- pkg install tur-repo
- pkg install chromium
- pkg install libexpat
- git clone https://github.com/GlizzyChief/SillyTavern-1.8.4-fix
- cd SillyTavern-1.8.4-fix
- Run ./start.sh

If start.sh causes issues, then please run:
- npm install
- node server.js


## Windows
For using on Windows, simply make sure to install chrome. ALTERNATIVELY, Chromium also works!
Then, download the project either as .zip or using git (same as above).
If you have Chrome installed anywhere othen than `C:\Windows\Program Files\Google\Chrome\chrome.exe` (the default path) open `src/poe-client.js` with Notepad, and on the first line replace `C:\Windows\Program Files\Google\Chrome\chrome.exe` with the path to your chrome.exe and simply run start.bat!
To get the path, right click on your chrome shortcut. Then, press "Open file location". Then, in the opened folder, find "chrome.exe", and, while holding shift, right click on it. In the opened menu, press "Copy path". MAKE SURE TO ADD EXTRA \ to all \ IN THE PATH!
!! If you've installed Chrome properly, i.e. using the official installer, then just run start.bat.

## OSX
It should work by default on OSX, but please reach out if you're having issues with that!

## Other OSes
For getting it to work on any other operating system, please contact me!

## In development
- Integration with paid Poe API
- Integration with prompt manager (for newer version)
- Work on author's notes, which crash after a yet uncertain threshold
- Fixing up the docker image & making it work with Puppeteer-based clients
- Integration with FlowGPT's image generating models

## Known issues
- On Windows, sometimes it's necessary to put the browser into non-headless mode
- Performance depends somewhat on the device, currently averaging 6 seconds on PC and 12 seconds on android
- On mobile, streaming and adding a bot is hit-or-miss, as some messages fail to get sent, causing all kinds of issues. Until a fix is found, I advice sticking to non-streaming on mobile, although it can still work
- Lately, Poe has been behaiving in a weird manner. Looks like general context windows for some bots have been decreased. Some bots still experience the reduced amount of available tokens
- FlowGPT randomly banning sessions. Logging out and in again resolves it.
- VelloAI client is still not tested fully due to its paid nature. Please report any issues or bugs!
- New FlowGPT client has some bugs, often caused by the site itself (e.g. chat not getting cleared and so on). Please report any errors you encounter!


## Recent fixes/features
- The bot now tries to connect multiple times before throwing out the expired API token error. This is made to alleviate the issue of Poe sometimes falsely marking the user as logged out, forcing the user to press Connect again
- Fixed issues with characters responding with '{'reply': 'some text'}'
- Fixed characters responding with unfinished messages or triple dots
- Fixed issues caused by Poe putting an ad modal when opening some bots
- Temporarily fixed issues with Assistant by simply using ChatGPT instead
- Fixed proper bot closing
- Fixed improper sending of chunked messages when using large context windows
- Bypassed Cloudflare's webdriver-driven headless browser detection
- Added failsafes for common issues
- Added default paths and slightly fixed message formatting
- Implemented streaming
- Restored functionality allowing to use custom bots
- Implemented JB-saving (message deleting)
- Bypassed Cloudflare's non-standard browser detection
- Implemented usage of several cookies at once
- Test fixes for streaming formatting and omitting User dialogue in responses
- Reduced reconnection speed to Poe API when refreshing browser tab to a few seconds (using the existing browser object)
- Slight QoL improvements and code cleanup
- Added ability to add a bot without leaving SillyTavern or even restarting/refreshing anything
- Added ability to specify message batch size when sending large messages
- Added ability to send messages as a file
- Fixed messages not getting split in batches properly (thanks a lot to manwith33 for pointing it out on Issues)
- Added FlowGPT support
- Fixed FlowGPT not working on mobile
- Fixed ST thinking that bot is not jailbroken when changing bots (Thanks to LegendPoet for figuring it out!)
- Fixed FlowGPT failing to load bots
- Reimplemented addBot function in Poe in hopes of getting it to work on mobile
- Fixed addBot function not working sometimes (Apparently due to a bug in Puppeteer itself: execution context gets deleted when reload is called)
- Fixed messages not getting split into chunks properly
- Increased Poe token length limit to accomodate for using multiple tokens at once
- Fixed the fix not working if system language is set to anything other than English. Apparently, Poe now ignores browser's navigator.languages setting, instead opting out for system languages set in the browser itself. To avoid messing with users' browsers, made it so language change happens in Poe itself.
- Refactored poe-client.js slightly to allow for quicker fixing if classnames change in the future
- Refactored flowgpt-client.js slightly to allow for quicker fixing if classnames or other selectors change in the future
- Fixed FlowGPT not connecting due to the recent design overhaul on their site
- Fixed bugs in poe-client's addBot function
- Added the ability to add a bot on FlowGPT without leaving SillyTavern
- Added a switch to manage whether a new chat should be started or current chat should be cleaned when purge chat is invoked
- Added a setting to regenerate a message right after sending (via edit) in FlowGPT to prevent messages from following a similiar style when regenerating (in ST)
- Slightly altered streaming logic to prevent last message from getting appended before the message that's being generated
- Added a setting to modify Fast Reply prompt sent to Poe when using message chunking
- Added a way to change message timeout settings. You can change the default timeout of 2 minutes by modifying config.conf
- Fixed Poe timing out randomly during connection (particularly on /settings)
- Fixed (turned off) message regenerating in FlowGPT. The site no longer provides the ability to do so
- Removed forced waiting for modal on flowgpt loading, which caused accounts that disabled modals to crash
- Added logging for detecting Cloudflare bans
- Fixed logged out detection
- Added a way for users running it in non-headless mode to authenticate manually. To do it, simply change poeWaitForAuth in config.conf.
- Fixed authentication not working
- Code cleanup & bug fixes for Poe integration
- Added VelloAI
- Added Mistral
- Cleaned up & simplified some of server-side logic for client initialization
- VelloAI bugfixes
- Added Google Auth for VelloAI (under testing) and some more bugfixes
- Completely revamped FlowGPT code as it moved to a new domain
- Added temperature and model selection to FlowGPT
- Fixed chat not scrolling in Poe, causing issues when generating and purging messages
- Changed authentication for Mistral to avoid having to deal with Captcha

## Contact
Please drop me a message on [Matrix](https://matrix.to/#/@glizzychief:techsaviours.org) or Discord (glizzychief#1048) if you have any questions or just want to say hi.

## Credits and shoutouts
All credits go to the SillyTavern team, and Shoutouts to LegendPoet and vfnm here at github, as well as the ITSNOTPOEVER project!
Additional shoutouts to LegendPoet and Hakon for all the support they've given so far!
