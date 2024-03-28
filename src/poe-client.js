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

// CSS classes for quick fixing
const OPEN_IN_APP_TOGGLER_CLASS = ".ToggleSwitch_slider__ih5sC";
const LANGUAGE_SELECT_CLASS = ".Select_select__9vzGo";
const MODAL_CLOSE_CLASS = ".Modal_closeButton__ZYPm5";
const LOGGED_OUT_CLASS = ".TalkToBotButton_container__UJWM4";
const CHAT_GROW_CLASS = ".ChatPageMain_flexGrow__UnM8q"; // Element that loads the rest of the chat when scrolling down
const MESSAGE_BUBBLE_CLASS = ".Message_botMessageBubble__aYctV";
const STOP_BUTTON_CLASS = ".ChatStopMessageButton_stopButton__QOW41";
const FILE_ATTACH_CLASS = ".ChatMessageFileInputButton_input__svNx4";
const PURGE_CHAT_CLASS = ".ChatBreakButton_button__zyEye";
const TOKEN_EXCEEDED_MESSAGE_CLASS = ".Message_noSignIcon__11Dy5";
const MESSAGE_ACTION_BAR_CLASS = ".ChatMessageActionBar_actionBar__gyeEs";
const SUGGESTED_REPLY_CLASS =
    ".ChatMessageSuggestedReplies_suggestedReply__dmJO1";
const MESSAGE_CONTAINER_CLASS = ".ChatMessage_chatMessage__xkgHx"; // Used when deleting
const ERROR_MESSAGE_CLASS = ".Message_errorBubble__Bl92G";
const THREE_DOT_MENU_CLASS =
    ".ChatMessageOverflowButton_overflowButtonWrapper__gzb2s";
const DROPDOWN_DELETE_BUTTON_CLASS = ".DropdownMenuItem_destructive__Bi9MD"; // the "Delete" button that appears in message options
const FULL_MESSAGE_CONTAINER_CLASS = ".ChatMessage_messageRow__DHlnq"; // contains the whole message, used when deleting
const DELETE_BUTTON_CLASS = ".ChatPageDeleteFooter_button__6xWPc"; // the "Delete" button on the bottom of the screen
const DELETE_CONFIRM_BUTTON_SELECTOR =
    "div.MessageDeleteConfirmationModal_options__31rdn>button.Button_danger__Xy8Ox";
const SIDEBAR_ITEM_CLASS = ".SidebarItem_label__Ug6_M"; // Used for triggering bot list
const INFINITE_SCROLL_CLASS = ".InfiniteScroll_pagingTrigger__cdz9I"; // invisible element at the end of the bot list, loads more when in view
const BOT_NAME_CONTAINER_CLASS = ".CompactBotListItem_info__mJYLl";
const GENERIC_MODAL_CLOSE_CLASS = ".Modal_closeButton__GycnR"; // Used when closing modals that popup when changing bot, or fetching bot list
const OUT_OUF_MESSAGES_CLASS =
    ".ChatMessageSendButton_noFreeMessageTooltip__9IhzY";

class PoeClient {
    browser = null;
    page = null;
    botName = "gptforst";
    poeLatCookie = "";

