// TODO: add streaming, add file upload, move away from forced delays where possible

// Default paths that usually contain Chromium, or Chrome when using Windows or OSX
// Feel free to change if you're using a custom path!
const DEFAULT_WINDOWS_PATH =
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ALTERNATIVE_WINDOWS_PATH =
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
const DEFAULT_OSX_PATH =
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const DEFAULT_ANDROID_PATH =
    "/data/data/com.termux/files/usr/bin/chromium-browser";
const DEFAULT_LINUX_PATH = "/usr/bin/chromium";
// While the above path works for Ubuntu, Arch, etc, Fedora seems to use a different path
const ALTERNATIVE_LINUX_PATH = "/usr/bin/chromium-browser";

const puppeteer = require("puppeteer-core");
const { PuppeteerExtra } = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const Turndown = require("turndown");
const randomUseragent = require("random-useragent");
const fs = require("fs");
// const fs = require("fs");

// an Array that contains all paths with
const chromium_possible_paths = [
    DEFAULT_ANDROID_PATH,
    DEFAULT_WINDOWS_PATH,
    ALTERNATIVE_WINDOWS_PATH,
    DEFAULT_OSX_PATH,
    DEFAULT_LINUX_PATH,
    ALTERNATIVE_LINUX_PATH,
];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// const puppeteerWithPlugin = new PuppeteerExtra(puppeteer);

// let stealthPlugin = StealthPlugin();

// puppeteerWithPlugin.use(stealthPlugin);

// Selectors used in the logic
const VELLO_SIGN_UP_MODAL_TRIGGER = "button.w-full";
const VELLO_SIGN_IN_SWITCHER = ".supabase-auth-ui_ui-anchor";
const VELLO_EMAIL_INPUT = "input#email";
const VELLO_PASSWORD_INPUT = "input#password";
const VELLO_SIGN_IN_SUBMIT = ".supabase-auth-ui_ui-button";
const VELLO_WRONG_CREDENTIALS_ERROR_TEXT = ".supabase-auth-ui_ui-message";
const VELLO_PINNED_BOT_NAME_CONTAINER = "button>div>div.truncate:not(.hidden)";
const VELLO_MESSAGE_INPUT_FIELD = "textarea.scroll-py-2";
const VELLO_OUT_OF_MESSAGES_TEXT = "div.select-none>svg";
const VELLO_MESSAGE_CONTAINER = "article.prose";
const VELLO_STOP_BUTTON = "svg.text-rose-400";
const VELLO_NEW_CHAT_BUTTON = ".cursor-pointer.text-center";
const VELLO_EXPAND_USER_SETTINGS_BUTTON = "button>button";
const VELLO_SETTINGS_OPEN_BUTTON =
    "div.relative.flex.cursor-default.select-none.items-center.rounded-sm.px-2.text-sm";
const VELLO_SETTINGS_CLOSE_BUTTON = "button.absolute";
const VELLO_BOT_PIN_SWITCH = "td>button[role=switch]";
const VELLO_CHATS_CONTAINER = "div[role=group]";
const VELLO_MODAL_CONTAINER = "div[role=dialog]";
const VELLO_FILE_INPUT_OPENER_BUTTON =
    "button.cursor-pointer.text-center.text-slate-300.grid>div";
const VELLO_FILE_INPUT = 'input[type="file"]';
const VELLO_FILE_UPLOAD_STATUS_TEXT = ".filepond--file-status-main"; // Used for detecting successful upload

class VelloAIClient {
    browser = null;
    page = null;
    email = null;
    password = null;
    botName = null;
    useGoogleAuth = false;

    constructor(email, password, useGoogleAuth) {
        this.email = email;
        this.password = password;
        this.useGoogleAuth = useGoogleAuth;
    }

    async closeDriver() {
        await this.browser.close();
    }

