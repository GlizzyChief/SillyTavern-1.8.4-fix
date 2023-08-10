const DEFAULT_WINDOWS_PATH =
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const puppeteer = require("puppeteer-core");
const { PuppeteerExtra } = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const { NodeHtmlMarkdown } = require("node-html-markdown");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const puppeteerWithPlugin = new PuppeteerExtra(puppeteer);

let stealthPlugin = StealthPlugin();

puppeteerWithPlugin.use(stealthPlugin);

class PoeClient {
    browser = null;
    page = null;
    botName = "ChatGPT";

    constructor(poeCookie, botName) {
        this.poeCookie = poeCookie;
        // Currently, Assistant doesn't seem to work. This is simply a failsafe
        if (botName === "Assistant") {
            this.botname = "ChatGPT";
        } else {
            this.botName = botName;
        }
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
            this.browser = await puppeteer.launch({
                executablePath: DEFAULT_WINDOWS_PATH,
                headless: false,
            });
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
        if (this.botName === undefined) this.botName = "ChatGPT";

        await this.page.goto(`https://poe.com/${this.botName}`);

        await delay(700);
        if ((await this.page.$(".Modal_closeButton__ZYPm5")) !== null) {
            let modalCloseButton = await this.page.waitForSelector(
                ".Modal_closeButton__ZYPm5"
            );
            await modalCloseButton.click();
            await delay(200);
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

        return true;
    }

    async getLatestMessage() {
        // this creates issues with jailbreak message being sent twice & the response of the second JB
        // getting taken as the response to the RP.
        // Until a fix is found, I suggest just throttling it slightly

        await delay(1000);
        console.log("before last message");
        //let messages = await this.driver.findElements(By.xpath('//div[contains(@class, "Message_botMessageBubble__CPGMI")]'));
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

        return NodeHtmlMarkdown.translate(
            lastMessage.replaceAll("\\*", "*").replaceAll("_", "*")
        );
    }

    async sendMessage(message) {
        try {
            //searching via classname raises errors from time to time for some reason
            //let inputForm = await this.driver.findElement(By.css("textarea"));

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
                //let messages = await this.driver.findElements(By.xpath('//div[contains(@class, "Message_botMessageBubble__CPGMI")]'));

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

    async isGenerating() {
        // too fast for its own good, checks before stop button even appears, so
        // a bit of throttling fixes it
        await delay(150);

        console.log("Currently in generating");

        if (
            (await this.page.$(
                ".ChatMessageSuggestedReplies_suggestedRepliesContainer__JgW12"
            )) !== null
        ) {
            return false;
        }

        return true;
    }

    async getSuggestions() {
        await delay(5000);
        let suggestionContainers = await this.driver.findElements(
            By.className(
                "ChatMessageSuggestedReplies_suggestedRepliesContainer__JgW12"
            )
        );

        if (suggestionContainers.length === 0) {
            return [];
        }

        let suggestions = [];

        let suggestionButtons = await suggestionContainers[0].findElements(
            By.css("button")
        );

        //console.log(suggestionButtons);

        for (let suggestionButton of suggestionButtons) {
            let suggestion = await suggestionButton.getText();
            suggestions.push(suggestion);
        }

        console.log(suggestions);
        return suggestions;
    }

    // Not implemented currently
    // async deleteLatestMessage() {
    //     let botMessages = await this.driver.findElements(By.xpath('//div[contains(@class, "Message_botMessageBubble__CPGMI")]'));
    //     let latestMessage = botMessages[botMessages.length - 1];

    //     //console.log(latestMessage);
    // }

    async getBotNames() {
        let botNames = await this.page.$$eval(
            ".BotHeader_title__q67To>div",
            (containers) => {
                return containers.map(
                    (container) => container.childNodes[0].innerHTML
                );
            }
        );

        return Array.from(new Set(botNames));
    }

    // No error handling currently implemented for non-existing bots :/
    async changeBot(botName) {
        // Currently, Assistant doesn't seem to work, so this is simply a failsafe.
        if (botName === "Assistant" || botName === undefined) {
            this.botName = "ChatGPT";
        } else {
            this.botName = botName;
        }
        await this.page.goto(`https://poe.com/${this.botName}`);

        return true;
    }
}

module.exports = PoeClient;
