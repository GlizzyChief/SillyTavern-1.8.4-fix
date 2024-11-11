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

// Selectors for easier fixing in the future
const MODAL_CLOSE_SELECTOR = ".chakra-modal__close-btn"; // not needed for now
const MESSAGE_TEXTAREA = "textarea";
const INDIVIDUAL_MODEL_SELECTOR = "button.css-57ovpy>span";
// Also matches the "Individual Models" selector button!
const COMMON_MODEL_SELECTOR = "div.cursor-pointer.items-center>p";
const BOT_NAME_SELECTOR = "div>span.line-clamp-1";
const FOLLOW_BOT_BUTTON_SELECTOR = 'button[aria-label="Follow"]';
const UNFOLLOW_BOT_BUTTON_SELECTOR = 'button[aria-label="Unfollow"]';
const STOP_MESSAGE_GENERATION_BUTTON = "button>svg.css-n059si";
const NEW_CHAT_BUTTON_SELECTOR = 'button[aria-label="Save and Start New Chat"]';
const AMAZON_CAPTCHA_MODAL_SELECTOR = "div.amzn-captcha-modal-title"; // hopefully will never be seen lmao
const MESSAGE_MARKDOWN_CONTAINER_SELECTOR = ".flowgpt-markdown";
// not really used but kept just in case
// Note! Might be needed for stopping message generation
const SEND_MESSAGE_BUTTON_SELECTOR = "button[aria-label='Send']";
// This selects far too many elements. As such, the second to last message must be found, and only then this selector should be applied
const EDIT_BUTTON_SELECTOR =
    "div.flex.gap-5.transition-opacity>div";
const EDIT_TEXTAREA_SELECTOR = "textarea#message-editing-box";
const EDIT_CONFIRM_BUTTON_SELECTOR = 'button[aria-label="Confirm edit"]';
const REGENERATE_MESSAGE_SELECTOR = "div.cursor-pointer";
const CHANGE_TEMPERATURE_BUTTON = "div.chakra-menu__menu-list>button"; // 0 => newChat, 1 => high, 2 => medium, 3 => low

// For debugging only
const HIDE_BOT_PANEL_SELECTOR = "button.chakra-button.css-4ihfhs";

// Shamelessly copied from PoeClient
class FlowGPTClient {
    browser = null;
    page = null;
    botName = "chat-with-chatgpt-for-free-flowgpt";
    modelName = "Ares Model";

    constructor(flowGPTCookie) {
        this.flowGPTCookie = flowGPTCookie;

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
        // really have any protection, there is no need to emulate a device // Really regret the bit about protection lmao
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

        try {
            await this.page.goto("https://flowgpt.app/", {
                waitUntil: "networkidle2",
                timeout: 5000,
            });
        } catch (e) {
            console.error(e);
            console.log("Continuing initialization despite the previous error");
        }

        await delay(200);
        await this.page.setCookie({
            name: "__Secure-next-auth.session-token",
            value: this.flowGPTCookie,
        });
        await delay(200);
        try {
            await this.page.goto("https://flowgpt.app/", {
                waitUntil: "networkidle2",
                timeout: 5000,
            });
        } catch (e) {
            console.error(e);
            console.log(
                "Continuing initialization despite the previous error: Title page is taking too long to load. Not critical as another navigation event is following right after"
            );
        }
        await delay(200);
        // Loaded in order to skip the Preference Selection prompt
        await this.page.goto("https://flowgpt.app/chat", {
            waitUntil: "domcontentloaded",
        });

        // The ad for app seems to load all the time, but will still be
        // error handled and waited for for only 7 seconds in case
        // they remove the ad in the future

        // Looks like they removed the ad, no neet to wait for it

        // try {
        //     await this.page.waitForSelector(MODAL_CLOSE_SELECTOR, {
        //         timeout: 7000,
        //     });

        //     // Close the modal.
        //     await this.page.evaluate((buttonSelector) => {
        //         document.querySelector(buttonSelector).click();
        //     }, MODAL_CLOSE_SELECTOR);
        // } catch (e) {
        //     console.error(e);
        //     console.log(
        //         "Ad not loaded! Please notify the developer to remove the check for it. This will significantly reduce the loading time"
        //     );
        // }

        console.log("Waiting for page load...");

        await this.page.waitForSelector(MESSAGE_TEXTAREA);

        let title = await this.page.title();

        console.log(`DEBUG: Current page title: ${title}`);

        if (title.includes("Attention Required!")) {
            console.log(
                "ERROR: your connection was blocked by FlowGPT. Please try using a VPN or switching to another server in case you are using one already."
            );
        }

        await delay(200);

        console.log("Choosing the selected bot and starting a new chat...");

        await this.changeBot(this.botName);

        await this.newChat();

        return true;
    }

