const DEFAULT_WINDOWS_PATH =
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const DEFAULT_OSX_PATH =
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const puppeteer = require("puppeteer-core");
const { PuppeteerExtra } = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const Turndown = require("turndown");
const randomUseragent = require("random-useragent");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const puppeteerWithPlugin = new PuppeteerExtra(puppeteer);

let stealthPlugin = StealthPlugin();

puppeteerWithPlugin.use(stealthPlugin);

// Shamelessly copied from PoeClient, will probably merge the two
// to avoid repeating code. But, that will have to wait for now
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
        console.log("Waiting for bot names to be loaded...");

        await this.page.waitForSelector(".css-bigq6g");

        await delay(200);

        let title = await this.page.title();
        console.log(`DEBUG: Current page title: ${title}`);

        console.log("Waiting for modal to load...");
        await this.page.waitForSelector(".css-7nxun1");

        await this.page.evaluate(() => {
            try {
                document.querySelector(".css-7nxun1").click();
            } catch {}
        });

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
            ".flowgpt-markdown",
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

            if (page.$("textarea.chakra-textarea") === null) {
                throw new Error("Input element not found! Aborting.");
            }

            await delay(300);

            await page.evaluate((message) => {
                let tarea = document.querySelectorAll(
                    "textarea.chakra-textarea"
                )[1];
                tarea.click();
                tarea.focus();
                while (tarea.value === "") {
                    tarea.value = message;
                }
            }, message);

            let inputForm = (await page.$$("textarea.chakra-textarea"))[1];

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

            await this.page.evaluate(() => {
                document
                    .querySelector(
                        "#chat-container > div > div.gap-2 > div > div > div > div:nth-child(3) > div > div:nth-child(2)"
                    )
                    .click();
            });

            console.log(
                "Triggered edit prompt! Replacing message and confirming edit..."
            );

            await delay(100);

            // Copied from a function above for convenience, will modify once it moves from PoC state
            await this.page.evaluate((message) => {
                let tarea = document.querySelector("textarea.block");
                tarea.click();
                tarea.focus();
                tarea.value = message;
                while (tarea.value === "") {
                    tarea.value = message;
                }
            }, message);

            let inputElement = await this.page.$("textarea.block");

            await delay(100);

            await inputElement.press("Space");

            await delay(5);
            await inputElement.press("Backspace");

            await delay(20);

            let confirmButton = await this.page.$(
                "div.flex.gap-2.absolute>svg:nth-child(2)"
            );

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

    async regenerateMessage() {
        try {
            console.log(`DEBUG: Attempting to regenerate last message...`);

            await this.page.evaluate(() => {
                document
                    .querySelectorAll(
                        "#chat-container>div>div:last-child>div>div>div>div>div>div>div>div"
                    )[1]
                    .click();
            });

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

        await this.page.evaluate(() => {
            let container = document.querySelector(
                "div.relative.justify-center.text-xs"
            );
            if (container.childElementCount !== 0) {
                container.childNodes[0].click();
            }
        });

        return true;
    }

    async newChat() {
        await this.page.evaluate(() => {
            document
                .querySelector(
                    ".gap-3>.flex.items-center.justify-center.rounded-lg"
                )
                .click();
        });
    }

    async isGenerating() {
        let isGenerating = await this.page.evaluate(() => {
            let elem = document.querySelector(
                "div.relative.justify-center.text-xs"
            );
            if (
                elem.childElementCount === 0 ||
                elem.childElementCount === undefined
            )
                return false;
            return true;
        });

        return isGenerating;
    }

    async getBotNames(page = this.page) {
        let botNames = await page.$$eval(".css-bigq6g", (containers) => {
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

        await this.page.evaluate((botName) => {
            let allBotNameElements = [
                ...document.querySelectorAll(".css-bigq6g"),
            ];

            let filteredBotNames = allBotNameElements.filter(
                (_) => _.textContent === botName
            );

            filteredBotNames[0].click();
        }, this.botName);

        await this.newChat();

        return true;
    }
}

module.exports = FlowGPTClient;
