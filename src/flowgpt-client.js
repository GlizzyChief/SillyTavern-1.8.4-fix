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

// Selectors for easier fixing in the future.
const MODAL_CLOSE_SELECTOR = ".chakra-modal__close-btn";
const BOT_NAME_SELECTOR = ".css-1gg4f8a";
const MESSAGE_MARKDOWN_CONTAINER_SELECTOR = ".flowgpt-markdown";
const MAIN_TEXTAREA_SELECTOR = "textarea.chakra-textarea";
const MESSAGE_EDIT_BUTTON_SELECTOR =
    "#chat-container > div > div:nth-child(4) > div > div > div.opacity-0.transition-opacity.group-hover\\:opacity-100 > div > div:nth-child(3) > div > div:nth-child(2)";
const EDIT_TEXTAREA_SELECTOR = "textarea.block";
const EDIT_CONFIRM_BUTTON_SELECTOR = "div.flex.gap-2.absolute>svg:nth-child(2)";
const REGENERATE_MESSAGE_SELECTOR =
    "#chat-container>div>div:last-child>div>div>div>div>div>div>div>div";
const ABORT_MESSAGE_BUTTON_SELECTOR = "div.relative.justify-center.text-xs";
const NEW_CHAT_BUTTON_SELECTOR =
    ".flex.z-50.w-10.h-10.mb-2.items-center.justify-center.rounded-lg";
const BOT_ADD_BUTTON_SELECTOR = ".css-133h4lw"; // not unique, but the first element should work
const BOT_ADD_CONFIRM_SELECTOR = ".css-16mip7h";
const BOT_ADD_SUCCESS_ALERT_SELECTOR = ".css-zycdy9";
const BOT_ADD_CHECKBOX_SELECTOR = ".chakra-checkbox__input";

// Shamelessly copied from PoeClient, will probably merge the two
// to avoid repeating code. But, that will have to wait for now
// Dismissing instructions when connecting for the first time doesn't seem necessary, so it's skipped for now.
class FlowGPTClient {
    browser = null;
    page = null;
    botName = "gptforst";

    constructor(flowGPTCookie, botName) {
        this.flowGPTCookie = flowGPTCookie;
        this.botName = botName;

        console.log(`BOTNAME DURING INITIALIZING: ${this.botName}`);
    }

    async closeDriver() {
        await this.browser.close();
    }

