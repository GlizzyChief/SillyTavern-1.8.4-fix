# SillyTavern-1.8.4-fix

This is a patched version of SillyTavern 1.8.4 which adds support for Poe using Puppeteer.
It can be used the same way as SillyTavern 1.8.4. Just input your p-b cookie, the path to chromium on your device and have a blast!

# Instructions

NOTE: Please select ChatPGT as the model. Choosing Assistant automatically switches to ChatGPT, but still please do so manually.

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
If you've installed Chrome properly, i.e. using the official installer, then just run start.bat.

## Other OSes
For getting it to work any other operating system, please contact me!

## Known issues
- If `Expired token!` error is thrown out, and in the terminal `Poe failed to authenticate with the provided cookie - logout modal appeared out of nowhere!` is logged, simply connect again.
- On Windows, sometimes it's necessary to put the browser into non-headless mode.
- Performance depends somewhat on the device, currently averaging 6 seconds on PC and 12 seconds on android

## Recent fixes
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

## Contact
Please drop me a message on [Matrix](https://matrix.to/#/@glizzychief:catgirl.cloud) or Discord (glizzychief#1048) if you have any questions or just want to say hi.

## Credits
All credits go to the SillyTavern team and vfnm here at github, as well as the ITSNOTPOEVER project!