    constructor(poeCookie, botName, waitForAuth) {
        this.botName = botName;
        this.waitForAuth = waitForAuth;

        if (poeCookie.split("|").length === 1) {
            this.poeCookie = poeCookie;
            console.log(
                "WARNING: Initializing without p-lat cookie. Poe may fail to authenticate!"
            );
        } else {
            this.poeCookie = poeCookie.split("|")[0];
            this.poeLatCookie = poeCookie.split("|")[1];
        }

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

        if (isMobile) {
            await this.page.emulate(puppeteer.KnownDevices["Galaxy S9+"]);
        }

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
            // Object.defineProperty(navigator, "languages", {
            //     value: ["en-US", "en"],
            //     writable: false,
            // });
            // Object.defineProperty(navigator, "appVersion", {
            //     value: "5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
            //     writable: false,
            // });
        });

        // await this.page.goto("https://bot.sannysoft.com/");

        // await delay(12000);

        await this.page.goto("https://poe.com/", { waitUntil: "networkidle2" });
        await delay(1000);
        // Wait for user to authenticate manually if enabled
        if (this.waitForAuth > 0) {
            await delay(this.waitForAuth);
        } else {
            await this.page.setCookie({ name: "p-b", value: this.poeCookie });
            if (this.poeLatCookie !== "") {
                await this.page.setCookie({
                    name: "p-lat",
                    value: this.poeLatCookie,
                });
            }
        }
        await delay(1000);
        await this.page.goto("https://poe.com/", { waitUntil: "networkidle2" });
        await delay(1000);

        await this.page.goto("https://poe.com/settings", {
            waitUntil: "networkidle2",
        });

        try {
            await this.page.evaluate((classname) => {
                let label = document.querySelector(classname);
                if (label.parentElement.childNodes[0].checked) {
                    label.click();
                }
            }, OPEN_IN_APP_TOGGLER_CLASS);
        } catch {
            console.log(
                "WARNING: Couldn't disable 'Open in App' automatically, please disable it manually by going into poe.com/settings"
            );
        }

        // Attempting to force language to be english while still at /settings
        try {
            // As far as I know, page.select() doesn't allow anything other than a string, so no choice but to
            // manually assign an id to the needed select element.
            await this.page.evaluate((classname) => {
                document.querySelectorAll(classname)[1].id = "lang";
            }, LANGUAGE_SELECT_CLASS);

            await this.page.select("select#lang", "en");
            await delay(300);
        } catch (e) {
            console.log(
                "WARNING: Couldn't change language! Please send the next line to the developer via discord. Integration may fail to work!"
            );
            console.log(JSON.stringify(e));
        }

        await delay(200);

        // Just in case!
        if (this.botName === undefined) this.botName = "gptforst";

        await this.page.goto(`https://poe.com/${this.botName}`);

        await delay(700);

        // Looks like Poe just loves random popups. Why man, why...
        let allPopupsClosed = false;
        while (!allPopupsClosed) {
            if ((await this.page.$(MODAL_CLOSE_CLASS)) !== null) {
                let modalCloseButton = await this.page.waitForSelector(
                    MODAL_CLOSE_CLASS
                );
                await modalCloseButton.click();
                console.log("A popup was blocked!!");
                await delay(400);
            } else {
                allPopupsClosed = true;
            }
        }

        if ((await this.page.$(LOGGED_OUT_CLASS)) !== null) {
            console.log(
                "Poe.com did not authenticate with the provided cookie - Logged out button was present on the page!"
            );
            return false;
        }

        let title = await this.page.title();
        console.log(`DEBUG: Current page title: ${title}`);

        return true;
    }

    async getLatestMessage() {
        // this creates issues with jailbreak message being sent twice & the response of the second JB
        // getting taken as the response to the RP.
        // Until a fix is found, I suggest just throttling it slightly

        await delay(700);
        await this.page.evaluate((classname) => {
            document.querySelector(classname).scrollIntoView();
        }, CHAT_GROW_CLASS);
        await delay(300);
        console.log("before last message");
        let lastMessage = await this.page.$$eval(
            MESSAGE_BUBBLE_CLASS,
            (allMessages) => {
                return allMessages[allMessages.length - 1].childNodes[0]
                    .innerHTML;
            }
        );

        console.log("after last message");
        console.log(lastMessage);

        if (lastMessage === "...") {
            return null;
        }

        let turndown = new Turndown();

        return turndown
            .turndown(lastMessage.replaceAll("\n", "\\n"))
            .replaceAll("\\\\n", "\n")
            .replaceAll("\\", "");
    }

    async getLatestMessageStreaming() {
        let lastMessage = await this.page.$$eval(
            MESSAGE_BUBBLE_CLASS,
            (allMessages) => {
                let lastMessageContainer =
                    allMessages[allMessages.length - 1].childNodes[0];
                lastMessageContainer.scrollIntoView();
                return lastMessageContainer.innerHTML;
            }
        );

        if (lastMessage === "...") {
            return "";
        }

        let turndown = new Turndown();

        return (
            turndown
                .turndown(lastMessage.replaceAll("\n", "\\n"))
                .replaceAll("\\\\n", "\n")
                // Just for test, may be removed later.
                .replaceAll("*", "_")
                .replaceAll("\\", "")
        );
    }

    async sendMessage(message, page = this.page) {
        try {
            //searching via classname raises errors from time to time for some reason

            let title = await page.title();
            console.log(`DEBUG: Current page title during SEND: ${title}`);

            if (this.page.$("textarea") === null) {
                throw new Error("Input element not found! Aborting.");
            }

            await page.evaluate((message) => {
                let tarea = document.querySelector("textarea");
                tarea.value = message;
                tarea.click();
            }, message);

            let inputForm = await page.$("textarea");

            await delay(500);

            await inputForm.press("Space");

            // Since this is used only for info logging and is easy to get,
            // decided not to add it for now.
            console.log(
                `After test manipulation: ${await page.evaluate(
                    `document.querySelector(".ChatMessageSendButton_sendButton__4ZyI4").disabled`
                )}`
            );

            await delay(5);
            await inputForm.press("Backspace");

            await delay(20);

            await inputForm.press("Enter");

            await delay(100);

            let waitingForMessage = true;
            while (waitingForMessage) {
                if ((await page.$(MESSAGE_BUBBLE_CLASS)) === null) {
                    await delay(5);
                    continue;
                }

                let lastMessage = await page.$$eval(
                    MESSAGE_BUBBLE_CLASS,
                    (allMessages) => {
                        return allMessages[allMessages.length - 1].innerHTML;
                    }
                );

                if (lastMessage === "...") {
                    await delay(5);
                    continue;
                }

                waitingForMessage = false;
            }

            // In some cases, especially with smaller messages (e.g. jailbreak) it simply flies through without
            // being able to register that the message is already completed
            await delay(20);
            return true;
        } catch (e) {
            console.log(e);
            return false;
        }
    }

    // Basically the same as sendMessage, but with an extra file upload,
    // and only textPrompt being typed out in the input form
    async sendFileMessage(message, textPrompt) {
        try {
            let title = await this.page.title();
            console.log(
                `DEBUG: Current page title during SEND via file: ${title}`
            );

            if (this.page.$("textarea") === null) {
                throw new Error("Input element not found! Aborting.");
            }

            await this.page.evaluate((message) => {
                let tarea = document.querySelector("textarea");
                tarea.value = message;
                tarea.click();
            }, textPrompt);

            let inputForm = await this.page.$("textarea");

            await delay(500);

            await inputForm.press("Space");

            console.log(
                `After test manipulation: ${await this.page.evaluate(
                    "document.querySelector('.ChatMessageSendButton_sendButton__4ZyI4').disabled"
                )}`
            );

            await delay(5);
            await inputForm.press("Backspace");

            await delay(20);

            fs.writeFileSync(".msg.txt", message);

            let fileUploadElement = await this.page.$(FILE_ATTACH_CLASS);
            await fileUploadElement.uploadFile(".msg.txt");

            await delay(20);

            await inputForm.press("Enter");

            await delay(100);

            let waitingForMessage = true;
            while (waitingForMessage) {
                if ((await this.page.$(MESSAGE_BUBBLE_CLASS)) === null) {
                    await delay(5);
                    continue;
                }

                let lastMessage = await this.page.$$eval(
                    MESSAGE_BUBBLE_CLASS,
                    (allMessages) => {
                        return allMessages[allMessages.length - 1].innerHTML;
                    }
                );

                if (lastMessage === "...") {
                    await delay(5);
                    continue;
                }

                waitingForMessage = false;
            }

            // In some cases, especially with smaller messages (e.g. jailbreak) it simply flies through without
            // being able to register that the message is already completed
            await delay(20);
            return true;
        } catch (e) {
            console.log(e);
            return false;
        }
    }

    async abortMessage() {
        let stillGenerating = await this.isGenerating();
        if (!stillGenerating) return false;

        if ((await this.page.$(STOP_BUTTON_CLASS)) === null) {
            return false;
        }

        await this.page.locator(STOP_BUTTON_CLASS).click();

        await delay(100);
        return true;
    }

    async clearContext() {
        let stillGenerating = await this.isGenerating();
        if (stillGenerating) await this.abortMessage();

        await this.page.locator(PURGE_CHAT_CLASS).click();

        return true;
    }

    async newChat() {
        await this.page.goto(`https://poe.com/${this.botName}`);
    }

    async isGenerating(streaming = false) {
        // too fast for its own good, checks before stop button even appears, so
        // a bit of throttling fixes it
        if (!streaming) await delay(250);

        if ((await this.page.$(TOKEN_EXCEEDED_MESSAGE_CLASS)) !== null) {
            throw new Error("ERROR: Token window exceeded!!!!!!!!!");
        }

        // Temporarly changed to detect message status by its action bar instead of suggestions
        if ((await this.page.$(MESSAGE_ACTION_BAR_CLASS)) !== null) {
            return false;
        }

        return true;
    }

    // Currently not working due to SillyTavern itself ((
    async getSuggestions() {
        await delay(5000);

        let suggestedMessages = await this.page.$$eval(
            SUGGESTED_REPLY_CLASS,
            (allMessages) => {
                return allMessages.map(
                    (message) => message.childNodes[0].textContent
                );
            }
        );

        if (suggestedMessages.length === 0) {
            return [];
        }

        return suggestedMessages;
    }

    async deleteMessages(count) {
        // Poe decided not to show triple dot buttons for long messages, rendering it only if the message header
        // is in the view. This scrolls to it, forcing it to be shown before initializing further operations.
        await this.page.evaluate(
            (
                messageContainerClass,
                errorMessageContainerClass,
                threeDotContainerClass
            ) => {
                let messageElements = document.querySelectorAll(
                    messageContainerClass
                );
                messageElements[messageElements.length - 1].scrollIntoView();

                // Poe can sometimes lose connection to its servers, creating an element unusable for purging
                // the conversation, creating issues in purge logic. This code moves the focus to an element
                // above the last if such an error is detected.
                if (
                    document.querySelectorAll(errorMessageContainerClass)
                        .length === 0
                ) {
                    let allThreeDotsButtons = document.querySelectorAll(
                        threeDotContainerClass
                    );
                    allThreeDotsButtons[allThreeDotsButtons.length - 1].click();
                } else {
                    messageElements[
                        messageElements.length - 2
                    ].scrollIntoView();
                    let allThreeDotsButtons = document.querySelectorAll(
                        threeDotContainerClass
                    );
                    allThreeDotsButtons[allThreeDotsButtons.length - 2].click();
                    //count += 1;
                }
            },
            MESSAGE_CONTAINER_CLASS,
            ERROR_MESSAGE_CLASS,
            THREE_DOT_MENU_CLASS
        );

        await this.page
            .locator(DROPDOWN_DELETE_BUTTON_CLASS)
            .setEnsureElementIsInTheViewport(false)
            .setVisibility(null)
            .click();

        await delay(100);

        await this.page.evaluate(
            (c, messageContainerClass) => {
                let allMessageContainers = document.querySelectorAll(
                    messageContainerClass
                );
                for (
                    let i = allMessageContainers.length - 2;
                    i > allMessageContainers.length - 1 - c;
                    i--
                ) {
                    allMessageContainers[i].click();
                }
            },
            count,
            FULL_MESSAGE_CONTAINER_CLASS
        );

        await delay(100);

        await this.page
            .locator(DELETE_BUTTON_CLASS)
            .setEnsureElementIsInTheViewport(false)
            .setVisibility(null)
            .click();

        await delay(100);

        // After the first message, poe displays a pop up modal to confirm the deletion of the last two messages.
        // Apparently, Poe updated the button classes in said modal, making the previous method to confirm the deletion not work.
        // HUGE thanks to LegendPoet for providing this fix!!!

        await this.page.waitForSelector(DELETE_CONFIRM_BUTTON_SELECTOR);

        await this.page.evaluate((classname) => {
            document.querySelector(classname).click();
        }, DELETE_CONFIRM_BUTTON_SELECTOR);
    }

    async getBotNames(page = this.page) {
        await page.evaluate((classname) => {
            [...document.querySelectorAll(classname)]
                .filter((_) => _.innerHTML === "Your bots")[0]
                .click();
        }, SIDEBAR_ITEM_CLASS);

        // Basically, scroll a bunch of times so that all bots are loaded.
        // The scroll trigger element gets populated while loading, so if it's no longer loading then that means no new bots are going to
        // be loaded
        await page.waitForSelector(INFINITE_SCROLL_CLASS);

        //let stillMoreBotsToLoad = true;

        let safetyCounter = 0;

        // Temporary fix, since checking for loading of more bots is janky
        // Basically, the loading animation appears and disappears almost instantly
        // Although, this also means that we can safely iterate for a bit, since
        // not a lot of latency is created.

        while (/* stillMoreBotsToLoad || */ safetyCounter < 6) {
            await page.evaluate((classname) => {
                document.querySelector(classname).scrollIntoView();
            }, INFINITE_SCROLL_CLASS);

            /* await delay(100);

            stillMoreBotsToLoad = await this.page.$eval(
                ".InfiniteScroll_pagingTrigger__Egmr6",
                (elem) => {
                    return elem.childNodes.length > 0;
                }
            ); */

            safetyCounter++;
            await delay(400);
        }

        let botNames = await page.$$eval(
            BOT_NAME_CONTAINER_CLASS,
            (containers) => {
                return containers.map(
                    (container) => container.childNodes[0].textContent
                );
            }
        );

        await page.evaluate((classname) => {
            document.querySelector(classname).click();
        }, GENERIC_MODAL_CLOSE_CLASS);

        return Array.from(new Set(botNames));
    }

    async changeBot(botName) {
        if (botName === undefined) {
            console.log(`Bot name was ${botName}`);
            this.botName = "GPTforST";
        } else {
            this.botName = botName;
        }
        await this.page.goto(`https://poe.com/${this.botName}`);
        try {
            await this.page.evaluate((classname) => {
                document.querySelector(classname).click();
            }, GENERIC_MODAL_CLOSE_CLASS);
        } catch {
            //do nothing for now lmao
        }

        return true;
    }

    async checkRemainingMessages() {
        if ((await this.page.$(OUT_OUF_MESSAGES_CLASS)) === null) {
            return true;
        }

        let remainingMessagesElem = await this.page.$eval(
            OUT_OUF_MESSAGES_CLASS,
            (elem) => elem
        );

        console.log(remainingMessagesElem);
        return false;
    }

    async addBot(botName) {
        // Old implementation, seems to not work in headless mode.
        // Rewritten not to use a second tab instead

        // let newPage = await this.browser.newPage();
        // await newPage.goto(`https://poe.com/${botName}`);

        // if ((await newPage.$(".next-error-h1")) !== null) {
        //     console.log(`Couldn't add bot ${botName}`);
        //     await newPage.close();
        //     return { error: true };
        // }

        // let successfullySentMessage = await this.sendMessage("Hey", newPage);
        // if (!successfullySentMessage) {
        //     console.log(
        //         `Couldn't add bot ${botName} - error during sending message`
        //     );
        //     await newPage.close();
        //     return { error: true };
        // }

        // await newPage.reload();

        // let newBotNames = await this.getBotNames(newPage);
        // await newPage.close();
        // return { error: false, newBotNames };

        // Apparently, issues when adding a bot were a notorious Puppeteer bug
        // Thought of a way to implement that without getting hit with that
        // dollar store navigation bug

        let currentPage = await this.page.evaluate(() => {
            return window.location.href;
        });

        console.log(currentPage);

        await this.page.goto(`https://poe.com/${botName}`);

        if ((await this.page.$(".next-error-h1")) !== null) {
            console.log(`Couldn't add bot ${botName} - bot not found!`);
            await this.page.goto(currentPage);
            return { error: true };
        }

        let successfullySentMessage = await this.sendMessage("Hey");
        // temporary throttle
        await delay(1000);

        if (!successfullySentMessage) {
            console.log(
                `Couldn't add bot ${botName} - error during sending message`
            );
            await this.page.goto(currentPage);
            return { error: true };
        }

        await this.page.goto(currentPage);

        let newBotNames = await this.getBotNames();
        return { error: false, newBotNames };
    }
}

module.exports = PoeClient;