    async initializeDriver() {
        let isMobile = false;
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
                    isMobile = true;
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

        // Mobile layout causes issues, and since FlowGPT doesn't
        // really have any protection, there is no need to emulate a device
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
            Object.defineProperty(navigator, "languages", {
                value: ["en-US", "en"],
                writable: false,
            });
            // Object.defineProperty(navigator, "appVersion", {
            //     value: "5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
            //     writable: false,
            // });
        });

        await this.page.goto("https://flowgpt.com/");
        await delay(200);
        await this.page.setCookie({
            name: "__Secure-next-auth.session-token",
            value: this.flowGPTCookie,
        });
        await delay(200);
        await this.page.goto("https://flowgpt.com");
        await delay(200);

        console.log("Waiting for page load...");
        await this.page.goto("https://flowgpt.com/chat", {
            timeout: 0,
            waitUntil: "domcontentloaded",
        });

        let title = await this.page.title();
        console.log(`DEBUG: Current page title: ${title}`);
        if (title.includes("Attention Required!")) {
            console.log(
                "ERROR: your connection was blocked by FlowGPT. Please try using a VPN or switching to another server in case you are using one already."
            );
        }

        console.log("Waiting for modal to load...");

        try {
            await this.page.waitForSelector(MODAL_CLOSE_SELECTOR);

            await this.page.evaluate((MODAL_CLOSE_SELECTOR) => {
                try {
                    document.querySelector(MODAL_CLOSE_SELECTOR).click();
                } catch {}
            }, MODAL_CLOSE_SELECTOR);
        } catch {
            console.log(
                "Errors encountered while trying to close the modals. Perhaps you've already turned them off?"
            );
        }

        console.log("Waiting for bot names to be loaded...");

        await this.page.waitForSelector(BOT_NAME_SELECTOR);

        await delay(200);

        console.log("Switching to the chosen bot & starting a new chat...");
        await this.changeBot(this.botName);
        await this.newChat();

        return true;
    }

    // Automatically waits for the generating to be finished, so no
    // need to do anything outside the client.
    async getLatestMessage() {
        let isGenerating = await this.isGenerating();

        console.log("Waiting for generating to be finished...");
        while (isGenerating) {
            console.log("Still not finished");
            isGenerating = await this.isGenerating();
            console.log(`isGenerating: ${isGenerating}`);
            await delay(300);
        }

        console.log("Finished waiting for generation to be finished.");

        console.log("before last message");
        let lastMessage = await this.page.$$eval(
            MESSAGE_MARKDOWN_CONTAINER_SELECTOR,
            (allMessages) => {
                return allMessages[allMessages.length - 1].innerHTML;
            }
        );

        let turndown = new Turndown();

        return turndown
            .turndown(lastMessage.replaceAll("\n", "\\n"))
            .replaceAll("\\\\n", "\n")
            .replaceAll("\\", "");
    }

    async sendMessage(message, page = this.page) {
        try {
            let title = await page.title();
            console.log(
                `DEBUG: Current page title during SEND: ${title} && bot: ${this.botName}`
            );

            if (page.$(MAIN_TEXTAREA_SELECTOR) === null) {
                throw new Error("Input element not found! Aborting.");
            }

            await delay(300);

            await page.evaluate(
                (message, MAIN_TEXTAREA_SELECTOR) => {
                    let tarea = document.querySelectorAll(
                        MAIN_TEXTAREA_SELECTOR
                    )[1];
                    tarea.click();
                    tarea.focus();
                    while (tarea.value === "") {
                        tarea.value = message;
                    }
                },
                message,
                MAIN_TEXTAREA_SELECTOR
            );

            let inputForm = (await page.$$(MAIN_TEXTAREA_SELECTOR))[1];

            await delay(100);

            await inputForm.press("Space");

            await delay(5);
            await inputForm.press("Backspace");

            await delay(20);

            await inputForm.press("Enter");

            console.log("Finished submitting input");

            // Just as a failsafe, wait for 4 seconds before returning, or until
            // isGenerating returns true
            let waitedFor = 0;

            while (waitedFor < 4000) {
                await delay(400);
                waitedFor += 400;

                if (await this.isGenerating()) break;
            }

            return true;
        } catch (e) {
            console.log(e);
            return false;
        }
    }

    async editLastSentMessage(message) {
        try {
            console.log(`DEBUG: Attempting to edit last message...`);

            await this.page.evaluate((selector) => {
                document.querySelector(selector).click();
            }, MESSAGE_EDIT_BUTTON_SELECTOR);

            console.log(
                "Triggered edit prompt! Replacing message and confirming edit..."
            );

            await delay(100);

            // Copied from a function above for convenience, will modify once it moves from PoC state
            await this.page.evaluate(
                (params) => {
                    let tarea = document.querySelector("textarea.block");
                    tarea.click();
                    tarea.focus();
                    tarea.value = params.message;
                    while (tarea.value === "") {
                        tarea.value = params.message;
                    }
                },
                { message, selector: EDIT_TEXTAREA_SELECTOR }
            );

            await this.page.waitForSelector(EDIT_TEXTAREA_SELECTOR);

            let inputElement = await this.page.$(EDIT_TEXTAREA_SELECTOR);

            await delay(100);

            await inputElement.press("Space");

            await delay(5);
            await inputElement.press("Backspace");

            await delay(20);

            let confirmButton = await this.page.$(EDIT_CONFIRM_BUTTON_SELECTOR);

            await confirmButton.click();

            console.log("Confirmed editing!");

            // Just as a failsafe, wait for 4 seconds before returning, or until
            // isGenerating returns true
            let waitedFor = 0;

            while (waitedFor < 4000) {
                await delay(400);
                waitedFor += 400;

                if (await this.isGenerating()) break;
            }

            return true;
        } catch (e) {
            console.log(e);
            return false;
        }
    }

    // FlowGPT seemingly removed the option to regenerate messages, so this is disabled for now.
    async regenerateMessage() {
        try {
            console.log(`DEBUG: Attempting to regenerate last message...`);

            await delay(500);
            if (await this.isGenerating()) await this.abortMessage();

            await this.page.waitForSelector(REGENERATE_MESSAGE_SELECTOR);

            await this.page.evaluate((REGENERATE_MESSAGE_SELECTOR) => {
                document
                    .querySelectorAll(REGENERATE_MESSAGE_SELECTOR)[1]
                    .click();
            }, REGENERATE_MESSAGE_SELECTOR);

            console.log("Triggered regenerate message!");

            // Just as a failsafe, wait for 4 seconds before returning, or until
            // isGenerating returns true
            let waitedFor = 0;

            while (waitedFor < 4000) {
                await delay(400);
                waitedFor += 400;

                if (await this.isGenerating()) break;
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

        await this.page.evaluate((ABORT_MESSAGE_BUTTON_SELECTOR) => {
            let container = document.querySelector(
                ABORT_MESSAGE_BUTTON_SELECTOR
            );
            if (container.childElementCount !== 0) {
                container.childNodes[0].click();
            }
        }, ABORT_MESSAGE_BUTTON_SELECTOR);

        return true;
    }

    async newChat() {
        await this.page.evaluate((NEW_CHAT_BUTTON_SELECTOR) => {
            document.querySelector(NEW_CHAT_BUTTON_SELECTOR).click();
        }, NEW_CHAT_BUTTON_SELECTOR);
    }

    async isGenerating() {
        let isGenerating = await this.page.evaluate(
            (ABORT_MESSAGE_BUTTON_SELECTOR) => {
                let elem = document.querySelector(
                    ABORT_MESSAGE_BUTTON_SELECTOR
                );
                if (
                    elem.childElementCount === 0 ||
                    elem.childElementCount === undefined
                )
                    return false;
                return true;
            },
            ABORT_MESSAGE_BUTTON_SELECTOR
        );

        return isGenerating;
    }

    async getBotNames(page = this.page) {
        let botNames = await page.$$eval(BOT_NAME_SELECTOR, (containers) => {
            return containers.map((container) => container.textContent);
        });

        return Array.from(new Set(botNames));
    }

    async changeBot(botName) {
        // Since fetching the bots is fairly fast for now, we can use it to
        // avoid any headaches
        let botNames = await this.getBotNames();

        if (botName === undefined || !botNames.includes(botName)) {
            console.log(`Bot name was ${botName}, changing to ChatGPT`);
            this.botName = "ChatGPT";
        } else {
            this.botName = botName;
        }

        await this.page.evaluate(
            (botName, BOT_NAME_SELECTOR) => {
                let allBotNameElements = [
                    ...document.querySelectorAll(BOT_NAME_SELECTOR),
                ];

                let filteredBotNames = allBotNameElements.filter(
                    (_) => _.textContent === botName
                );

                filteredBotNames[0].click();
            },
            this.botName,
            BOT_NAME_SELECTOR
        );

        await this.newChat();

        return true;
    }

    async addBot(botName) {
        let currentPage = await this.page.evaluate(() => {
            return window.location.href;
        });

        await this.page.goto(`https://flowgpt.com/p/${botName}`);

        if ((await this.page.$(".next-error-h1")) !== null) {
            console.log(`Couldn't add bot ${botName} - bot not found!`);
            await this.page.goto(currentPage);
            return { error: true };
        }

        // very impractical, but flowgpt ignores button presses until it
        // loads the amount of times the bot has been added to favourites, breaking the script.
        await delay(4500);

        await this.page.waitForSelector(BOT_ADD_BUTTON_SELECTOR);
        try {
            await this.page.evaluate((BOT_ADD_BUTTON_SELECTOR) => {
                document.querySelectorAll(BOT_ADD_BUTTON_SELECTOR)[0].click();
            }, BOT_ADD_BUTTON_SELECTOR);

            // After the confirmation modal appears, default collection must be selected.
            // Not tested on multiple collections!!
            await this.page.waitForSelector(BOT_ADD_CONFIRM_SELECTOR);
            await delay(1000);
            await this.page.evaluate((BOT_ADD_CHECKBOX_SELECTOR) => {
                let checkboxElem = document.querySelector(
                    BOT_ADD_CHECKBOX_SELECTOR
                );
                if (!checkboxElem.checked) checkboxElem.click();
            }, BOT_ADD_CHECKBOX_SELECTOR);
            await delay(1000);
            await this.page.click(BOT_ADD_CONFIRM_SELECTOR);

            await this.page.waitForSelector(BOT_ADD_SUCCESS_ALERT_SELECTOR);
            await this.page.goto(currentPage);
            await this.page.waitForSelector(BOT_NAME_SELECTOR);

            let newBotNames = await this.getBotNames();
            return { error: false, newBotNames };
        } catch {
            console.log(`Couldn't add bot ${botName}!`);
            await this.page.goto(currentPage);
            return { error: true };
        }
    }
}

module.exports = FlowGPTClient;