    async initializeDriver() {
        // Not sure if there's any need to emulate a mobile device at this point
        // let isMobile = false;
        let validPathFound = false;

        for (let chromiumPath of chromium_possible_paths) {
            try {
                // Alternative initialization for android
                if (chromiumPath === DEFAULT_ANDROID_PATH) {
                    this.browser = await puppeteer.launch({
                        executablePath:
                            "/data/data/com.termux/files/usr/bin/chromium-browser",
                        headless: "new",
                    });
                    // isMobile = true;
                } else {
                    this.browser = await puppeteer.launch({
                        executablePath: chromiumPath,
                        headless: false,
                    });
                }

                validPathFound = true;
                break;
            } catch (e) {
                console.error(e);
            }
        }

        if (!validPathFound) {
            console.error(
                "No Chrome/Chromium found in default paths! Please check the paths and provide your own path if necessary"
            );
            return false;
        }

        // Allow access to clipboard for Vello.ai
        // TODO: find a way to isolate clipboard for browser process, without
        // interfering with OS clipboard
        const context = await this.browser.defaultBrowserContext();
        await context.overridePermissions("https://vello.ai", [
            "clipboard-read",
        ]);

        this.page = await this.browser.newPage();

        // if (isMobile) {
        //     await this.page.emulate(puppeteer.KnownDevices["Galaxy S9+"]);
        // }

        let _ = randomUseragent.getRandom();

        await this.page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, "webdriver", {
                value: false,
                writable: false,
            });

