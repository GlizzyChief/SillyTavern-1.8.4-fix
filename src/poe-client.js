const DEFAULT_WINDOWS_PATH =
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const puppeteer = require("puppeteer-core");
const { PuppeteerExtra } = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const Turndown = require("turndown");
const TurndownService = require("turndown");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const puppeteerWithPlugin = new PuppeteerExtra(puppeteer);

let stealthPlugin = StealthPlugin();

puppeteerWithPlugin.use(stealthPlugin);

class PoeClient {
    browser = null;
    page = null;
    botName = "gptforst";

    constructor(poeCookie, botName) {
        this.poeCookie = poeCookie;
        // Currently, Assistant doesn't seem to work. This is simply a failsafe
        if (botName === "Assistant") {
            this.botname = "gptforst";
        } else {
            this.botName = botName;
        }

        console.log(`BOTNAME DURING INITIALIZING: ${this.botName}`);
    }

    async closeDriver() {
        await this.browser.close();
    }

    async initializeDriver() {
        try {
            this.browser = await puppeteer.launch({
                executablePath:
                    "/data/data/com.termux/files/usr/bin/chromium-browser",
                headless: "new",
            });
        } catch {
            try {
                this.browser = await puppeteer.launch({
                    executablePath: DEFAULT_WINDOWS_PATH,
                    headless: false,
                });
            } catch {
                try {
                    this.browser = await puppeteer.launch({
                        executablePath:
                            "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
                        headless: false,
                    });
                } catch {
                    this.browser = await puppeteer.launch({
                        executablePath: "/usr/bin/chromium",
                        headless: false,
                    });
                }
            }
        }

        this.page = await this.browser.newPage();

        await this.page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, "webdriver", {
                value: false,
                writable: false,
            });
            if (navigator.platform === "Win32") {
                Object.defineProperty(navigator, "userAgent", {
                    value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
                });
            } else {
                Object.defineProperty(navigator, "userAgent", {
                    value: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
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
        });

        // await this.page.goto("https://bot.sannysoft.com/");

        // await delay(12000);

        await this.page.goto("https://poe.com");
        await delay(1000);
        await this.page.setCookie({ name: "p-b", value: this.poeCookie });
        await delay(1000);
        await this.page.goto("https://poe.com");
        await delay(1000);

        // Just in case!
        if (this.botName === undefined) this.botName = "gptforst";

        await this.page.goto(`https://poe.com/${this.botName}`);

        await delay(700);

        // Looks like Poe just loves random popups. Why man, why...
        let allPopupsClosed = false;
        while (!allPopupsClosed) {
            if ((await this.page.$(".Modal_closeButton__ZYPm5")) !== null) {
                let modalCloseButton = await this.page.waitForSelector(
                    ".Modal_closeButton__ZYPm5"
                );
                await modalCloseButton.click();
                console.log("A popup was blocked!!");
                await delay(400);
            } else {
                allPopupsClosed = true;
            }
        }

        if (
            (await this.page.$(".LoggedOutBotInfoPage_appButton__UO6NU")) !==
            null
        ) {
            console.log(
                "Poe.com did not authenticate with the provided cookie - logged out modal appeared out of nowhere!"
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

        await delay(1000);
        console.log("before last message");
        let lastMessage = await this.page.$$eval(
            ".Message_botMessageBubble__CPGMI",
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
            ".Message_botMessageBubble__CPGMI",
            (allMessages) => {
                return allMessages[allMessages.length - 1].childNodes[0]
                    .innerHTML;
            }
        );

        if (lastMessage === "...") {
            return "";
        }

        let turndown = new Turndown();

        return turndown
            .turndown(lastMessage.replaceAll("\n", "\\n"))
            .replaceAll("\\\\n", "\n")
            .replaceAll("\\", "");
    }

    async sendMessage(message) {
        try {
            //searching via classname raises errors from time to time for some reason

            if (this.page.$("textarea") === null) {
                throw new Error("Input element not found! Aborting.");
            }

            await this.page.evaluate((message) => {
                document.querySelector("textarea").value = message;
            }, message);

            let inputForm = await this.page.$("textarea");

            await delay(500);

            await inputForm.press("Space");

            await delay(5);
            await inputForm.press("Backspace");

            await delay(20);

            await inputForm.press("Enter");

            await delay(100);

            let waitingForMessage = true;
            while (waitingForMessage) {
                if (
                    (await this.page.$(".Message_botMessageBubble__CPGMI")) ===
                    null
                ) {
                    await delay(5);
                    continue;
                }

                let lastMessage = await this.page.$$eval(
                    ".Message_botMessageBubble__CPGMI",
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

        if (
            (await this.page.$(".ChatStopMessageButton_stopButton__LWNj6")) ===
            null
        ) {
            return false;
        }

        await this.page
            .locator(".ChatStopMessageButton_stopButton__LWNj6")
            .click();

        await delay(100);
        return true;
    }

    async clearContext() {
        let stillGenerating = await this.isGenerating();
        if (stillGenerating) await this.abortMessage();

        await this.page.locator(".ChatBreakButton_button__EihE0").click();

        return true;
    }

    async isGenerating(streaming = false) {
        // too fast for its own good, checks before stop button even appears, so
        // a bit of throttling fixes it
        if (!streaming) await delay(150);

        if ((await this.page.$(".Message_noSignIcon__3f_KY")) !== null) {
            throw new Error("ERROR: Token window exceeded!!!!!!!!!");
        }

        if (
            (await this.page.$(
                ".ChatMessageSuggestedReplies_suggestedRepliesContainer__v6sxJ"
            )) !== null
        ) {
            return false;
        }

        return true;
    }

    // Currently not working due to SillyTavern itself ((
    async getSuggestions() {
        await delay(5000);

        let suggestedMessages = await this.page.$$eval(
            ".ChatMessageSuggestedReplies_suggestedRepliesContainer__v6sxJ",
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
        await this.page.evaluate(() => {
            let messageElements = document.querySelectorAll(
                ".ChatMessage_chatMessage__BmN0M"
            );
            messageElements[messageElements.length - 1].scrollIntoView();

            // Poe can sometimes lose connection to its servers, creating an element unusable for purging
            // The conversation, creating issues in purge logic. This code moves the focus to an element
            // above the last if such an error is detected.
            if (
                document.querySelectorAll(".Message_errorBubble__XFYk8")
                    .length === 0
            ) {
                let allThreeDotsButtons = document.querySelectorAll(
                    ".ChatMessageOverflowButton_overflowButton__Yn0Lo"
                );
                allThreeDotsButtons[allThreeDotsButtons.length - 1].click();
            } else {
                messageElements[messageElements.length - 2].scrollIntoView();
                let allThreeDotsButtons = document.querySelectorAll(
                    ".ChatMessageOverflowButton_overflowButton__Yn0Lo"
                );
                allThreeDotsButtons[allThreeDotsButtons.length - 2].click();
                count += 1;
            }
        });

        await this.page
            .locator(".DropdownMenuItem_destructive__yp0hK")
            .setEnsureElementIsInTheViewport(false)
            .setVisibility(null)
            .click();

        await delay(100);

        await this.page.evaluate((c) => {
            let allMessageContainers = document.querySelectorAll(
                ".ChatMessage_messageRow__WMtnL"
            );
            for (
                let i = allMessageContainers.length - 2;
                i > allMessageContainers.length - 1 - c;
                i--
            ) {
                allMessageContainers[i].click();
            }
        }, count);

        await delay(100);

        await this.page
            .locator(".ChatPageDeleteFooter_button__cWtyA")
            .setEnsureElementIsInTheViewport(false)
            .setVisibility(null)
            .click();

        await delay(100);

        // After the first message, poe displays a pop up modal to confirm the deletion of the last two messages.
        // Apparently, Poe updated the button classes in said modal, making the previous method to confirm the deletion not work.
        // HUGE thanks to LegendPoet for providing this fix!!!

        await this.page.waitForSelector(
            "div.MessageDeleteConfirmationModal_options__RVyZn>button.Button_danger__zI3OH"
        );

        await this.page.evaluate(() => {
            document
                .querySelector(
                    "div.MessageDeleteConfirmationModal_options__RVyZn>button.Button_danger__zI3OH"
                )
                .click();
        });
    }

    async getBotNames() {
        await this.page.evaluate(() => {
            if (
                document.querySelectorAll(
                    ".PageWithSidebarNavItem_label__WUzi5"
                )[3]?.childNodes[1]?.textContent === "Your bots"
            ) {
                document
                    .querySelectorAll(".PageWithSidebarNavItem_label__WUzi5")[3]
                    .click();
            } else {
                document
                    .querySelectorAll(".PageWithSidebarNavItem_label__WUzi5")[2]
                    .click();
            }
        });

        // Basically, scroll a bunch of times so that all bots are loaded.
        // The scroll trigger element gets populated while loading, so if it's no longer loading then that means no new bots are going to
        // be loaded
        await this.page.waitForSelector(".InfiniteScroll_pagingTrigger__Egmr6");

        //let stillMoreBotsToLoad = true;

        let safetyCounter = 0;

        // Temporary fix, since checking for loading of more bots is janky
        // Basically, the loading animation appears and disappears almost instantly
        // Although, this also means that we can safely iterate for a bit, since
        // not a lot of latency is created.

        while (/* stillMoreBotsToLoad || */ safetyCounter < 4) {
            await this.page.evaluate(() => {
                document
                    .querySelector(".InfiniteScroll_pagingTrigger__Egmr6")
                    .scrollIntoView();
            });

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

        let botNames = await this.page.$$eval(
            ".BotHeader_textContainer__W6BjF",
            (containers) => {
                return containers.map(
                    (container) => container.childNodes[0].innerHTML
                );
            }
        );

        await this.page
            .locator(".Modal_closeButton__ZYPm5")
            .setEnsureElementIsInTheViewport(false)
            .setVisibility(null)
            .click();

        return Array.from(new Set(botNames));
    }

    // No error handling currently implemented for non-existing bots :/
    async changeBot(botName) {
        // Currently, Assistant doesn't seem to work, so this is simply a failsafe.
        if (botName === "Assistant" || botName === undefined) {
            console.log(`Bot name was ${botName}`);
            this.botName = "ChatGPT";
        } else {
            this.botName = botName;
        }
        await this.page.goto(`https://poe.com/${this.botName}`);

        return true;
    }
}

module.exports = PoeClient;
