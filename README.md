# SillyTavern-1.8.4-fix

This is a patched version of SillyTavern 1.8.4 which adds support for Poe using selenium webdriver.
It can be used the same way as SillyTavern 1.8.4. Just input your p-b cookie and have a blast!

# Instructions

Installation is the same as original SillyTavern, with only Termux installation differing slightly.
To install in Termux run:
1. Install x11 repo: `pkg install x11-repo`
2. Install firefox: `pkg install firefox`
3. Install geckodriver: `pkg install geckodriver`
4. Run `start.sh` and enjoy!

## Known issues
- Streaming and suggestion currently don't work.
- Refreshing the browser doesn't stop the existing selenium instance from running. If your browser tab crashes, or you need to refresh the page for any reason, please restart the application.
- Performance leaves a fair bit to be desired. Any ideas and pull requests are welcome!

## Contact
Please drop me a message on [Matrix](https://matrix.to/#/@glizzychief:catgirl.cloud) if you have any questions or just want to say hi.

## Credits
All credits go to the SillyTavern team and vfnm here at github.
