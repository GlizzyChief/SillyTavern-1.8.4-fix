# SillyTavern-1.8.4-fix

This is a patched version of SillyTavern 1.8.4 which adds support for Poe using selenium webdriver.
It can be used the same way as SillyTavern 1.8.4. Just input your p-b cookie and have a blast!

# Instructions

NOTE: Please select ChatPGT as the model. Choosing Assistant automatically switches to ChatGPT, but still please do so manually.

## Android

If you've never ran SillyTavern, run:
- pkg install git
- pkg install nodejs

To install, run the following commands in Termux:
- pkg install x11-repo
- pkg install firefox
- pkg install geckodriver
- pkg install libexpat
- git clone https://github.com/GlizzyChief/SillyTavern-1.8.4-fix
- cd SillyTavern-1.8.4-fix
- ./start.sh

If start.sh causes issues, then please run:
- npm install
- node server.js


## Windows
For using on Windows, simply make sure to install firefox and geckodriver.
Then, download the project either as .zip or using git (same as above)
Afterwards, simply run start.bat


## Other OSes
For getting it to work any other operating system, please contact me!

## Known issues
- Streaming responses and suggestion currently don't work.
- Performance depends somewhat on the device, currently averaging 22 seconds on PC and varies somewhat on mobile. However, due to selenium issues, it seems that at least 2 GBs of RAM are needed to run smoothly. For older devices, please check out [the chrome version of the project](https://github.com/GlizzyChief/SillyTavern-1.8.4-fix-chrome)

## Recent fixes
- Fixed issues with characters responding with '{'reply': 'some text'}'
- Fixed characters responding with unfinished messages or triple dots
- Fixed issues caused by Poe putting an ad modal when opening some bots
- Temporarily fixed issues with Assistant by simply using ChatGPT instead
- Fixed proper bot closing 

## Contact
Please drop me a message on [Matrix](https://matrix.to/#/@glizzychief:catgirl.cloud) or Discord (glizzychief#1048) if you have any questions or just want to say hi.

## Credits
All credits go to the SillyTavern team and vfnm here at github.