            if (navigator.platform === "Win32") {
                Object.defineProperty(navigator, "userAgent", {
                    value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
                });
            } else {
                Object.defineProperty(navigator, "userAgent", {
                    //value: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
                    value: _,
                });
            }
            Object.defineProperty(window, "chrome", {
                value: true,
                writable: false,
            });
        });

        await this.page.goto("https://vello.ai/app", { timeout: 0 });

        console.log("Waiting for Sign Up button to be loaded...");

        await this.page.waitForSelector(VELLO_SIGN_UP_MODAL_TRIGGER);
        await this.page.evaluate((buttonSelector) => {
            document.querySelector(buttonSelector).click();
        }, VELLO_SIGN_UP_MODAL_TRIGGER);

        await this.page.waitForSelector(VELLO_SIGN_IN_SWITCHER);
        await this.page.evaluate((buttonSelector) => {
            document.querySelector(buttonSelector).click();
        }, VELLO_SIGN_IN_SWITCHER);

        if (this.useGoogleAuth) {
            console.log(
                "Using Google authentication, waiting for the site to leave vello.ai..."
            );

            // First, wait for the site to leave vello.ai (will redirect to Google for authenticating)
            // This has the added benefit of not having to account for all weird google redirects and such
            await this.page.waitForFunction(
                () => window.location.hostname !== "vello.ai",
                { timeout: 0 }
            );

            console.log("Site changed! Waiting to return back to vello.ai...");

            // Now, wait for it to return to Vello, meaning successful authentication
            await this.page.waitForFunction(
                () => window.location.hostname === "vello.ai",
                { timeout: 0 }
            );

            console.log(
                "Returned to vello.ai. Proceeding with the rest of initialization."
            );
        } else {
            console.log("Authenticating...");

            await delay(1000);

            // Typing right away doesn't work, as it eats the first two characters for some reason
            let emailInputField = await this.page.$(VELLO_EMAIL_INPUT);
            let passwordInputField = await this.page.$(VELLO_PASSWORD_INPUT);

            await emailInputField.press("Space");
            await delay(200);
            await emailInputField.press("Backspace");
            await emailInputField.type(this.email);

            await passwordInputField.press("Space");
            await delay(200);
            await passwordInputField.press("Backspace");
            await passwordInputField.type(this.password);

            await this.page.evaluate((buttonSelector) => {
                document.querySelectorAll(buttonSelector)[1].click();
            }, VELLO_SIGN_IN_SUBMIT);

            await delay(2000);

            let didAuthenticationFail = await this.page.evaluate(
                (textSelector) => {
                    return document.querySelectorAll(textSelector).length === 0;
                },
                VELLO_WRONG_CREDENTIALS_ERROR_TEXT
            );

            if (!didAuthenticationFail) {
                console.error("Provided credentials did not work!");
                return false;
            }
        }

        // After authenticating, it's necessary to wait for the modal to close so the site becomes fully functional again
        await this.page.waitForFunction(
            (VELLO_MODAL_CONTAINER) => {
                return !document.querySelector(VELLO_MODAL_CONTAINER);
            },
            {},
            VELLO_MODAL_CONTAINER
        );

        // Should replace it with a wait function for loading screen to disappear, can't seem to capture its selector
        await delay(2500);

        // Throw an error if no more free messages are available
        let isOutOfMessages = await this.page.evaluate((textSelector) => {
            return document.querySelectorAll(textSelector).length > 0;
        }, VELLO_OUT_OF_MESSAGES_TEXT);

        if (isOutOfMessages) {
            console.error("Out of messages! Wait or use another account");
            return false;
        }

        await this.page.waitForSelector(VELLO_EXPAND_USER_SETTINGS_BUTTON);

        // In order to load the element needed for opening settings, we must expand
        // User settings first. If it's already expanded and available, then no need to
        await this.page.evaluate(
            (expandButtonSelector, openSettingsButtonSelector) => {
                if (
                    document.querySelectorAll(openSettingsButtonSelector)
                        .length === 0
                ) {
                    document.querySelector(expandButtonSelector).click();
                }
            },
            VELLO_EXPAND_USER_SETTINGS_BUTTON,
            VELLO_SETTINGS_OPEN_BUTTON
        );

        // Pin all bots, since pinned bots seem to get reset after every launch
        // Necessary to get ALL bot names
        await this.page.waitForSelector(VELLO_SETTINGS_OPEN_BUTTON);
        await this.page.evaluate((buttonSelector) => {
            document.querySelectorAll(buttonSelector)[3].click();
        }, VELLO_SETTINGS_OPEN_BUTTON);

        // Wait for the animation to end
        await delay(500);

        // Toggle all bot switches ON
        await this.page.evaluate((switchSelector) => {
            let allBotSwitches = document.querySelectorAll(switchSelector);
            for (let botSwitch of allBotSwitches) {
                if (botSwitch.ariaChecked === "false") {
                    botSwitch.click();
                }
            }
        }, VELLO_BOT_PIN_SWITCH);

        // Close the settings and wait for the animation to finish
        await this.page.evaluate((buttonSelector) => {
            document.querySelector(buttonSelector).click();
        }, VELLO_SETTINGS_CLOSE_BUTTON);
        await delay(500);

        return true;
    }

    async getLatestMessage() {
        console.log("Getting latest message...");

        let lastMessage = await this.page.$$eval(
            VELLO_MESSAGE_CONTAINER,
            (allMessages) => {
                return allMessages[allMessages.length - 1].innerHTML;
            }
        );

        let turndown = new Turndown();

        console.log(lastMessage);

        return turndown.turndown(lastMessage);
    }

    // Decided to put most of logic that would get triggered when sending a message
    // here for now, both creating a new chat and choosing the bot
    async sendMessage(message) {
        try {
            let messageInputField = await this.page.$(
                VELLO_MESSAGE_INPUT_FIELD
            );

            await delay(100);

            await messageInputField.focus();

            await messageInputField.type(" ");
            await messageInputField.press("Backspace");
            await delay(100);

            await this.page.evaluate(
                (selector, message) => {
                    document.querySelector(selector).value = message;
                    document.querySelector(selector).focus();
                },
                VELLO_MESSAGE_INPUT_FIELD,
                message
            );

            await messageInputField.type(" ");
            await messageInputField.press("Backspace");
            await delay(100);

            await messageInputField.press("Enter");

            console.log(
                `Input field value currently: ${messageInputField.value}`
            );

            // Wait for the message to start getting generated
            while (true) {
                if (await this.isGenerating()) break;
                await delay(10);
            }

            return true;
        } catch (e) {
            console.log(e);
            return false;
        }
    }

    // Still in development(
    // Basically the same as sendMessage, but with an extra file upload,
    // and only textPrompt being typed out in the input form
    // WORKS ONLY WITH VELLA!
    async sendFileMessage(message, textPrompt) {
        try {
            // Will always create a new chat and select a default bot
            // if selected bot doesn't even exist
            await this.changeBot("Vella");

            await this.page.evaluate((selector) => {
                document.querySelector(selector).click();
            }, VELLO_FILE_INPUT_OPENER_BUTTON);

            fs.writeFileSync("msg.txt", message);

            await delay(100);

            let fileUploadElement = await this.page.$(VELLO_FILE_INPUT);

            await fileUploadElement.uploadFile("msg.txt");

            await delay(1000);

            await this.page.waitForFunction(
                (selector) => {
                    return (
                        document.querySelector(selector).textContent ===
                        "Upload complete"
                    );
                },
                {},
                VELLO_FILE_UPLOAD_STATUS_TEXT
            );

            console.log("File successfully uploaded!");
            await delay(200);

            await this.page.click("body");

            let messageInputField = await this.page.$(
                VELLO_MESSAGE_INPUT_FIELD
            );

            await this.page.evaluate(
                (selector, message) => {
                    document.querySelector(selector).value = message;
                    document.querySelector(selector).focus();
                },
                VELLO_MESSAGE_INPUT_FIELD,
                textPrompt
            );

            await messageInputField.type(" ");
            await messageInputField.press("Backspace");
            await delay(5000);

            await messageInputField.press("Enter");

            // Wait for the message to start getting generated
            while (true) {
                if (await this.isGenerating()) break;
                await delay(10);
            }

            return true;
        } catch (e) {
            console.log(e);
            return false;
        }
    }

    async abortMessage() {
        let stillGenerating = await this.isGenerating();
        if (!stillGenerating) return false;

        if ((await this.page.$(VELLO_STOP_BUTTON)) === null) {
            return false;
        }

        await this.page.locator(VELLO_STOP_BUTTON).click();

        await delay(100);
        return true;
    }

    async isGenerating() {
        return await this.page.evaluate((buttonSelector) => {
            return !!document.querySelector(buttonSelector);
        }, VELLO_STOP_BUTTON);
    }

    async clearContext() {
        let stillGenerating = await this.isGenerating();
        if (stillGenerating) await this.abortMessage();

        //await this.page.locator(PURGE_CHAT_CLASS).click();

        return true;
    }

    async newChat() {
        let currentNumOfChats;
        try {
            currentNumOfChats = await this.page.evaluate(
                (containerSelector) => {
                    return document.querySelector(containerSelector)
                        .childElementCount;
                },
                VELLO_CHATS_CONTAINER
            );
        } catch {
            currentNumOfChats = 0;
        }
        await this.page.waitForSelector(VELLO_NEW_CHAT_BUTTON);
        await this.page.locator(VELLO_NEW_CHAT_BUTTON).click();

        await this.page.waitForFunction(
            (currentNumOfChats, containerSelector) => {
                return (
                    document.querySelector(containerSelector)
                        .childElementCount !== currentNumOfChats
                );
            },
            {},
            currentNumOfChats,
            VELLO_CHATS_CONTAINER
        );
    }

    // async deleteMessages(count) {}

    async getBotNames() {
        // Since the chat may be in alternative layout, open a new chat.
        // Could also do it by getting bot names in 2 separate ways if the other layout
        // is detected, but this is faster for now
        await this.newChat();

        await this.page.waitForSelector(VELLO_PINNED_BOT_NAME_CONTAINER);
        let botNames = await this.page.$$eval(
            VELLO_PINNED_BOT_NAME_CONTAINER,
            (containers) => {
                return containers.map((container) => container.textContent);
            }
        );

        return botNames;
    }

    async changeBot(botName) {
        // Maybe just cache it as a class property? Although this will provide fresher info
        // Also, forces default page layout
        let botNames = await this.getBotNames();
        await this.page.waitForSelector(VELLO_PINNED_BOT_NAME_CONTAINER);
        let botNameHandles = await this.page.$$(
            VELLO_PINNED_BOT_NAME_CONTAINER
        );

        let botNameID = botNames.indexOf(botName);

        if (botNameID === -1) {
            botNameID = 0;
            console.warn(
                "Bot not found! Please report this. Switching to the first pinned bot to avoid crashing..."
            );
        }

        await botNameHandles[botNameID].click();

        this.botName = botName;

        return true;
    }
}

module.exports = VelloAIClient;