    // Automatically waits for the generating to be finished, so nothing
    // need to be done anything outside the client.
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

    async sendMessage(message) {
        try {
            let title = await this.page.title();
            console.log(
                `DEBUG: Current page title during SEND: ${title} && bot: ${this.botName}`
            );

            if (this.page.$(MESSAGE_TEXTAREA) === null) {
                throw new Error("Input element not found! Aborting.");
            }

            await delay(300);

            await this.page.evaluate(
                (message, textareaSelector) => {
                    let tarea = document.querySelector(textareaSelector);
                    tarea.click();
                    tarea.focus();
                    while (tarea.value === "") {
                        tarea.value = message;
                    }
                },
                message,
                MESSAGE_TEXTAREA
            );

            let inputForm = await this.page.$(MESSAGE_TEXTAREA);

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

            let isBlockedByWAF = await this.page.evaluate(
                (amazonCaptchaSelector) => {
                    return (
                        document.querySelectorAll(amazonCaptchaSelector)
                            .length !== 0
                    );
                },
                AMAZON_CAPTCHA_MODAL_SELECTOR
            );

            if (isBlockedByWAF) {
                console.error(
                    "CAPTCHA detected! If running in non-headless mode, solve the captcha to continue using the fix."
                );
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

            await this.page.waitForSelector(
                MESSAGE_MARKDOWN_CONTAINER_SELECTOR
            );

            let _ = await this.page.evaluate(
                (messageSelector, editButtonSelector) => {
                    let allMessages =
                        document.querySelectorAll(messageSelector);
                    allMessages[
                        allMessages.length - 2
                    ].parentElement.parentElement
                        .querySelectorAll(editButtonSelector)[1]
                        .click();

                    return allMessages;
                },
                MESSAGE_MARKDOWN_CONTAINER_SELECTOR,
                EDIT_BUTTON_SELECTOR
            );

            console.log(_);

            console.log(
                "Triggered edit prompt! Replacing message and confirming edit..."
            );

            await delay(100);

            await this.page.waitForSelector(EDIT_TEXTAREA_SELECTOR);

            // Copied from a function above for convenience
            await this.page.evaluate(
                (message, editTextareaSelector) => {
                    let tarea = document.querySelector(editTextareaSelector);
                    tarea.click();
                    tarea.focus();
                    tarea.value = message;
                    while (tarea.value === "") {
                        tarea.value = params.message;
                    }
                },
                message,
                EDIT_TEXTAREA_SELECTOR
            );

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

    
    // Should not be enabled for now. Too many bugs.
    // For example, user's last message seems to disasppear
    // after trying to regenerate the last response.
    async regenerateMessage() {
        try {
            console.log(`DEBUG: Attempting to regenerate last message...`);

            if (await this.isGenerating()) await this.abortMessage();

            await delay(3000);

            await this.page.evaluate(
                (messageSelector, regenerateButtonSelector) => {
                    let allMessages =
                        document.querySelectorAll(messageSelector);
                    allMessages[
                        allMessages.length - 1
                    ].parentElement.parentElement
                        .querySelectorAll(regenerateButtonSelector)[1]
                        .click();

                    return allMessages;
                },
                MESSAGE_MARKDOWN_CONTAINER_SELECTOR,
                REGENERATE_MESSAGE_SELECTOR
            );

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

        await this.page.click(STOP_MESSAGE_GENERATION_BUTTON);

        return true;
    }

    async newChat() {
        await this.page.waitForSelector(NEW_CHAT_BUTTON_SELECTOR);

        await delay(1000);

        await this.page.evaluate((newChatButtonSelector) => {
            document.querySelector(newChatButtonSelector).click();
        }, NEW_CHAT_BUTTON_SELECTOR);
    }

    async isGenerating() {
        let isGenerating = await this.page.evaluate(
            (messageGeneratingSpinnerSelector) => {
                return (
                    document.querySelectorAll(messageGeneratingSpinnerSelector)
                        .length !== 0
                );
            },
            STOP_MESSAGE_GENERATION_BUTTON
        );

        return isGenerating;
    }

    // Gets model names. Different from bots, as bots can work with various models.
    // Changing a model shouldn't require any additional JBing or such.
    async getModelNames() {
        try {
            await this.page.waitForSelector(INDIVIDUAL_MODEL_SELECTOR);
            await this.page.waitForSelector(COMMON_MODEL_SELECTOR);
            // FlowGPT has 2 separate bot lists. Have to fetch both and combine for completeness
            let individualModelNames = await this.page.evaluate(
                (individualModelSelector) => {
                    let out = [];
                    document
                        .querySelectorAll(individualModelSelector)
                        .forEach((_) =>
                            out.push(_.parentElement.childNodes[1].textContent)
                        );
                    return out;
                },
                INDIVIDUAL_MODEL_SELECTOR
            );

            // Basically, the items returned by selector contain the selected model (first element),
            // all common models and then the text "Individual models". Hence skipping first and last element
            let commonModelNames = await this.page.evaluate(
                (commonModelSelector) => {
                    let out = [];

                    let commonModels =
                        document.querySelectorAll(commonModelSelector);

                    // NodeList doesn't support methods like slice or map, so have to use a simple loop
                    for (let i = 1; i < commonModels.length - 1; i++) {
                        out.push(commonModels[i].textContent);
                    }
                    return out;
                },
                COMMON_MODEL_SELECTOR
            );

            return [...commonModelNames, ...individualModelNames];
        } catch (e) {
            console.error(e);
            console.error("Couldn't get model names!");
        }
    }

    async changeModel(modelName) {
        try {
            console.log(`Changing to model ${modelName}`);
            await this.page.waitForSelector(INDIVIDUAL_MODEL_SELECTOR);
            await this.page.waitForSelector(COMMON_MODEL_SELECTOR);

            // Iterate through both model types and return as soon as the desired model is found and clicked.
            let successfullyChangedModel = await this.page.evaluate(
                (individualModelSelector, commonModelSelector, modelName) => {
                    let individualModels = document.querySelectorAll(
                        individualModelSelector
                    );

                    for (let individualModel of individualModels) {
                        if (
                            individualModel.parentElement.childNodes[1]
                                .textContent === modelName
                        ) {
                            individualModel.parentElement.click();
                            return true;
                        }
                    }

                    let commonModels =
                        document.querySelectorAll(commonModelSelector);

                    for (let i = 1; i < commonModels.length - 1; i++) {
                        if (commonModels[i].textContent === modelName) {
                            commonModels[i].click();
                            return true;
                        }
                    }

                    return false;
                },
                INDIVIDUAL_MODEL_SELECTOR,
                COMMON_MODEL_SELECTOR,
                modelName
            );

            if (!successfullyChangedModel) {
                console.error(`ERROR: Couldn't change model to ${modelName}`);
            } else {
                this.modelName = modelName;
            }

            await delay(400);

            return successfullyChangedModel;
        } catch (e) {
            console.error(e);
            return false;
        }
    }

    // Returns a list of objects, each containing a bot name and url slag for it
    async getBotNames() {
        try {
            // The selector gets bots from both Followed and Chatted section, neat!
            // Can also follow the bot, so adding bots should be very easy.
            // If dynamic updates work then it could be done without even needing to clean the chat.
            let botNames = await this.page.evaluate((botNameSelector) => {
                let out = [];
                document.querySelectorAll(botNameSelector).forEach((_) =>
                    out.push({
                        name: _.textContent,
                        value: _.parentElement.childNodes[3].href.match(
                            /(?<=https\:\/\/flowgpt.app\/chat\/).+/g
                        )[0],
                    })
                );
                return out;
            }, BOT_NAME_SELECTOR);

            let filteredBotNames = botNames.filter(
                (bot, i, botNamesArray) =>
                    botNamesArray.findIndex(
                        (botDup) => botDup.value === bot.value
                    ) === i
            );

            if (filteredBotNames.length > 0) return filteredBotNames;

            // Return sane defaults if no bot is found or an error occurs
            return [
                {
                    name: "Chat with ChatGPT for Free | FlowGPT",
                    value: "chat-with-chatgpt-for-free-flowgpt",
                },
            ];
        } catch (e) {
            console.error(e);
            return [
                {
                    name: "Chat with ChatGPT for Free | FlowGPT",
                    value: "chat-with-chatgpt-for-free-flowgpt",
                },
            ];
        }
    }

    async changeBot(botSlug) {
        // Since bots are fetched along with their URL slug, and
        // clicking on the bot on the site itself causes it to go
        // to a new page instead of loading the bot without navigating
        // like in flowgpt.com, it makes sense to just navigate to it instead.

        // Should possibly sanitize the navigation in the future

        console.log(`Switching to bot ${botSlug}`);

        await this.page.goto(`https://flowgpt.app/chat/${botSlug}`);

        this.botName = botSlug;

        // Simply go to the default bot if bot not found
        if (
            await this.page.evaluate(() => {
                return (
                    document.querySelector("h1.hidden")?.textContent ===
                    "Page not found"
                );
            })
        ) {
            console.error(
                "Couldn't change bot: bot not found! Switching to default..."
            );
            await this.page.goto(
                "https://flowgpt.app/chat/chat-with-chatgpt-for-free-flowgpt"
            );

            await this.newChat();

            // Wait for the page to fully load before returning!

            await this.page.waitForSelector(NEW_CHAT_BUTTON_SELECTOR);

            this.botName = "chat-with-chatgpt-for-free-flowgpt";
        }

        await this.newChat();

        await delay(400);

        await this.newChat();

        // For debug
        // await this.page.waitForSelector(HIDE_BOT_PANEL_SELECTOR);
        // await this.page.click(HIDE_BOT_PANEL_SELECTOR);

        return true;
    }

    async addBot(botName) {
        console.log(`Adding bot ${botName}`);

        // First check if the bot is already added to begin with
        let botNames = await this.getBotNames();
        if (botNames.filter((bot) => bot.value === botName).length !== 0) {
            return { error: true };
        }

        let currentPage = await this.page.evaluate(() => {
            return window.location.href;
        });

        await this.page.goto(`https://flowgpt.app/chat/${botName}`);

        if (
            await this.page.evaluate(() => {
                return (
                    window.location.href === "https://flowgpt.app/"
                );
            })
        ) {
            console.log(`Couldn't add bot ${botName} - bot not found!`);
            await this.page.goto(currentPage);
            return { error: true };
        }


        // Should only be triggered if a user adds a bot outside the window opened by ST
        if (
            await this.page.evaluate((unfollowButtonSelector) => {
                return (
                    document.querySelectorAll(unfollowButtonSelector).length !== 0
                );
            }, UNFOLLOW_BOT_BUTTON_SELECTOR)
        ) {
            console.log(`Couldn't add bot ${botName} - bot already followed!`);
            await this.page.goto(currentPage);
            return { error: true };
        }

        try {
            
            await this.page.waitForSelector(FOLLOW_BOT_BUTTON_SELECTOR);
            // await this.page.click(FOLLOW_BOT_BUTTON_SELECTOR)
            await this.page.evaluate((followButtonSelector) => {
                document.querySelector(followButtonSelector).click();
            }, FOLLOW_BOT_BUTTON_SELECTOR);

            console.log("Bot followed, fetching list of new bots")

            await this.page.reload({ waitUntil: "networkidle2" });

            let newBotNames = await this.getBotNames();
            console.log(newBotNames)
            return { error: false, newBotNames };
        } catch (e) {
            console.error(e);
            console.log(`Couldn't add bot ${botName}!`);
            await this.page.goto(currentPage);
            return { error: true };
        }
    }

    // 1 => high, 2 => normal, 3 => low
    async changeTemperature(temperature) {
        try {

            console.log(`Changing temperature to ${["high", "normal", "low"][temperature - 1]}`)

            if (temperature < 1 || temperature > 3) temperature = 2;

            await this.page.waitForSelector(CHANGE_TEMPERATURE_BUTTON);

            await this.page.evaluate(
                (temperatureIndex, changeTemperatureSelector) => {
                    document
                        .querySelectorAll(changeTemperatureSelector)
                        [temperatureIndex-1].click();
                },
                temperature,
                CHANGE_TEMPERATURE_BUTTON
            );
        } catch (e) {
            console.error(e);
        }
    }
}

module.exports = FlowGPTClient;
