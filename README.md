# SillyTavern-1.8.4-fix

This is a patched version of SillyTavern 1.8.4 which adds support for Poe and FlowGPT using Puppeteer.
It can be used the same way as SillyTavern 1.8.4. Just input your p-b cookie, the path to chromium on your device and have a blast!

If you want to use it with the latest version of SillyTavern, please check out [The amazing work done by LegendPoet](https://github.com/LegendPoet/SillyTavern-fix)

# Instructions

IMPORTANT!!!
Before moving further, please disable "Try to open links in app" in Poe settings (poe.com/settings). Alternatively, just conect 2 times in a row. This must be done only once for each account.

If you want to use multiple cookies for bypassing 100 message limit, please write them separated by a comma in connection settings, i.e. where you'd input your cookie usually.


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
For getting it to work any other operating system, please contact me!

## Known issues
- On Windows, sometimes it's necessary to put the browser into non-headless mode.
- Performance depends somewhat on the device, currently averaging 6 seconds on PC and 12 seconds on android
- On mobile, streaming and adding a bot is hit-or-miss, as some messages fail to get sent, causing all kinds of issues. Until a fix is found, I advice sticking to non-streaming on mobile, although it can still work.

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

## Contact
Please drop me a message on [Matrix](https://matrix.to/#/@glizzychief:techsaviours.org) or Discord (glizzychief#1048) if you have any questions or just want to say hi.

## Credits and shoutouts
All credits go to the SillyTavern team, and Shoutouts to LegendPoet and vfnm here at github, as well as the ITSNOTPOEVER project!
Additional shoutouts to LegendPoet and Hakon for all the support they've given so far!
