const DEFAULT_WINDOWS_PATH =
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const DEFAULT_OSX_PATH =
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const puppeteer = require("puppeteer-core");
const { PuppeteerExtra } = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const Turndown = require("turndown");
const randomUseragent = require("random-useragent");
const fs = require("fs");

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
        this.botName = botName;

        console.log(`BOTNAME DURING INITIALIZING: ${this.botName}`);
    }

    async closeDriver() {
        await this.browser.close();
    }

    async initializeDriver() {
        let isMobile = false;

        // Very poor code, but it's 3 am so I can't be bothered to fix this lmao
        try {
            this.browser = await puppeteer.launch({
                executablePath:
                    "/data/data/com.termux/files/usr/bin/chromium-browser",
                headless: "new",
            });
            isMobile = true;
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
                    try {
                        this.browser = await puppeteer.launch({
                            executablePath: DEFAULT_OSX_PATH,
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
            Object.defineProperty(navigator, "languages", {
                value: ["en-US", "en"],
                writable: false,
            });
            // Object.defineProperty(navigator, "appVersion", {
            //     value: "5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
            //     writable: false,
            // });
        });

        // await this.page.goto("https://bot.sannysoft.com/");

        // await delay(12000);

        await this.page.goto("https://poe.com/");
        await delay(1000);
        await this.page.setCookie({ name: "p-b", value: this.poeCookie });
        await delay(1000);
        await this.page.goto("https://poe.com");
        await delay(1000);

        await this.page.goto("https://poe.com/settings", {
            waitUntil: "networkidle0",
        });

        try {
            await this.page.evaluate(() => {
                let label = document.querySelector(
                    ".ToggleSwitch_slider__ih5sC"
                );
                if (label.parentElement.childNodes[0].checked) {
                    label.click();
                }
            });
        } catch {
            console.log(
                "WARNING: Couldn't disable 'Open in App' automatically, please disable it manually by going into poe.com/settings"
            );
        }

        await delay(200);

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
            (await this.page.$(".LoggedOutBotInfoPage_appButton__DZ5ol")) !==
            null
        ) {
            console.log(
                "Poe.com did not authenticate with the provided cookie - Logged out wrapper was present on the page!"
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
        await this.page.evaluate(() => {
            document
                .querySelector(".ChatPageMain_flexGrow__UnM8q")
                .scrollIntoView();
        });
        console.log("before last message");
        let lastMessage = await this.page.$$eval(
            ".Message_botMessageBubble__aYctV",
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
            ".Message_botMessageBubble__aYctV",
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

            console.log(
                `After test manipulation: ${await page.evaluate(
                    "document.querySelector('.ChatMessageSendButton_sendButton__4ZyI4').disabled"
                )}`
            );

            await delay(5);
            await inputForm.press("Backspace");

            await delay(20);

            await inputForm.press("Enter");

            await delay(100);

            let waitingForMessage = true;
            while (waitingForMessage) {
                if (
                    (await page.$(".Message_botMessageBubble__aYctV")) === null
                ) {
                    await delay(5);
                    continue;
                }

                let lastMessage = await page.$$eval(
                    ".Message_botMessageBubble__aYctV",
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

            let fileUploadElement = await this.page.$(
                ".ChatMessageFileInputButton_input__svNx4"
            );
            await fileUploadElement.uploadFile(".msg.txt");

            await delay(20);

            await inputForm.press("Enter");

            await delay(100);

            let waitingForMessage = true;
            while (waitingForMessage) {
                if (
                    (await this.page.$(".Message_botMessageBubble__aYctV")) ===
                    null
                ) {
                    await delay(5);
                    continue;
                }

                let lastMessage = await this.page.$$eval(
                    ".Message_botMessageBubble__aYctV",
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
            (await this.page.$(".ChatStopMessageButton_stopButton__QOW41")) ===
            null
        ) {
            return false;
        }

        await this.page
            .locator(".ChatStopMessageButton_stopButton__QOW41")
            .click();

        await delay(100);
        return true;
    }

    async clearContext() {
        let stillGenerating = await this.isGenerating();
        if (stillGenerating) await this.abortMessage();

        await this.page.locator(".ChatBreakButton_button__zyEye").click();

        return true;
    }

    async newChat() {
        await this.page.goto(`https://poe.com/${this.botName}`);
    }

    async isGenerating(streaming = false) {
        // too fast for its own good, checks before stop button even appears, so
        // a bit of throttling fixes it
        if (!streaming) await delay(250);

        if ((await this.page.$(".Message_noSignIcon__11Dy5")) !== null) {
            throw new Error("ERROR: Token window exceeded!!!!!!!!!");
        }

        // Temporarly changed to detect message status by its action bar instead of suggestions
        if (
            (await this.page.$(".ChatMessageActionBar_actionBar__gyeEs")) !==
            null
        ) {
            return false;
        }

        return true;
    }

    // Currently not working due to SillyTavern itself ((
    async getSuggestions() {
        await delay(5000);

        let suggestedMessages = await this.page.$$eval(
            ".ChatMessageSuggestedReplies_suggestedReply__dmJO1",
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
                ".ChatMessage_chatMessage__xkgHx"
            );
            messageElements[messageElements.length - 1].scrollIntoView();

            // Poe can sometimes lose connection to its servers, creating an element unusable for purging
            // the conversation, creating issues in purge logic. This code moves the focus to an element
            // above the last if such an error is detected.
            if (
                document.querySelectorAll(".Message_errorBubble__Bl92G")
                    .length === 0
            ) {
                let allThreeDotsButtons = document.querySelectorAll(
                    ".ChatMessageOverflowButton_overflowButtonWrapper__gzb2s"
                );
                allThreeDotsButtons[allThreeDotsButtons.length - 1].click();
            } else {
                messageElements[messageElements.length - 2].scrollIntoView();
                let allThreeDotsButtons = document.querySelectorAll(
                    ".ChatMessageOverflowButton_overflowButtonWrapper__gzb2s"
                );
                allThreeDotsButtons[allThreeDotsButtons.length - 2].click();
                //count += 1;
            }
        });

        await this.page
            .locator(".DropdownMenuItem_destructive__Bi9MD")
            .setEnsureElementIsInTheViewport(false)
            .setVisibility(null)
            .click();

        await delay(100);

        await this.page.evaluate((c) => {
            let allMessageContainers = document.querySelectorAll(
                ".ChatMessage_messageRow__DHlnq"
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
            .locator(".ChatPageDeleteFooter_button__6xWPc")
            .setEnsureElementIsInTheViewport(false)
            .setVisibility(null)
            .click();

        await delay(100);

        // After the first message, poe displays a pop up modal to confirm the deletion of the last two messages.
        // Apparently, Poe updated the button classes in said modal, making the previous method to confirm the deletion not work.
        // HUGE thanks to LegendPoet for providing this fix!!!

        await this.page.waitForSelector(
            "div.MessageDeleteConfirmationModal_options__31rdn>button.Button_danger__Xy8Ox"
        );

        await this.page.evaluate(() => {
            document
                .querySelector(
                    "div.MessageDeleteConfirmationModal_options__31rdn>button.Button_danger__Xy8Ox"
                )
                .click();
        });
    }

    async getBotNames(page = this.page) {
        await page.evaluate(() => {
            [...document.querySelectorAll(".SidebarItem_label__Ug6_M")]
                .filter((_) => _.innerHTML === "Your bots")[0]
                .click();
        });

        // Basically, scroll a bunch of times so that all bots are loaded.
        // The scroll trigger element gets populated while loading, so if it's no longer loading then that means no new bots are going to
        // be loaded
        await page.waitForSelector(".InfiniteScroll_pagingTrigger__cdz9I");

        //let stillMoreBotsToLoad = true;

        let safetyCounter = 0;

        // Temporary fix, since checking for loading of more bots is janky
        // Basically, the loading animation appears and disappears almost instantly
        // Although, this also means that we can safely iterate for a bit, since
        // not a lot of latency is created.

        while (/* stillMoreBotsToLoad || */ safetyCounter < 4) {
            await page.evaluate(() => {
                document
                    .querySelector(".InfiniteScroll_pagingTrigger__cdz9I")
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

        let botNames = await page.$$eval(
            ".BotHeader_textContainer__kVf_I",
            (containers) => {
                return containers.map(
                    (container) => container.childNodes[0].innerHTML
                );
            }
        );

        await page.evaluate(() => {
            document.querySelector(".Modal_closeButton__GycnR").click();
        });

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
            await this.page.evaluate(() => {
                document.querySelector(".Modal_closeButton__GycnR").click();
            });
        } catch {
            //do nothing for now lmao
        }

        return true;
    }

    async checkRemainingMessages() {
        if (
            (await this.page.$(
                ".ChatMessageSendButton_noFreeMessageTooltip__9IhzY"
            )) === null
        ) {
            return true;
        }

        let remainingMessagesElem = await this.page.$eval(
            ".ChatMessageSendButton_noFreeMessageTooltip__9IhzY",
            (elem) => elem
        );

        console.log(remainingMessagesElem);
        return false;
    }

    async addBot(botName) {
        let newPage = await this.browser.newPage();
        await newPage.goto(`https://poe.com/${botName}`);

        if ((await this.page.$(".next-error-h1")) !== null) {
            console.log(`Couldn't add bot ${botName}`);
            await newPage.close();
            return { error: true };
        }

        let successfullySentMessage = await this.sendMessage("Hey", newPage);
        if (!successfullySentMessage) {
            console.log(
                `Couldn't add bot ${botName} - error during sending message`
            );
            await newPage.close();
            return { error: true };
        }

        await newPage.reload();

        let newBotNames = await this.getBotNames(newPage);
        await newPage.close();
        return { error: false, newBotNames };
    }
}

module.exports = PoeClient;
