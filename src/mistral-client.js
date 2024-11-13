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

const puppeteerWithPlugin = new PuppeteerExtra(puppeteer);

let stealthPlugin = StealthPlugin();

puppeteerWithPlugin.use(stealthPlugin);

// Selectors used in the logic
const MISTRAL_EMAIL_INPUT = 'input[name="identifier"]';
const MISTRAL_PASSWORD_INPUT = 'input[name="password"]';
const MISTRAL_COOKIE_BUTTONS = "button.cm__btn";
const MISTRAL_MESSAGE_CONTAINER = "div.prose";
const MISTRAL_STOP_GENERATION_BUTTON = 'button[aria-label="Stop generation"]';
const MISTRAL_DELETE_BUTTON = 'button[title="Delete"]';
const MISTRAL_CHAT_LOGO = 'div>div>img[alt="LeChat Logo"]';
const MISTRAL_BOT_NAME_CONTAINER = "div.text-sm.font-medium";
const MISTRAL_BOT_LIST_OPENER = "div.hidden>button.flex";

class MistralClient {
    browser = null;
    page = null;
    authCookieName = null;
    authCookieValue = null;

    constructor(authCookieName, authCookieValue) {
        this.authCookieName = authCookieName;
        this.authCookieValue = authCookieValue;
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

        await this.page.goto("https://chat.mistral.ai");

        await this.page.setCookie({
            name: this.authCookieName,
            value: this.authCookieValue,
            domain: ".mistral.ai",
        });

        await this.page.goto("https://chat.mistral.ai");

        await this.page.waitForSelector("textarea");

        // Wait for Cookie dialog for 3 seconds, and
        // reject all cookies if it appears
        try {
            await this.page.waitForSelector(MISTRAL_COOKIE_BUTTONS, {
                timeout: 5000,
            });

            await this.page.evaluate((buttonSelector) => {
                document.querySelectorAll(buttonSelector)[1].click();
            }, MISTRAL_COOKIE_BUTTONS);
        } catch {}

        return true;
    }

    async getLatestMessage() {
        console.log("Getting latest message...");

        let lastMessage = await this.page.evaluate((containerSelector) => {
            let allMessageContainers =
                document.querySelectorAll(containerSelector);
            return allMessageContainers[allMessageContainers.length - 1]
                .innerHTML;
        }, MISTRAL_MESSAGE_CONTAINER);

        let turndown = new Turndown();

        return turndown.turndown(lastMessage);
    }

    async getLatestMessageStreaming() {
        console.log("Getting latest message...");

        let lastMessage = await this.page.evaluate((containerSelector) => {
            let allMessageContainers =
                document.querySelectorAll(containerSelector);
            return allMessageContainers[allMessageContainers.length - 1]
                .innerHTML;
        }, MISTRAL_MESSAGE_CONTAINER);

        let turndown = new Turndown();

        return turndown.turndown(lastMessage);
    }

    // Decided to put most of logic that would get triggered when sending a message
    // here for now, both creating a new chat and choosing the bot
    async sendMessage(message) {
        try {
            let inputField = await this.page.$("textarea");

            await this.page.evaluate((message) => {
                document.querySelector("textarea").value = message;
            }, message);

            await inputField.press("Space");
            await inputField.press("Backspace");
            await inputField.press("Enter");

            // Replace with awaiting for isGenerating to be true and timing out after
            // a few seconds if it's still isn't
            await delay(2000);

            let startTime = Date.now();
            while (true) {
                let stillGenerating = await this.isGenerating();

                if (stillGenerating) {
                    break;
                }

                let milliSecondsElapsed = Math.floor(Date.now() - startTime);

                if (milliSecondsElapsed > 2000) {
                    throw Error(
                        "!! Error during sending message in Mistral. Message didn't start generating for 4 seconds, or didn't create the \"Stop generating\" button"
                    );
                }
                // Waiting for just 50 milliseconds proved to be too much, apparently
                await delay(10);
            }

            return true;
        } catch (e) {
            console.log(e);
            return false;
        }
    }

    async abortMessage() {
        let isGenerating = await this.isGenerating();
        if (isGenerating) {
            await this.page.evaluate((buttonSelector) => {
                document.querySelector(buttonSelector).click();
            }, MISTRAL_STOP_GENERATION_BUTTON);
        }
    }

    async isGenerating() {
        return await this.page.evaluate((buttonSelector) => {
            return !!document.querySelector(buttonSelector);
        }, MISTRAL_STOP_GENERATION_BUTTON);
    }

    async deleteLastMessage() {
        // Deletes last message, and forces
        // the client to wait for Mistral logo
        // if only one message was remaining
        let shouldWaitForLogo = await this.page.evaluate((buttonSelector) => {
            let deleteButtons = document.querySelectorAll(buttonSelector);
            deleteButtons[deleteButtons.length - 1]?.click();

            return deleteButtons.length < 2;
        }, MISTRAL_DELETE_BUTTON);

        if (shouldWaitForLogo)
            await this.page.waitForSelector(MISTRAL_CHAT_LOGO);
    }

    async deleteMessages(count) {
        while (count > 0) {
            await this.deleteLastMessage();
            await delay(150);
            count -= 1;
        }
    }

    async newChat() {
        await this.page.goto("https://chat.mistral.ai/chat");
    }

    async getBotNames() {
        try {
            await this.page.waitForSelector(MISTRAL_BOT_LIST_OPENER);

            await this.page.evaluate((botOpenerSelector) => {
                document.querySelectorAll(botOpenerSelector)[1].click();
            }, MISTRAL_BOT_LIST_OPENER);

            await this.page.waitForSelector(MISTRAL_BOT_NAME_CONTAINER);

            let botNames = await this.page.$$eval(
                MISTRAL_BOT_NAME_CONTAINER,
                (containers) => {
                    return containers.map((container) => container.textContent);
                }
            );

            await this.page.click("body");

            // Last element is "Create an agent in La Plateforme", so we remove it

            return botNames.slice(0, botNames.length - 1);
        } catch (e) {
            console.error("Couldn't get bot names. Please report this issues!");
            throw e;
        }
    }

    async changeBot(botName) {
        try {
            let botNames = await this.getBotNames();

            // Probably can shave off a little bit of time by
            // simply not closing the bot selector after
            // opening it

            console.log("CHANGING BOT TO ", botName);

            await this.page.waitForSelector(MISTRAL_BOT_LIST_OPENER);

            await this.page.evaluate((botOpenerSelector) => {
                document.querySelectorAll(botOpenerSelector)[1].click();
            }, MISTRAL_BOT_LIST_OPENER);

            await this.page.waitForSelector(MISTRAL_BOT_NAME_CONTAINER);

            await delay(100);

            let botId = botNames.indexOf(botName);

            // Switch to the first model if it's somehow not found
            if (botId === -1) botId = 0;

            let botContainers = await this.page.$$(MISTRAL_BOT_NAME_CONTAINER);
            await botContainers[botId].click();
        } catch (e) {
            console.error("Couldn't change the bot!");
            throw e;
        }
    }
}

module.exports = MistralClient;
